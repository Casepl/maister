// P0-2 — four racers on one command, and the shutdown disjunction.
//
// Activation puts a durable applier beside every live waiter, so single-winner
// stops being a property of "only one thing ever tries". These cases run the
// PRODUCTION web (`server.ts` over a fresh `next build`) against a real
// supervisor and real Postgres, and each one names the serializer it is
// exercising rather than asserting a count that a lucky schedule could satisfy.
//
//   D1 live waiter + worker, one command      -> exactly one application
//   D2 two production web instances, one DB   -> exactly one application
//   D3 reconcile reattach + flow worker       -> exactly one driver  (Scope 6)
//   D4 queued-recover promotion + worker      -> exactly one driver  (Scope 6)
//   E  SIGTERM while a claim is HELD          -> released in the drain, or
//                                                shutdown fails loudly and the
//                                                claim expires by its lease
//
// D1, D2 and E turn green with the boot wiring. D3 and D4 are written with the
// crash-recover arm they exercise (Phase 4), RED-first inside that phase — a
// racer against a predicate that does not exist yet can only fail for the
// wrong reason.
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { and, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { readLaunchResult } from "@/e2e/_seed/launch-stream";
import * as schema from "@/lib/db/schema";
import {
  startMainAndBrainPostgresTestDb,
  type StartedPostgresTestDb,
} from "@/test-support/pg-container";
import {
  startRealSupervisor,
  type RealSupervisor,
} from "@/test-support/real-supervisor";
import {
  buildProductionWeb,
  signInWithCredentials,
  startRealWeb,
  type RealWeb,
} from "@/test-support/real-web";
import {
  fixturePrompt,
  seedAdmin,
  seedPlatformRunner,
  seedProjectRepo,
  WORKER_ADMIN,
  type SeededProject,
  type FixturePromptSpec,
} from "@/test-support/durable-workers-seed";
import {
  awaitOwnedPrompt,
  poll,
  promptCommandsForRun,
  promptIdsForKind,
  type PromptCommandRow,
} from "@/test-support/durable-workers-ledger";
import { mkdtempReal } from "@/test-support/worktree-test-root";
import {
  createTerminalBarrier,
  type TerminalBarrier,
} from "@/test-support/durable-workers-terminal";
import {
  startSupervisorFaultProxy,
  type FaultBarrier,
} from "@/test-support/supervisor-fault-proxy";

const EVIDENCE_BUDGET_MS = 180_000;
// Retain paged real output; the held manifest response owns the claim window.
const HELD_CLAIM_BYTES = 2_000_000;
const EVIDENCE_DIR = process.env.MAISTER_TEST_EVIDENCE_DIR;

let testDatabase: StartedPostgresTestDb;
let base = "";
let webRoot = "";
let secondaryRoot = "";
let worktreesRoot = "";
let packagesRoot = "";
let supervisor: RealSupervisor;
let web: RealWeb;
let project: SeededProject;
let cookie = "";
let logs = "";
let adapterLog = "";

function apiFor(target: RealWeb) {
  return async (pathname: string, init: RequestInit = {}): Promise<Response> =>
    fetch(`${target.url}${pathname}`, {
      ...init,
      headers: { ...(init.headers ?? {}), cookie },
    });
}

/**
 * Starts a scratch turn WITHOUT awaiting its launch stream and resolves as soon
 * as the owned prompt is admitted. Awaiting the stream would hand back a turn
 * that may already have been applied by its live waiter, which turns every
 * "exactly one application" assertion below into a race that never ran — that
 * is how D2 passed against a build with no durable owner at all.
 */
async function launchScratchToAdmission(
  target: RealWeb,
  spec: FixturePromptSpec,
): Promise<{
  runId: string;
  commandId: string;
  command: PromptCommandRow;
  launched: Promise<unknown>;
}> {
  const before = await promptIdsForKind(testDatabase.db, "scratch_message");
  const form = new FormData();

  form.append(
    "payload",
    JSON.stringify({
      projectId: project.projectId,
      baseBranch: "main",
      name: `race ${randomUUID().slice(0, 8)}`,
      prompt: fixturePrompt({ ...spec, text: "\nraced\n" }),
      reasoningEffort: "high",
      attachments: [],
    }),
  );
  const launched = apiFor(target)("/api/scratch-runs", {
    method: "POST",
    body: form,
  })
    .then(async (res) => {
      if (res.status !== 200)
        throw new Error(
          `scratch launch answered ${res.status}: ${await res.text()}`,
        );

      return readLaunchResult(res);
    })
    // The web under this launch is about to be signalled; a rejected stream is
    // expected and must not surface as an unhandled rejection.
    .catch(() => undefined);
  const accepted = await awaitOwnedPrompt(
    testDatabase.db,
    "scratch_message",
    before,
  );

  return {
    runId: accepted.runId,
    commandId: accepted.id,
    command: accepted,
    launched,
  };
}

async function appliedPromptCount(runId: string): Promise<number> {
  const rows = await testDatabase.db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.executionCommands)
    .where(
      and(
        eq(schema.executionCommands.runId, runId),
        eq(schema.executionCommands.kind, "session.prompt"),
        eq(schema.executionCommands.applicationState, "applied"),
        isNotNull(schema.executionCommands.completionAppliedAt),
      ),
    );

  return rows[0]?.count ?? 0;
}

async function promptCount(runId: string): Promise<number> {
  const rows = await testDatabase.db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.executionCommands)
    .where(
      and(
        eq(schema.executionCommands.runId, runId),
        eq(schema.executionCommands.kind, "session.prompt"),
      ),
    );

  return rows[0]?.count ?? 0;
}

async function startedWorkerCount(target: RealWeb): Promise<number> {
  const tail = await target.logTail(4 * 1024 * 1024);

  return tail.split("prompt-owner-worker-started").length - 1;
}

describe("P0-2 durable worker concurrency and shutdown", () => {
  beforeAll(async () => {
    testDatabase = await startMainAndBrainPostgresTestDb({
      databaseName: "durable_workers_concurrency",
    });
    base = await mkdtempReal("durable-workers-conc-");
    webRoot = path.join(base, "web");
    secondaryRoot = path.join(base, "web-2");
    worktreesRoot = path.join(base, "worktrees");
    packagesRoot = path.join(base, "packages");
    await Promise.all(
      [webRoot, secondaryRoot, worktreesRoot, packagesRoot].map((dir) =>
        mkdir(dir, { recursive: true }),
      ),
    );
    logs = EVIDENCE_DIR ?? base;
    await mkdir(logs, { recursive: true });
    adapterLog = path.join(logs, "adapter-invocations-conc.ndjson");
    supervisor = await startRealSupervisor({
      runtimeRoot: path.join(base, "supervisor"),
      workspaceRoots: [worktreesRoot, base],
      fixtureArgs: [
        "--hang",
        "--supports-resume",
        "--controlled-terminal",
        "--invocation-log",
        adapterLog,
      ],
      ...(EVIDENCE_DIR
        ? { logFile: path.join(EVIDENCE_DIR, "supervisor-conc.log") }
        : {}),
    });
    await seedAdmin(testDatabase.db);
    await seedPlatformRunner(testDatabase.db);
    project = await seedProjectRepo(testDatabase.db, base);
    await buildProductionWeb(path.join(logs, "next-build-conc.log"));
    web = await startRealWeb({
      databaseUrl: testDatabase.container.getConnectionUri(),
      supervisorUrl: supervisor.url,
      runtimeRoot: webRoot,
      worktreesRoot,
      logFile: path.join(logs, "web-conc.log"),
    });
    cookie = await signInWithCredentials(web.url, WORKER_ADMIN);
  }, 900_000);

  afterAll(async () => {
    await web?.kill();
    await supervisor?.kill();
    await testDatabase?.stop();
    if (base) await rm(base, { recursive: true, force: true });
  }, 180_000);

  it("D1: a live waiter and the durable worker on one command apply it exactly once", async () => {
    // Without a worker there is no race to serialize, so this assertion is the
    // precondition of the whole case rather than decoration.
    expect(
      await startedWorkerCount(web),
      "no durable owner runs in this boot, so the live-waiter/worker race is unreachable",
    ).toBeGreaterThanOrEqual(1);

    const { runId } = await launchScratchToAdmission(web, {
      terminalDelayMs: 2_000,
    });

    await poll(
      async () => ((await appliedPromptCount(runId)) === 1 ? true : null),
      EVIDENCE_BUDGET_MS,
      "the single application of the raced command",
    );
    // Hold past the worker's idle wake so a second applier would have landed.
    await new Promise((r) => setTimeout(r, 5_000));
    expect(await appliedPromptCount(runId)).toBe(1);
    expect(await promptCount(runId)).toBe(1);
  }, 420_000);

  it("D2: two production web instances on one database apply a dead instance's command exactly once", async () => {
    const secondary = await startRealWeb({
      databaseUrl: testDatabase.container.getConnectionUri(),
      supervisorUrl: supervisor.url,
      runtimeRoot: secondaryRoot,
      worktreesRoot,
      logFile: path.join(logs, "web-conc-secondary.log"),
    });

    const terminalToken = randomUUID();
    const issuer = web;
    const terminal = createTerminalBarrier({
      db: testDatabase.db,
      supervisor,
      issuer,
      adapterLog,
      token: terminalToken,
      timeoutMs: EVIDENCE_BUDGET_MS,
    });
    let launched: Promise<unknown> | undefined;

    try {
      expect(await startedWorkerCount(secondary)).toBeGreaterThanOrEqual(1);
      const admission = await launchScratchToAdmission(web, {
        terminalBarrier: terminalToken,
      });
      const { runId, commandId, command } = admission;

      launched = admission.launched;
      await terminal.waitForHeld(command);
      const [admitted] = (
        await promptCommandsForRun(testDatabase.db, runId)
      ).filter((row) => row.id === commandId);

      expect(
        admitted?.completionAppliedAt,
        "the terminal must remain held until after web death",
      ).toBeNull();
      // The issuing instance dies with its live waiter; the surviving
      // instance's worker is the only applier left, and both would claim if
      // the ledger did not serialize them.
      await issuer.kill("SIGKILL");
      await launched;
      await terminal.releaseAfterWebDeath();
      await poll(
        async () => ((await appliedPromptCount(runId)) === 1 ? true : null),
        EVIDENCE_BUDGET_MS,
        "the surviving instance to apply the dead instance's command exactly once",
      );
      web = await issuer.restart();
      cookie = await signInWithCredentials(web.url, WORKER_ADMIN);
      await new Promise((r) => setTimeout(r, 5_000));
      expect(await appliedPromptCount(runId)).toBe(1);
      expect(await promptCount(runId)).toBe(1);
    } finally {
      try {
        try {
          await terminal.close();
        } finally {
          await issuer.kill("SIGKILL");
          await launched;
          if (web === issuer) {
            web = await issuer.restart();
            cookie = await signInWithCredentials(web.url, WORKER_ADMIN);
          }
        }
      } finally {
        await secondary.kill();
      }
    }
  }, 600_000);

  it("E: SIGTERM while a claim is held either releases it in the drain or fails shutdown loudly", async () => {
    const proxy = await startSupervisorFaultProxy(supervisor.url);
    const failures: unknown[] = [];
    let terminal: TerminalBarrier | undefined;
    let manifest: FaultBarrier | undefined;
    let manifestDisposed = false;
    let launched: Promise<unknown> | undefined;
    let issuer: RealWeb | undefined;
    let issuerStopped = false;

    try {
      // This case alone routes through the real-byte proxy. Retire the previous
      // instance so another process cannot own the claim being drained.
      const previous = web;

      await previous.stop();
      web = await startRealWeb({
        ...previous.options,
        supervisorUrl: proxy.url,
        logFile: path.join(logs, "web-shutdown-claim.log"),
      });
      issuer = web;
      cookie = await signInWithCredentials(web.url, WORKER_ADMIN);
      const token = randomUUID();

      terminal = createTerminalBarrier({
        db: testDatabase.db,
        supervisor,
        issuer: web,
        adapterLog,
        token,
        timeoutMs: EVIDENCE_BUDGET_MS,
      });
      const admission = await launchScratchToAdmission(web, {
        terminalBarrier: token,
        bytes: HELD_CLAIM_BYTES,
      });
      const { runId, commandId, command } = admission;

      launched = admission.launched;
      await terminal.waitForHeld(command);
      manifest = proxy.arm(
        {
          caseId: "E",
          method: "GET",
          path: /^\/runtime-objects\/[^/]+\/content$/,
          commandId,
          responseSchema: "maister.command-output.v2",
          applicationClaimToken: async (output) => {
            if (
              output.commandId !== commandId ||
              output.runId !== runId ||
              !output.hostSessionId ||
              !output.requestSha256
            )
              throw new Error(
                "E manifest does not identify its exact admitted prompt",
              );
            const [claimed] = await testDatabase.db
              .select({ token: schema.executionCommands.applicationClaimOwner })
              .from(schema.executionCommands)
              .where(
                and(
                  eq(schema.executionCommands.id, commandId),
                  eq(schema.executionCommands.runId, runId),
                  eq(schema.executionCommands.kind, "session.prompt"),
                  eq(
                    schema.executionCommands.targetSessionId,
                    output.hostSessionId,
                  ),
                  eq(
                    schema.executionCommands.requestSha256,
                    output.requestSha256,
                  ),
                  eq(schema.executionCommands.applicationState, "applying"),
                  isNull(schema.executionCommands.completionAppliedAt),
                  isNotNull(schema.executionCommands.applicationClaimOwner),
                  gt(
                    schema.executionCommands.applicationClaimExpiresAt,
                    sql`clock_timestamp()`,
                  ),
                ),
              );

            return claimed?.token ?? null;
          },
        },
        "hold-responses",
      );
      await terminal.releaseForApplication();
      const output = await manifest.awaitReached(120_000);

      expect(output.commandId).toBe(commandId);
      expect(output.runId).toBe(runId);
      // Reconciliation reads this manifest before claiming too. Those responses
      // pass unchanged; only the exact live application token opens this hold.
      const held = await poll(
        async () => {
          const [row] = await testDatabase.db
            .select({
              id: schema.executionCommands.id,
              owner: schema.executionCommands.applicationClaimOwner,
              expires: schema.executionCommands.applicationClaimExpiresAt,
              hostSessionId: schema.executionCommands.targetSessionId,
              requestSha256: schema.executionCommands.requestSha256,
            })
            .from(schema.executionCommands)
            .where(
              and(
                eq(schema.executionCommands.id, commandId),
                eq(schema.executionCommands.runId, runId),
                eq(schema.executionCommands.kind, "session.prompt"),
                eq(schema.executionCommands.applicationState, "applying"),
                isNotNull(schema.executionCommands.applicationClaimOwner),
              ),
            );

          return row ?? null;
        },
        120_000,
        "an application claim to be observably held",
        10,
      );

      expect(held.owner).not.toBeNull();
      expect(held.owner).toBe(output.claimToken);
      expect(held.expires).not.toBeNull();
      expect(output.hostSessionId).toBe(held.hostSessionId);
      expect(output.requestSha256).toBe(held.requestSha256);
      const shutdownStart = Date.now();

      await web.stop();
      issuerStopped = true;
      const drainMs = Date.now() - shutdownStart;
      const outcome = await web.outcome;
      const tail = await web.logTail(4 * 1024 * 1024);
      const failedLoudly =
        outcome.kind === "observed" &&
        outcome.code !== null &&
        outcome.code !== 0 &&
        outcome.signal === null &&
        (tail.includes("web-shutdown-failed") ||
          tail.includes("web-shutdown-deadline"));
      const drained =
        outcome.kind === "observed" &&
        outcome.code === 0 &&
        outcome.signal === null &&
        tail.includes("web-shutdown-done");
      const [after] = await testDatabase.db
        .select({
          applicationState: schema.executionCommands.applicationState,
          owner: schema.executionCommands.applicationClaimOwner,
        })
        .from(schema.executionCommands)
        .where(eq(schema.executionCommands.id, held.id));

      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          case: "E",
          branch: failedLoudly
            ? "shutdown-failed-loudly"
            : drained
              ? "released-in-drain"
              : "shutdown-outcome-unconfirmed",
          runId,
          commandId,
          claimToken: held.owner,
          claimExpiresAt: held.expires,
          manifest: output,
          drainMs,
          outcome,
          applicationState: after?.applicationState,
          applicationClaimOwner: after?.owner,
        }),
      );
      expect(
        drained || failedLoudly,
        `shutdown must have a verified clean or explicit failed outcome: ${JSON.stringify(outcome)}`,
      ).toBe(true);
      if (failedLoudly) {
        // An unconfirmed release retains exactly this durable claim, never a
        // different process's token, until normal lease-based recovery.
        expect(after?.owner).toBe(held.owner);
      } else {
        expect(
          ["pending", "applied"],
          `a drained shutdown must leave no claim mid-flight (state ${after?.applicationState})`,
        ).toContain(after?.applicationState);
        expect(after?.owner).toBeNull();
      }
      manifest.ownedProcessKilled();
      manifestDisposed = true;
      await launched;
      web = await web.restart();
      cookie = await signInWithCredentials(web.url, WORKER_ADMIN);
      await poll(
        async () => ((await appliedPromptCount(runId)) === 1 ? true : null),
        EVIDENCE_BUDGET_MS,
        "exactly one application after the restart",
      );
      expect(await promptCount(runId)).toBe(1);
    } catch (error) {
      failures.push(error);
    } finally {
      // A failed witness must still retire the live HTTP waiter before the
      // proxy closes; every cleanup stage runs and keeps the original failure.
      const cleanup: Array<() => Promise<void>> = [
        () => web.kill("SIGKILL"),
        async () => {
          if (issuer) {
            await issuer.kill("SIGKILL");
            issuerStopped = true;
          }
        },
        async () => terminal?.close(),
        async () => {
          await launched;
        },
        async () => {
          if (
            manifest &&
            !manifestDisposed &&
            manifest.observations.length &&
            issuerStopped
          ) {
            manifest.ownedProcessKilled();
            manifestDisposed = true;
          }
        },
        () => proxy.close(),
      ];

      for (const close of cleanup) {
        try {
          await close();
        } catch (error) {
          failures.push(error);
        }
      }
    }
    if (failures.length === 1) throw failures[0];
    if (failures.length > 1)
      throw new AggregateError(
        failures,
        "E shutdown control and cleanup failed",
      );
  }, 600_000);
});
