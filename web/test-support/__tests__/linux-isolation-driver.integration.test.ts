import type { LinuxIsolationPolicy } from "@/test-support/linux-isolation";
import type { LinuxApplicationOutcome } from "@/test-support/linux-isolation-protocol";
import type {
  Invocation,
  ProcessIdentity,
} from "@/test-support/process-invocation";
import type { RealWeb } from "@/test-support/real-web";

import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, openSync, realpathSync, statSync } from "node:fs";
import {
  access,
  link,
  mkdtemp,
  mkdir,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { constants } from "node:os";
import { createConnection, createServer, type Socket } from "node:net";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { setImmediate } from "node:timers/promises";

import { getContainerRuntimeClient } from "testcontainers";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

import * as postgresFixtures from "@/test-support/pg-container";
import * as webPolicies from "@/test-support/linux-web-policy";
import * as webFixtures from "@/test-support/real-web";
import * as supervisorFixtures from "@/test-support/real-supervisor";
import * as processFixtures from "@/test-support/process-invocation";
import {
  linuxOuterEnvironment,
  linuxRuntimePaths,
  IsolationPolicyError,
  prepareLinuxIsolationPolicy,
} from "@/test-support/linux-isolation";
import {
  assertInvocationGroupEmpty,
  createInvocation,
  fixtureProcessEnvironment,
  findProcessIdentity,
  FIXTURE_WATCHDOG,
  InvocationOwnershipError,
  logInvocation,
  invocationFromEnvironment,
  invocationRecords,
  readProcessSnapshot,
  processIdentity,
  sameProcess,
  registerRoot,
  registerSpawnedProcess,
  releaseInvocation,
  signalInvocationGroup,
  signalInvocationProcess,
} from "@/test-support/process-invocation";
import {
  observeLinuxApplication,
  resolveIsolationDriver,
  IsolationUnavailableError,
  waitForLinuxApplication,
} from "@/test-support/process-isolation";
import { assertNoLinuxDockerTcpAuthority } from "@/test-support/linux-network-authority";
import { serializeLinuxIsolationPolicy } from "@/test-support/linux-isolation-protocol";
import {
  startLinuxLifecycleFixture,
  type LinuxLifecycleFixture,
} from "@/test-support/linux-lifecycle-fixture";
import {
  createLinuxControlPolicy,
  linuxControlTree,
  linuxNamespacePid,
  resistantDescendantPreload,
  startLinuxControlProcess,
} from "@/test-support/linux-lifecycle-controls";

let restartFixture: LinuxLifecycleFixture;
let stopRestartFixture: (() => Promise<void>) | undefined;
const restartLaunches: number[] = [];

type HeldAcquisition = <T>(operation: Promise<T>) => Promise<T>;
type CancellationObservation = Readonly<{
  control: string;
  joined: boolean;
  rejected: boolean;
  launchesAfterCancellation: number;
  originalErrorPreserved: boolean;
  cleanupPassed: boolean;
  live: number;
  rootsRemaining: number;
}>;
const cancellationObservations: CancellationObservation[] = [];
let activeBuildRegistered = false;
let buildFailureObserved = false;

async function observeCleanupJoin(
  control: string,
  close: () => Promise<void>,
): Promise<Readonly<{ joined: boolean; completion: Promise<boolean> }>> {
  const entered = Promise.withResolvers<void>();
  const writeLog = processFixtures.logInvocation;
  let acquisitionEntered = false;
  let progressedPastJoin = false;
  let completed = false;
  const logging = vi
    .spyOn(processFixtures, "logInvocation")
    .mockImplementation((invocation, event, fields) => {
      writeLog(invocation, event, fields);
      if (event !== "linux-lifecycle-cleanup-stage") return;
      if (fields.stage === "acquisition") {
        acquisitionEntered = true;
        entered.resolve();
      } else if (acquisitionEntered) progressedPastJoin = true;
    });
  const completion = close().then(
    () => {
      completed = true;

      return true;
    },
    (error: unknown) => {
      completed = true;
      writeLog(
        invocationFromEnvironment()!,
        "linux-cancellation-cleanup-failed",
        {
          control,
          error: error instanceof Error ? error.message : String(error),
        },
      );

      return false;
    },
  );

  try {
    await Promise.race([entered.promise, completion]);
    await setImmediate();

    return {
      joined: acquisitionEntered && !completed && !progressedPastJoin,
      completion,
    };
  } finally {
    logging.mockRestore();
  }
}

async function observeCancelledHandoff(
  control: string,
  installBarrier: (hold: HeldAcquisition) => () => void,
): Promise<CancellationObservation> {
  const invocation = invocationFromEnvironment()!;
  const before = await readProcessSnapshot(invocation);
  const rootsBefore = new Set(
    (await invocationRecords(invocation))
      .filter((record) => record.kind === "root")
      .map((record) => record.root),
  );
  const reached = Promise.withResolvers<void>();
  const handoff = Promise.withResolvers<void>();
  let originalFailure: unknown;
  const hold: HeldAcquisition = async <T>(
    operation: Promise<T>,
  ): Promise<T> => {
    const result = await operation.then(
      (value) => ({ kind: "value" as const, value }),
      (error: unknown) => ({ kind: "error" as const, error }),
    );

    if (result.kind === "error") originalFailure = result.error;
    reached.resolve();
    await handoff.promise;
    if (result.kind === "error") throw result.error;

    return result.value;
  };
  const restore = installBarrier(hold);
  const driver = resolveIsolationDriver();
  let cancelled = false;
  let launchesAfterCancellation = 0;
  let close: (() => Promise<void>) | undefined;
  let closing: Promise<boolean> | undefined;
  const startup = startLinuxLifecycleFixture(
    {
      ...driver,
      wrap: (...args: Parameters<typeof driver.wrap>) => {
        if (cancelled) launchesAfterCancellation += 1;

        return driver.wrap(...args);
      },
    },
    (release) => {
      close = release;
    },
  ).then(
    (fixture) => ({ kind: "ready" as const, fixture }),
    (error: unknown) => ({ kind: "failed" as const, error }),
  );

  try {
    await Promise.race([
      reached.promise,
      startup.then((result): never => {
        throw new Error(`${control} acquisition barrier was not reached`, {
          cause: result,
        });
      }),
    ]);
    if (!close)
      throw new Error(`${control} has no registered cleanup at its barrier`);
    cancelled = true;
    const cleanup = await observeCleanupJoin(control, close);
    const joined = cleanup.joined;

    closing = cleanup.completion;
    handoff.resolve();
    const cleanupPassed = await closing;
    const result = await startup;
    const live = (await readProcessSnapshot(invocation)).filter(
      (identity) =>
        identity.owned &&
        !identity.zombie &&
        !before.some((previous) => sameProcess(previous, identity)),
    );
    const roots = (await invocationRecords(invocation)).filter(
      (record) => record.kind === "root" && !rootsBefore.has(record.root),
    );
    let rootsRemaining = 0;

    for (const record of roots) {
      if (record.kind !== "root") continue;
      try {
        await access(record.root);
        rootsRemaining += 1;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    const observation: CancellationObservation = {
      control,
      joined,
      rejected: result.kind === "failed",
      launchesAfterCancellation,
      originalErrorPreserved:
        originalFailure === undefined ||
        (result.kind === "failed" && result.error === originalFailure),
      cleanupPassed,
      live: live.length,
      rootsRemaining,
    };

    logInvocation(invocation, "linux-refusal-control", observation);

    return observation;
  } finally {
    handoff.resolve();
    const result = await startup;

    restore();
    if (!closing) {
      if (result.kind === "ready") await result.fixture.close();
      else if (close) await close();
    }
  }
}

async function assertDatabaseAcquisitionCancellation(): Promise<void> {
  const driver = resolveIsolationDriver();
  const acquireDatabase = postgresFixtures.startMainAndBrainPostgresTestDb;
  const supervisorStarts = vi.spyOn(supervisorFixtures, "startRealSupervisor");
  const buildStarts = vi.spyOn(webFixtures, "buildProductionWeb");
  const reached =
    Promise.withResolvers<postgresFixtures.StartedPostgresTestDb>();
  const handoff = Promise.withResolvers<void>();
  let close: (() => Promise<void>) | undefined;
  let registeredBeforeAcquisition = false;
  let launches = 0;
  const acquisition = vi
    .spyOn(postgresFixtures, "startMainAndBrainPostgresTestDb")
    .mockImplementationOnce(async (options) => {
      registeredBeforeAcquisition = close !== undefined;
      const database = await acquireDatabase(options);

      reached.resolve(database);
      await handoff.promise;

      return database;
    });
  const startup = startLinuxLifecycleFixture(
    {
      ...driver,
      wrap: (...args: Parameters<typeof driver.wrap>) => {
        launches += 1;

        return driver.wrap(...args);
      },
    },
    (release) => {
      close = release;
    },
  ).then(
    (fixture) => ({ kind: "ready" as const, fixture }),
    (error: unknown) => ({ kind: "failed" as const, error }),
  );

  try {
    const database = await Promise.race([
      reached.promise,
      startup.then((result): never => {
        throw new Error("database cancellation barrier was not reached", {
          cause: result,
        });
      }),
    ]);

    expect(
      registeredBeforeAcquisition,
      "LI-refusal/database: cleanup must be registered before acquisition",
    ).toBe(true);
    expect(close).toBeTypeOf("function");
    const cleanup = await observeCleanupJoin(
      "LI-refusal/database-cancellation",
      close!,
    );

    handoff.resolve();
    expect(
      cleanup.joined,
      "cleanup must join the pending database handoff",
    ).toBe(true);
    expect(await cleanup.completion, "database cleanup must succeed").toBe(
      true,
    );
    const result = await startup;

    expect(result.kind).toBe("failed");
    expect(
      supervisorStarts,
      "database cancellation must prevent supervisor admission",
    ).not.toHaveBeenCalled();
    expect(
      buildStarts,
      "database cancellation must prevent build admission",
    ).not.toHaveBeenCalled();
    expect(launches, "cancellation must prevent a later web launch").toBe(0);
    const runtime = await getContainerRuntimeClient();

    await expect(
      runtime.container.dockerode
        .getContainer(database.container.getId())
        .inspect(),
    ).rejects.toMatchObject({ statusCode: 404 });
    logInvocation(invocationFromEnvironment()!, "linux-refusal-control", {
      control: "LI-refusal/database-cancellation",
      registeredBeforeAcquisition,
      joined: cleanup.joined,
      supervisorStarts: supervisorStarts.mock.calls.length,
      buildStarts: buildStarts.mock.calls.length,
      launches,
      databaseRemoved: true,
    });
  } finally {
    handoff.resolve();
    const result = await startup;

    acquisition.mockRestore();
    supervisorStarts.mockRestore();
    buildStarts.mockRestore();
    if (result.kind === "ready") await result.fixture.close();
    else if (close) await close();
  }
}

beforeAll(async () => {
  const driver = resolveIsolationDriver();
  const buildWeb = webFixtures.buildProductionWeb;
  const registerProcess = processFixtures.registerProcess;

  cancellationObservations.push(
    await observeCancelledHandoff("LI-refusal/build-cancellation", (hold) => {
      const registration = vi
        .spyOn(processFixtures, "registerProcess")
        .mockImplementation((...args: Parameters<typeof registerProcess>) => {
          const registered = registerProcess(...args);

          if (args[1].role !== "build") return registered;

          return hold(
            registered.then((record) => {
              activeBuildRegistered = true;

              return record;
            }),
          );
        });
      const build = vi
        .spyOn(webFixtures, "buildProductionWeb")
        .mockImplementationOnce((logFile) =>
          hold(buildWeb(logFile)).catch((error: unknown) => {
            buildFailureObserved = true;
            throw error;
          }),
        );

      return () => {
        registration.mockRestore();
        build.mockRestore();
      };
    }),
  );
  logInvocation(invocationFromEnvironment()!, "linux-build-cancellation", {
    activeBuildRegistered,
    buildFailureObserved,
  });

  restartFixture = await startLinuxLifecycleFixture(
    {
      ...driver,
      wrap: (...args: Parameters<typeof driver.wrap>) => {
        restartLaunches.push(restartLaunches.length + 1);

        return driver.wrap(...args);
      },
    },
    (close) => {
      stopRestartFixture = close;
    },
  );
  const preparePolicy = webPolicies.prepareLinuxWebPolicy;
  const request = globalThis.fetch;

  cancellationObservations.push(
    await observeCancelledHandoff(
      "LI-refusal/build-handoff-cancellation",
      (hold) => {
        const barrier = vi
          .spyOn(webFixtures, "buildProductionWeb")
          .mockImplementationOnce((logFile) => hold(buildWeb(logFile)));

        return () => barrier.mockRestore();
      },
    ),
    await observeCancelledHandoff("LI-refusal/policy-cancellation", (hold) => {
      const barrier = vi
        .spyOn(webPolicies, "prepareLinuxWebPolicy")
        .mockImplementationOnce((input) => hold(preparePolicy(input)));

      return () => barrier.mockRestore();
    }),
    await observeCancelledHandoff(
      "LI-refusal/web-readiness-cancellation",
      (hold) => {
        let held = false;
        const barrier = vi
          .spyOn(globalThis, "fetch")
          .mockImplementation((...args: Parameters<typeof fetch>) => {
            const response = request(...args);
            const [input] = args;

            if (
              !held &&
              typeof input === "string" &&
              new URL(input).pathname === "/login"
            ) {
              return response.then((result) => {
                if (result.status !== 200) return result;
                held = true;

                return hold(Promise.resolve(result));
              });
            }

            return response;
          });

        return () => barrier.mockRestore();
      },
    ),
    await observeCancelledHandoff(
      "LI-refusal/policy-error-cancellation",
      (hold) => {
        const barrier = vi
          .spyOn(webPolicies, "prepareLinuxWebPolicy")
          .mockImplementationOnce((input) =>
            hold(
              preparePolicy({
                ...input,
                writableRoots: [...input.writableRoots, input.deniedRoots[0]],
              }),
            ),
          );

        return () => barrier.mockRestore();
      },
    ),
  );
}, 600_000);

afterAll(async () => {
  await stopRestartFixture?.();
}, 120_000);

async function assertInvalidRestartRefusal(): Promise<void> {
  const { web, webRoot, sentinel } = restartFixture;
  const initialAttempts = restartLaunches.length;
  const before = await fetch(`${web.url}/login`);

  expect(before.status).toBe(200);
  await expect(web.restart({ isolation: undefined })).rejects.toThrow(
    IsolationPolicyError,
  );
  await expect(
    web.restart({ runtimeRoot: path.dirname(sentinel) }),
  ).rejects.toThrow(IsolationPolicyError);
  expect(restartLaunches.length).toBe(initialAttempts);
  expect((await fetch(`${web.url}/login`)).status).toBe(200);
  const heldRoot = `${webRoot}-original`;

  await rename(webRoot, heldRoot);
  await mkdir(webRoot);
  try {
    await expect(web.restart()).rejects.toThrow(IsolationPolicyError);
    await expect(
      fetch(`${web.url}/login`, {
        signal: AbortSignal.timeout(2_000),
      }),
    ).rejects.toThrow();
    const invocation = invocationFromEnvironment();

    if (!invocation) throw new Error("restart control lost its lane identity");
    logInvocation(invocation, "linux-refusal-control", {
      control: "LI-refusal/invalid-restart",
      overrideLaunches: 0,
      invalidPolicyAttempts: restartLaunches.length - initialAttempts,
      replacementLaunched: false,
    });
    expect(restartLaunches.length - initialAttempts).toBe(1);
  } finally {
    await rm(webRoot, { recursive: true });
    await rename(heldRoot, webRoot);
  }
}

async function assertNestedMountRefusal({
  invocation,
  root,
  application,
  writable,
  privateRoot,
  sentinel,
}: Readonly<{
  invocation: Parameters<typeof registerRoot>[0];
  root: string;
  application: string;
  writable: string;
  privateRoot: string;
  sentinel: string;
}>): Promise<void> {
  const runtime = linuxRuntimePaths([process.execPath]).map((file) => ({
    file,
    canonical: realpathSync(file),
  }));
  const policy = await prepareLinuxIsolationPolicy({
    invocation,
    cwd: application,
    readOnlyPaths: [
      application,
      ...new Set(runtime.map((file) => file.canonical)),
    ],
    writableRoots: [writable],
    deniedRoots: [privateRoot],
    protectedFiles: [{ path: sentinel }],
  });
  const nested = path.join(application, "nested-mount");
  const witness = path.join(writable, "nested-mount-exec-witness");
  const compiled = path.join(root, "nested-mount-control.mjs");
  const loader = fileURLToPath(
    new URL("../../node_modules/tsx/dist/loader.mjs", import.meta.url),
  );

  await mkdir(nested);
  // Use the compiler already shipped by the declared tsx test runtime.
  execFileSync(
    createRequire(realpathSync(loader)).resolve("esbuild/bin/esbuild"),
    [
      fileURLToPath(
        new URL("../fixtures/linux-nested-mount.mjs", import.meta.url),
      ),
      "--bundle",
      "--platform=node",
      "--format=esm",
      `--outfile=${compiled}`,
    ],
    { timeout: 10_000, maxBuffer: 16_384 },
  );
  const args = [
    "--unshare-user",
    "--unshare-pid",
    "--die-with-parent",
    "--cap-drop",
    "ALL",
    "--proc",
    "/proc",
    "--dev",
    "/dev",
    "--bind",
    root,
    root,
    // This trusted pre-exec validator needs ledger identity; the application
    // driver never exports this directory into its namespace.
    "--ro-bind",
    invocation.directory,
    invocation.directory,
    ...policy.mounts
      .filter((mount) => !mount.source.startsWith(`${root}/`))
      .flatMap((mount) => ["--ro-bind", mount.source, mount.destination]),
    ...runtime
      .filter((file) => file.file !== file.canonical)
      .flatMap((file) => [
        "--dir",
        path.dirname(file.file),
        "--symlink",
        file.canonical,
        file.file,
      ]),
    "--tmpfs",
    nested,
    "--chdir",
    application,
    "--",
    process.execPath,
    compiled,
    serializeLinuxIsolationPolicy(policy),
    nested,
    witness,
  ];
  const child = spawn("/usr/bin/bwrap", args, {
    env: { ...process.env, ...(await fixtureProcessEnvironment(invocation)) },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let diagnostics = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const closed = new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve) =>
    child.once("close", (code, signal) => resolve({ code, signal })),
  );

  child.stdout!.on("data", (chunk: Buffer) => {
    output = `${output}${chunk.toString()}`.slice(-16_384);
  });
  child.stderr!.on("data", (chunk: Buffer) => {
    diagnostics = `${diagnostics}${chunk.toString()}`.slice(-16_384);
  });
  try {
    await registerSpawnedProcess(
      invocation,
      {
        role: "fixture",
        caseName: "LI-refusal",
        rootRole: "nested-mount",
        root,
        bootId: "nested-mount",
        logFile: null,
      },
      child,
    );
    const result = await Promise.race([
      closed,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error("nested-mount control exceeded its 10000ms deadline"),
            ),
          10_000,
        );
      }),
    ]);

    expect(result, diagnostics).toEqual({ code: 0, signal: null });
    const observation: { nested: boolean; refused: boolean } =
      JSON.parse(output);
    const execution = await readFile(witness, "utf8").catch(
      (error: unknown) => {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      },
    );

    logInvocation(invocation, "linux-refusal-control", {
      control: "LI-refusal/nested-mount",
      ...observation,
      execWitness: execution !== null,
    });
    expect(observation, diagnostics).toEqual({
      nested: true,
      refused: true,
    });
    expect(execution).toBeNull();
  } finally {
    if (timer) clearTimeout(timer);
    if (child.pid && child.exitCode === null && child.signalCode === null)
      await signalInvocationGroup(invocation, child.pid, "SIGKILL");
    await closed;
    if (child.pid) await assertInvocationGroupEmpty(invocation, child.pid);
  }
}

async function assertRealDockerTcpRefusal(): Promise<void> {
  const runtime = await getContainerRuntimeClient();
  const socketPath: unknown = Reflect.get(
    runtime.container.dockerode.modem,
    "socketPath",
  );

  if (typeof socketPath !== "string" || !path.isAbsolute(socketPath))
    throw new Error(
      "Linux refusal control requires the documented local Unix Docker daemon",
    );
  const connections = new Set<Socket>();
  const server = createServer((client) => {
    const daemon = createConnection(socketPath);

    connections.add(client);
    connections.add(daemon);
    client.once("close", () => {
      connections.delete(client);
      daemon.destroy();
    });
    daemon.once("close", () => {
      connections.delete(daemon);
      client.destroy();
    });
    client.once("error", () => daemon.destroy());
    daemon.once("error", () => client.destroy());
    client.pipe(daemon).pipe(client);
  });
  const failures: unknown[] = [];

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();

    if (!address || typeof address === "string")
      throw new Error(
        "Docker authority control did not acquire its own listener",
      );
    const response = await fetch(`http://127.0.0.1:${address.port}/version`, {
      signal: AbortSignal.timeout(5_000),
    });
    const version: { ApiVersion: string } = await response.json();

    expect(response.status).toBe(200);
    expect(typeof version.ApiVersion).toBe("string");
    await expect(assertNoLinuxDockerTcpAuthority()).rejects.toThrow(
      /unauthenticated Docker TCP authority/u,
    );
  } catch (error) {
    failures.push(error);
  } finally {
    for (const socket of connections) socket.destroy();
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length)
    throw new AggregateError(
      failures,
      "real Docker TCP refusal and cleanup failed",
    );
  await assertNoLinuxDockerTcpAuthority();
}

it("LI-boundary: exact mounts deny private reads and escape paths while descendants retain authorized access", async () => {
  const evidence = await mkdtemp(
    path.join(tmpdir(), "maister-linux-evidence-"),
  );
  const invocation = await createInvocation(evidence);
  const root = await mkdtemp(path.join(tmpdir(), "maister-linux-boundary-"));

  await registerRoot(invocation, root, "linux-boundary");
  const privateRoot = path.join(root, "private");
  const appRoot = path.join(root, "application");
  const writableRoot = path.join(root, "web-state");

  await Promise.all(
    [privateRoot, appRoot, writableRoot].map((directory) => mkdir(directory)),
  );
  const sentinel = path.join(privateRoot, "sentinel");
  const state = path.join(privateRoot, "state.sqlite");
  const publicFile = path.join(appRoot, "public.txt");

  await writeFile(sentinel, "private-fixture-sentinel");
  await writeFile(publicFile, "public-fixture");
  await symlink(sentinel, path.join(appRoot, "private-alias"));
  const escape = path.join(appRoot, "namespace-escape");

  execFileSync(
    "cc",
    [
      "-std=c11",
      "-Wall",
      "-Wextra",
      "-Werror",
      fileURLToPath(new URL("../fixtures/namespace-escape.c", import.meta.url)),
      "-o",
      escape,
    ],
    { timeout: 10_000, maxBuffer: 16_384 },
  );
  const database = new DatabaseSync(state);

  database.exec(
    "CREATE TABLE receipts(id TEXT PRIMARY KEY); INSERT INTO receipts VALUES ('committed')",
  );
  const policy = await prepareLinuxIsolationPolicy({
    invocation,
    cwd: appRoot,
    readOnlyPaths: [
      appRoot,
      ...linuxRuntimePaths([process.execPath, escape]).filter(
        (file) => file !== escape,
      ),
    ],
    writableRoots: [writableRoot],
    deniedRoots: [privateRoot],
    protectedFiles: [{ path: sentinel }, { path: state }],
  });
  const script = `
    (async () => {
    const fs = require('node:fs');
    const { spawnSync } = require('node:child_process');
    const net = require('node:net');
    const [sentinel, state, publicFile, writableRoot, hostPid, escape] = process.argv.slice(1);
    const errno = (fn) => { try { fn(); return 'SUCCESS'; } catch(e) { return e.code; } };
    const bridgePid = Number(fs.readFileSync('/proc/self/stat','utf8').split(') ').at(-1).split(' ')[1]);
    const inspector = () => new Promise((resolve, reject) => {
      const socket = net.createConnection({host:'127.0.0.1',port:9229});
      socket.setTimeout(1000, () => { socket.destroy(); reject(new Error('inspector control timed out')); });
      socket.once('connect', () => { socket.destroy(); resolve('SUCCESS'); });
      socket.once('error', error => { socket.destroy(); resolve(error.code); });
    });
    const inspectorBefore = await inspector();
    process.kill(bridgePid, 'SIGUSR1');
    await new Promise(resolve => setTimeout(resolve, 200));
    const inspectorAfter = await inspector();
    const child = spawnSync(process.execPath, ['-e', "try{require('node:fs').readFileSync(process.argv[1]);process.exit(90)}catch(e){process.stdout.write(e.code)}", sentinel], {encoding:'utf8'});
    const status = fs.readFileSync('/proc/self/status','utf8');
    const escapeResult = spawnSync(escape, [], {encoding:'utf8'});
    if (escapeResult.error) throw escapeResult.error;
    if (escapeResult.status !== 0) throw new Error('namespace probe failed: ' + JSON.stringify({code: escapeResult.status, signal: escapeResult.signal, stderr: escapeResult.stderr}));
    const descriptorTargets = fs.readdirSync('/proc/self/fd').flatMap(fd => { try { return [fs.readlinkSync('/proc/self/fd/' + fd)]; } catch { return []; } });
    fs.writeFileSync(writableRoot + '/authorized', 'continued');
    process.stdout.write(JSON.stringify({
      sentinel: errno(() => fs.readFileSync(sentinel)),
      state: errno(() => fs.readFileSync(state)),
      readOnly: errno(() => fs.writeFileSync(publicFile,'changed')),
      publicBytes: fs.readFileSync(publicFile).length,
      childCode: child.status, childDenial: child.stdout,
      hostProc: errno(() => fs.readFileSync('/proc/' + hostPid + '/root' + sentinel)),
      symlink: errno(() => fs.readFileSync(require('node:path').dirname(publicFile) + '/private-alias')),
      traversal: errno(() => fs.readFileSync(writableRoot + '/../private/sentinel')),
      privateDescriptors: descriptorTargets.filter(target => target === sentinel || target === state),
      bridgeSocket: errno(() => fs.closeSync(fs.openSync('/proc/' + bridgePid + '/fd/1', 'w'))),
      bridgeAlive: errno(() => process.kill(bridgePid, 0)),
      inspectorBefore, inspectorAfter,
      escapeCode: escapeResult.status, escape: JSON.parse(escapeResult.stdout),
      capabilities: /^CapEff:\\s+0+$/m.test(status) && /^CapPrm:\\s+0+$/m.test(status) && /^CapAmb:\\s+0+$/m.test(status),
      noNewPrivileges: /^NoNewPrivs:\\s+1$/m.test(status),
      ambientSecret: process.env.S53A_AMBIENT_SECRET ?? null,
      ledger: process.env.MAISTER_TEST_PROCESS_LEDGER ?? null,
    }) + '\\n');
    setInterval(() => {}, 1000);
    })().catch(error => { console.error(error); process.exit(1); });
  `;
  const driver = resolveIsolationDriver();
  const wrapped = driver.wrap(
    [
      process.execPath,
      "-e",
      script,
      sentinel,
      state,
      publicFile,
      writableRoot,
      String(process.pid),
      escape,
    ],
    [privateRoot],
    policy,
  );
  const privateDescriptor = openSync(sentinel, "r");
  const child = spawn(wrapped.file, wrapped.args, {
    env: linuxOuterEnvironment(policy, {
      ...process.env,
      S53A_AMBIENT_SECRET: "must-not-export",
      ...(await fixtureProcessEnvironment(invocation)),
    }),
    cwd: appRoot,
    detached: true,
    stdio: ["ignore", "pipe", "pipe", "pipe", privateDescriptor],
  });

  closeSync(privateDescriptor);
  const exited = new Promise<void>((resolve) =>
    child.once("close", () => resolve()),
  );
  const observation = observeLinuxApplication(child);

  try {
    await registerSpawnedProcess(
      invocation,
      {
        role: "fixture",
        caseName: "LI-boundary",
        rootRole: "web",
        root: writableRoot,
        bootId: "boundary",
        logFile: null,
      },
      child,
    );
    await observation.ready;
    const output = await new Promise<string>((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(
        () => reject(new Error(`boundary child did not report: ${stderr}`)),
        20_000,
      );

      child.stderr?.on("data", (chunk: Buffer) => {
        stderr = `${stderr}${chunk.toString()}`.slice(-8192);
      });
      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
        if (stdout.length > 16_384) {
          clearTimeout(timer);
          reject(new Error("boundary report exceeded its bound"));
        }
        if (stdout.endsWith("\n")) {
          clearTimeout(timer);
          resolve(stdout);
        }
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", () => {
        clearTimeout(timer);
        reject(new Error(`boundary child exited before report: ${stderr}`));
      });
    });

    const report: { escape: { userns: number } } = JSON.parse(output);

    // Bubblewrap's zero namespace quota gives ENOSPC; an enforcing LSM may
    // deny the same syscall earlier with EPERM. Neither permits a namespace.
    expect([constants.errno.ENOSPC, constants.errno.EPERM]).toContain(
      report.escape.userns,
    );
    expect(report).toEqual({
      sentinel: "ENOENT",
      state: "ENOENT",
      readOnly: "EROFS",
      publicBytes: 14,
      childCode: 0,
      childDenial: "ENOENT",
      hostProc: "ENOENT",
      symlink: "ENOENT",
      traversal: "ENOENT",
      privateDescriptors: [],
      bridgeSocket: "ENXIO",
      bridgeAlive: "SUCCESS",
      inspectorBefore: "ECONNREFUSED",
      inspectorAfter: "ECONNREFUSED",
      escapeCode: 0,
      escape: {
        userns: report.escape.userns,
        remount: constants.errno.EPERM,
        reentry: constants.errno.EPERM,
        bridgeDescriptor: constants.errno.EPERM,
        bridgePtrace: constants.errno.EPERM,
      },
      capabilities: true,
      noNewPrivileges: true,
      ambientSecret: null,
      ledger: null,
    });
    expect(await readFile(path.join(writableRoot, "authorized"), "utf8")).toBe(
      "continued",
    );
    expect(await readFile(publicFile, "utf8")).toBe("public-fixture");
    expect(database.prepare("SELECT id FROM receipts").get()).toEqual({
      id: "committed",
    });
  } finally {
    database.close();
    if (child.pid)
      await signalInvocationGroup(invocation, child.pid, "SIGKILL");
    await exited;
    if (child.pid) await assertInvocationGroupEmpty(invocation, child.pid);
    const cleanupErrors = await releaseInvocation(invocation, "LI-boundary");

    if (cleanupErrors.length)
      throw new AggregateError(cleanupErrors, "LI-boundary cleanup failed");
  }
}, 60_000);

it("LI-refusal: unavailable capabilities and invalid policies refuse launch and probes release on every failure", async () => {
  const evidence = await mkdtemp(
    path.join(tmpdir(), "maister-linux-refusal-evidence-"),
  );
  const invocation = await createInvocation(evidence);
  const root = await mkdtemp(path.join(tmpdir(), "maister-linux-refusal-"));

  await registerRoot(invocation, root, "linux-refusal");
  const application = path.join(root, "application");
  const privateRoot = path.join(root, "private");
  const writable = path.join(root, "web-state");

  await Promise.all(
    [application, privateRoot, writable].map((directory) => mkdir(directory)),
  );
  const sentinel = path.join(privateRoot, "sentinel");

  await writeFile(sentinel, "private-control");
  const capabilityDenial = path.join(
    application,
    "namespace-capability-denied",
  );

  execFileSync(
    "cc",
    [
      "-std=c11",
      "-Wall",
      "-Wextra",
      "-Werror",
      fileURLToPath(
        new URL("../fixtures/namespace-capability-denied.c", import.meta.url),
      ),
      "-o",
      capabilityDenial,
    ],
    { timeout: 10_000, maxBuffer: 16_384 },
  );
  const input = {
    invocation,
    cwd: application,
    readOnlyPaths: [application, ...linuxRuntimePaths([process.execPath])],
    writableRoots: [writable],
    deniedRoots: [privateRoot],
    protectedFiles: [{ path: sentinel }],
  };
  const policy = await prepareLinuxIsolationPolicy(input);
  const info = statSync(privateRoot);
  const forged = {
    ...policy,
    mounts: [
      ...policy.mounts,
      {
        source: privateRoot,
        destination: privateRoot,
        device: info.dev,
        inode: info.ino,
        access: "read-only" as const,
        directory: true,
      },
    ],
  };

  try {
    if (activeBuildRegistered)
      expect
        .soft(
          buildFailureObserved,
          "cancelled real build must retain its failure",
        )
        .toBe(true);
    for (const observation of cancellationObservations)
      expect.soft(observation, observation.control).toEqual({
        control: observation.control,
        joined: true,
        rejected: true,
        launchesAfterCancellation: 0,
        originalErrorPreserved: true,
        cleanupPassed: true,
        live: 0,
        rootsRemaining: 0,
      });
    await assertDatabaseAcquisitionCancellation();
    await assertInvalidRestartRefusal();
    await assertRealDockerTcpRefusal();
    expect(() =>
      resolveIsolationDriver().wrap(
        [process.execPath, "-e", "process.exit(90)"],
        [privateRoot],
        forged,
      ),
    ).toThrow(IsolationPolicyError);
    const invalidPolicies = [
      { ...input, readOnlyPaths: [...input.readOnlyPaths, privateRoot] },
      { ...input, readOnlyPaths: [...input.readOnlyPaths, application] },
      {
        ...input,
        readOnlyPaths: [
          ...input.readOnlyPaths,
          `${application}/../application`,
        ],
      },
      { ...input, cwd: privateRoot },
      { ...input, environmentKeys: ["NODE_OPTIONS"] },
    ];

    for (const invalid of invalidPolicies)
      await expect(prepareLinuxIsolationPolicy(invalid)).rejects.toThrow(
        IsolationPolicyError,
      );
    const alias = path.join(root, "private-alias");

    await symlink(privateRoot, alias);
    await expect(
      prepareLinuxIsolationPolicy({
        ...input,
        readOnlyPaths: [...input.readOnlyPaths, alias],
      }),
    ).rejects.toThrow(IsolationPolicyError);
    const exported = path.join(application, "exported-private-inode");

    await link(sentinel, exported);
    await expect(prepareLinuxIsolationPolicy(input)).rejects.toThrow(
      IsolationPolicyError,
    );
    await rm(exported);
    await assertNestedMountRefusal({
      invocation,
      root,
      application,
      writable,
      privateRoot,
      sentinel,
    });
    const marker = path.join(root, ".maister-test-invocation");

    await writeFile(marker, "foreign-marker");
    expect(() =>
      resolveIsolationDriver().wrap(
        [process.execPath, "-e", "process.exit(90)"],
        [privateRoot],
        policy,
      ),
    ).toThrow(InvocationOwnershipError);
    await writeFile(marker, invocation.id);
    const witness = path.join(writable, "application-exec-witness");
    const wrapped = resolveIsolationDriver().wrap(
      [
        process.execPath,
        "-e",
        "require('node:fs').writeFileSync(process.argv[1], 'unexpected-exec')",
        witness,
      ],
      [privateRoot],
      policy,
    );
    const child = spawn(capabilityDenial, [wrapped.file, ...wrapped.args], {
      cwd: application,
      env: linuxOuterEnvironment(policy, {
        ...process.env,
        ...(await fixtureProcessEnvironment(invocation)),
      }),
      detached: true,
      stdio: ["ignore", "pipe", "pipe", "pipe"],
    });
    const closed = new Promise<void>((resolve) =>
      child.once("close", () => resolve()),
    );
    const observed = observeLinuxApplication(child);

    child.stderr!.resume();
    child.stdout!.resume();
    try {
      await registerSpawnedProcess(
        invocation,
        {
          role: "fixture",
          caseName: "LI-refusal",
          rootRole: "web",
          root: writable,
          bootId: "capability-denied",
          logFile: null,
        },
        child,
      );
      await expect(waitForLinuxApplication(observed, 20_000)).rejects.toThrow(
        IsolationUnavailableError,
      );
      await closed;
      await expect(access(witness)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      if (child.pid && child.exitCode === null && child.signalCode === null)
        await signalInvocationGroup(invocation, child.pid, "SIGKILL");
      await closed;
      if (child.pid) await assertInvocationGroupEmpty(invocation, child.pid);
    }
    const controller = spawn(
      process.execPath,
      [
        "--import",
        FIXTURE_WATCHDOG,
        "--import",
        fileURLToPath(
          new URL("../../node_modules/tsx/dist/loader.mjs", import.meta.url),
        ),
        fileURLToPath(
          new URL("../fixtures/linux-probe-controls.mjs", import.meta.url),
        ),
        JSON.stringify(policy),
        sentinel,
      ],
      {
        cwd: application,
        env: {
          ...process.env,
          ...(await fixtureProcessEnvironment(invocation)),
        },
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    let diagnostics = "";
    const controllerClosed = new Promise<{
      code: number | null;
      signal: NodeJS.Signals | null;
    }>((resolve) =>
      controller.once("close", (code, signal) => resolve({ code, signal })),
    );

    controller.stdout!.on("data", (chunk: Buffer) => {
      output = `${output}${chunk.toString()}`.slice(-16_384);
    });
    controller.stderr!.on("data", (chunk: Buffer) => {
      diagnostics = `${diagnostics}${chunk.toString()}`.slice(-8192);
    });
    let controllerTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      await registerSpawnedProcess(
        invocation,
        {
          role: "fixture",
          caseName: "LI-refusal",
          rootRole: "probe-controller",
          root: writable,
          bootId: "probe-failures",
          logFile: null,
        },
        controller,
      );
      const result = await Promise.race([
        controllerClosed,
        new Promise<never>((_, reject) => {
          controllerTimer = setTimeout(
            () =>
              reject(
                new Error(
                  "probe failure controller exceeded its 45000ms deadline",
                ),
              ),
            45_000,
          );
        }),
      ]);

      expect(result, diagnostics).toEqual({ code: 0, signal: null });
      const report = output
        .trim()
        .split("\n")
        .map((line) => {
          try {
            return JSON.parse(line) as {
              event?: string;
              passed?: number;
              registered?: number;
              live?: number;
            };
          } catch {
            return { event: "diagnostic" };
          }
        })
        .find((entry) => entry.event === "linux-probe-failure-controls");

      expect(report).toEqual({
        event: "linux-probe-failure-controls",
        passed: 5,
        registered: 4,
        live: 0,
        node: process.versions.node,
      });
    } finally {
      if (controllerTimer) clearTimeout(controllerTimer);
      if (
        controller.pid &&
        controller.exitCode === null &&
        controller.signalCode === null
      )
        await signalInvocationGroup(invocation, controller.pid, "SIGKILL");
      await controllerClosed;
      if (controller.pid)
        await assertInvocationGroupEmpty(invocation, controller.pid);
    }
    await rename(application, `${application}-replaced`);
    await mkdir(application);
    expect(() =>
      resolveIsolationDriver().wrap(
        [process.execPath, "-e", "process.exit(90)"],
        [privateRoot],
        policy,
      ),
    ).toThrow(IsolationPolicyError);
  } finally {
    const failures = await releaseInvocation(invocation, "LI-refusal");

    if (failures.length)
      throw new AggregateError(failures, "LI-refusal cleanup failed");
  }
}, 60_000);

type LinuxDescendantEvent = Readonly<{
  event: string;
  namespacePid: number;
  detached: boolean;
  denial?: string;
}>;

async function requireLinuxOutcome(
  outcome: Promise<LinuxApplicationOutcome>,
  control: string,
): Promise<LinuxApplicationOutcome> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const observed = await Promise.race([
      outcome,
      new Promise<"pending">((resolve) => {
        timer = setTimeout(() => resolve("pending"), 5_000);
      }),
    ]);

    expect(
      observed,
      `${control}: the exited application must report its outcome before containment`,
    ).not.toBe("pending");
    if (observed === "pending")
      throw new Error("Unsettled Linux application outcome");

    return observed;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function descendantEvents(
  text: string,
  event: string,
): readonly LinuxDescendantEvent[] {
  return text
    .split("\n")
    .filter((line) => line.startsWith("{"))
    .flatMap((line) => {
      const value: LinuxDescendantEvent = JSON.parse(line);

      return value.event === event ? [value] : [];
    });
}

async function assertLinuxTreeGone(
  invocation: Invocation,
  identities: readonly ProcessIdentity[],
  control: string,
): Promise<void> {
  await expect
    .poll(
      async () =>
        (await readProcessSnapshot(invocation))
          .filter(
            (current) =>
              !current.zombie &&
              identities.some((identity) => sameProcess(identity, current)),
          )
          .map((identity) => identity.pid),
      { timeout: 5_000, interval: 100 },
    )
    .toEqual([]);
  logInvocation(invocation, "linux-lifecycle-before-containment", {
    control,
    captured: identities.map((identity) => identity.pid),
    live: 0,
  });
}

async function assertResistantDescendants(
  invocation: Invocation,
  tree: readonly ProcessIdentity[],
  text: string,
): Promise<readonly ProcessIdentity[]> {
  const events = descendantEvents(text, "linux-resistant-ready");

  expect(events).toHaveLength(2);
  expect(events.map((event) => event.detached).sort()).toEqual([false, true]);
  expect(events.map((event) => event.denial)).toEqual(["ENOENT", "ENOENT"]);
  const namespaceIds = await Promise.all(
    tree.map(async (identity) => ({
      identity,
      namespacePid: await linuxNamespacePid(identity),
    })),
  );
  const children = events.map((event) => {
    const found = namespaceIds.find(
      (entry) => entry.namespacePid === event.namespacePid,
    );

    if (!found)
      throw new Error(
        "Reached Linux descendant is absent from the verified tree",
      );
    if (event.detached) expect(found.identity.pgid).toBe(found.identity.pid);

    return found.identity;
  });

  for (const child of children)
    await signalInvocationProcess(invocation, child, "SIGTERM");

  return children;
}

async function startResistantProductionWeb(): Promise<RealWeb> {
  const previous = restartFixture.web.options;
  const isolation = previous.isolation!;
  const driver = isolation.driver;
  const preload = resistantDescendantPreload(restartFixture.sentinel);

  return webFixtures.startRealWeb({
    ...previous,
    logFile: path.join(
      invocationFromEnvironment()!.directory,
      `linux-drain-${randomUUID()}.log`,
    ),
    isolation: {
      ...isolation,
      driver: {
        ...driver,
        wrap(command, deniedRoots, policy) {
          return driver.wrap(
            [command[0], "--import", preload, ...command.slice(1)],
            deniedRoots,
            policy,
          );
        },
      },
    },
  });
}

async function reachedProductionTree(
  web: RealWeb,
): Promise<readonly ProcessIdentity[]> {
  const invocation = invocationFromEnvironment()!;

  await expect
    .poll(
      async () =>
        descendantEvents(
          await readFile(web.logFile, "utf8"),
          "linux-resistant-ready",
        ).length,
      { timeout: 20_000, interval: 100 },
    )
    .toBe(2);
  const tree = await linuxControlTree(invocation, web.pid);
  const children = await assertResistantDescendants(
    invocation,
    tree,
    await readFile(web.logFile, "utf8"),
  );

  await expect
    .poll(
      async () =>
        descendantEvents(
          await readFile(web.logFile, "utf8"),
          "linux-resistant-term",
        ).length,
      { timeout: 5_000, interval: 100 },
    )
    .toBe(2);
  for (const child of children) {
    const current = await processIdentity(invocation, child.pid);

    expect(sameProcess(child, current)).toBe(true);
    expect(current.zombie).toBe(false);
  }

  return tree;
}

it("LI-term: verified graceful forwarding preserves production drain and exact application code or signal", async () => {
  const invocation = invocationFromEnvironment()!;
  const web = await startResistantProductionWeb();
  const allowGroupCheck = Promise.withResolvers<void>();
  const assertGroupEmpty = processFixtures.assertInvocationGroupEmpty;
  const signalGroup = processFixtures.signalInvocationGroup;
  const groupSignals: NodeJS.Signals[] = [];
  const groupSignalling = vi
    .spyOn(processFixtures, "signalInvocationGroup")
    .mockImplementation(async (owner, pgid, signal) => {
      if (owner.id === invocation.id && pgid === web.pid)
        groupSignals.push(signal);
      await signalGroup(owner, pgid, signal);
    });
  const groupCheck = vi
    .spyOn(processFixtures, "assertInvocationGroupEmpty")
    .mockImplementation(async (owner, pgid) => {
      if (owner.id === invocation.id && pgid === web.pid)
        await allowGroupCheck.promise;
      await assertGroupEmpty(owner, pgid);
    });
  let stopping: Promise<void> | undefined;

  try {
    const tree = await reachedProductionTree(web);

    stopping = web.stop();
    void stopping.catch(() => undefined);
    expect(await web.outcome).toEqual({
      kind: "observed",
      code: 0,
      signal: null,
    });
    expect(
      groupSignals,
      "production drain must complete without group broadcast or escalation",
    ).toEqual([]);
    expect(await readFile(web.logFile, "utf8")).toContain("web-shutdown-done");
    await assertLinuxTreeGone(invocation, tree, "LI-term/production-drain");
  } finally {
    allowGroupCheck.resolve();
    groupCheck.mockRestore();
    groupSignalling.mockRestore();
    if (stopping) await stopping;
    else await web.kill();
  }

  const { policy } = await createLinuxControlPolicy(invocation);
  const outcomes = [
    {
      name: "exit137",
      action: "process.exit(137)",
      expected: { kind: "observed", code: 137, signal: null },
    },
    {
      name: "signal-kill",
      action: "process.kill(process.pid, 'SIGKILL')",
      expected: { kind: "observed", code: null, signal: "SIGKILL" },
    },
  ] as const;

  for (const outcome of outcomes) {
    const control = await startLinuxControlProcess(policy, [
      process.execPath,
      "-e",
      `process.on("SIGINT", () => { ${outcome.action}; });
       process.stdout.write("signal-ready\\n"); setInterval(() => {}, 1000);`,
    ]);

    try {
      await waitForLinuxApplication(control.observation, 20_000);
      await expect
        .poll(control.stdout, { timeout: 5_000, interval: 100 })
        .toContain("signal-ready");
      const tree = await linuxControlTree(invocation, control.identity.pid);

      await signalInvocationProcess(invocation, control.identity, "SIGINT");
      expect(
        await requireLinuxOutcome(
          control.observation.outcome,
          `LI-term/${outcome.name}`,
        ),
      ).toEqual(outcome.expected);
      await assertLinuxTreeGone(invocation, tree, `LI-term/${outcome.name}`);
      logInvocation(invocation, "linux-lifecycle-outcome", {
        control: outcome.name,
        ...outcome.expected,
      });
    } finally {
      await signalInvocationGroup(invocation, control.identity.pgid, "SIGKILL");
      await control.closed;
      await assertInvocationGroupEmpty(invocation, control.identity.pgid);
    }
  }
}, 60_000);

it("LI-kill: namespace and outer death terminate detached resistant descendants without touching siblings", async () => {
  const invocation = invocationFromEnvironment()!;
  const foreign = await createInvocation(
    path.join(invocation.directory, "linux-foreign"),
  );
  const sibling = spawn(
    process.execPath,
    ["--import", FIXTURE_WATCHDOG, "-e", "setInterval(() => {}, 1000)"],
    {
      env: { ...process.env, ...(await fixtureProcessEnvironment(foreign)) },
      detached: true,
      stdio: "ignore",
    },
  );
  const siblingClosed = new Promise<void>((resolve) =>
    sibling.once("close", () => resolve()),
  );
  const registration = await registerSpawnedProcess(
    foreign,
    {
      role: "fixture",
      caseName: "LI-kill",
      rootRole: "foreign-witness",
      root: null,
      bootId: String(sibling.pid),
      logFile: null,
    },
    sibling,
  );

  try {
    await expect(
      signalInvocationProcess(invocation, registration.identity, "SIGTERM"),
    ).rejects.toThrow(InvocationOwnershipError);
    for (const cut of ["application", "namespace-init", "outer"] as const) {
      const web = await startResistantProductionWeb();

      try {
        const tree = await reachedProductionTree(web);
        const readyLine = (await readFile(web.logFile, "utf8"))
          .split("\n")
          .find((line) => line.includes('"event":"linux-namespace-ready"'));

        if (!readyLine)
          throw new Error("Production namespace readiness record is missing");
        const ready: { pid: number } = JSON.parse(readyLine);
        let target: ProcessIdentity | undefined;

        if (cut === "application")
          target = tree.find((identity) => identity.pid === ready.pid);
        else if (cut === "outer")
          target = tree.find((identity) => identity.pid === web.pid);
        else {
          for (const identity of tree)
            if ((await linuxNamespacePid(identity)) === 1) target = identity;
        }
        if (!target) throw new Error(`Reached ${cut} identity is missing`);
        await signalInvocationProcess(invocation, target, "SIGKILL");
        const outcome = await requireLinuxOutcome(
          web.outcome,
          `LI-kill/${cut}`,
        );

        if (cut === "application")
          expect(outcome).toEqual({
            kind: "observed",
            code: null,
            signal: "SIGKILL",
          });
        else if (cut === "outer")
          expect(outcome).toEqual({
            kind: "unobserved",
            reason: "launcher-killed",
          });
        else expect(outcome.kind).toBe("unobserved");
        await assertLinuxTreeGone(invocation, tree, `LI-kill/${cut}`);
        const witness = await processIdentity(
          foreign,
          registration.identity.pid,
        );

        expect(sameProcess(registration.identity, witness)).toBe(true);
        expect(witness.zombie).toBe(false);
        logInvocation(invocation, "linux-lifecycle-outcome", {
          control: `LI-kill/${cut}`,
          ...outcome,
          foreignAlive: true,
        });
      } finally {
        await web.kill();
      }
    }
  } finally {
    const witness = await findProcessIdentity(
      foreign,
      registration.identity.pid,
    );

    logInvocation(invocation, "linux-foreign-before-containment", {
      control: "LI-kill",
      alive:
        witness !== null &&
        !witness.zombie &&
        sameProcess(registration.identity, witness),
    });
    await signalInvocationGroup(foreign, registration.identity.pgid, "SIGKILL");
    await siblingClosed;
    await assertInvocationGroupEmpty(foreign, registration.identity.pgid);
    const failures = await releaseInvocation(foreign, "LI-kill");

    if (failures.length)
      throw new AggregateError(
        failures,
        "Linux foreign-witness cleanup failed",
      );
  }
}, 60_000);

type LinuxParentMessage = Readonly<{ event: string; pid?: number }>;
type LinuxParentControl = Readonly<{
  identity: ProcessIdentity;
  closed: Promise<void>;
  workerClosed: Promise<void>;
  stdout(): string;
  stderr(): string;
  messages(): readonly LinuxParentMessage[];
}>;

async function startLinuxParentRunner(
  policy: LinuxIsolationPolicy,
  command: readonly string[],
): Promise<LinuxParentControl> {
  const invocation = policy.invocation;
  const runner = spawn(
    process.execPath,
    [
      "--import",
      FIXTURE_WATCHDOG,
      "--import",
      createRequire(import.meta.url).resolve("tsx"),
      fileURLToPath(
        new URL("../fixtures/linux-lifecycle-runner.mjs", import.meta.url),
      ),
      serializeLinuxIsolationPolicy(policy),
      JSON.stringify(command),
    ],
    {
      env: { ...process.env, ...(await fixtureProcessEnvironment(invocation)) },
      detached: true,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    },
  );
  const closed = new Promise<void>((resolve) =>
    runner.once("close", () => resolve()),
  );
  const workerClosed = Promise.withResolvers<void>();
  let stdout = "";
  let stderr = "";
  let failure: Error | undefined;
  const messages: LinuxParentMessage[] = [];

  runner.stdout!.on("data", (chunk: Buffer) => {
    if (Buffer.byteLength(stdout) + chunk.length > 16_384)
      failure = new Error("Linux parent output exceeded its 16KiB bound");
    else stdout += chunk.toString();
  });
  runner.stderr!.on("data", (chunk: Buffer) => {
    stderr = `${stderr}${chunk.toString()}`.slice(-16_384);
  });
  runner.on("message", (message: unknown) => {
    if (
      !message ||
      typeof message !== "object" ||
      !("event" in message) ||
      typeof message.event !== "string"
    ) {
      failure = new Error("Invalid Linux parent IPC event");

      return;
    }
    messages.push(message as LinuxParentMessage);
    if (message.event === "linux-worker-exited") workerClosed.resolve();
  });
  runner.once("error", (error) => {
    failure = error;
  });
  const { identity } = await registerSpawnedProcess(
    invocation,
    {
      role: "fixture",
      caseName: "LI-parent",
      rootRole: "linux-runner",
      root: policy.cwd,
      bootId: String(runner.pid),
      logFile: null,
    },
    runner,
  );

  function assertRunning(): void {
    if (failure) throw failure;
    if (runner.exitCode !== null || runner.signalCode !== null)
      throw new Error(`Linux parent exited before its barrier: ${stderr}`);
    if (messages.some((message) => message.event === "linux-worker-exited"))
      throw new Error(`Linux worker exited before its barrier: ${stderr}`);
  }

  return {
    identity,
    closed,
    workerClosed: workerClosed.promise,
    stdout: () => {
      assertRunning();

      return stdout;
    },
    stderr: () => stderr,
    messages: () => {
      assertRunning();

      return messages;
    },
  };
}

async function containLinuxControlTree(
  invocation: Invocation,
  tree: readonly ProcessIdentity[],
): Promise<void> {
  for (const identity of [...tree].reverse())
    await signalInvocationProcess(invocation, identity, "SIGKILL");
  for (const pgid of new Set(tree.map((identity) => identity.pgid)))
    await assertInvocationGroupEmpty(invocation, pgid);
}

it("LI-parent: startup ready and active-probe parent death close the namespace before exit-sweep containment", async () => {
  const invocation = invocationFromEnvironment()!;
  const { policy, sentinel, startupPreload } =
    await createLinuxControlPolicy(invocation);
  const loader = createRequire(import.meta.url).resolve("tsx");
  const worker = fileURLToPath(
    new URL("../fixtures/linux-lifecycle-parent.mjs", import.meta.url),
  );
  const readyCommand = [
    process.execPath,
    "--import",
    resistantDescendantPreload(sentinel),
    "-e",
    'process.stdout.write(\'{"event":"linux-ready-held"}\\n\'); setInterval(() => {}, 1000);',
  ];
  const startupCommand = [
    process.execPath,
    "--require",
    startupPreload,
    "-e",
    'process.stdout.write(\'{"event":"linux-unexpected-exec"}\\n\');',
  ];
  const foreign = await createInvocation(
    path.join(invocation.directory, "linux-parent-foreign"),
  );
  const sibling = spawn(
    process.execPath,
    ["--import", FIXTURE_WATCHDOG, "-e", "setInterval(() => {}, 1000)"],
    {
      env: { ...process.env, ...(await fixtureProcessEnvironment(foreign)) },
      detached: true,
      stdio: "ignore",
    },
  );
  const siblingClosed = new Promise<void>((resolve) =>
    sibling.once("close", () => resolve()),
  );
  const registration = await registerSpawnedProcess(
    foreign,
    {
      role: "fixture",
      caseName: "LI-parent",
      rootRole: "foreign-witness",
      root: null,
      bootId: String(sibling.pid),
      logFile: null,
    },
    sibling,
  );

  async function assertSiblingAlive(): Promise<void> {
    const current = await processIdentity(foreign, registration.identity.pid);

    expect(sameProcess(registration.identity, current)).toBe(true);
    expect(current.zombie).toBe(false);
  }

  try {
    for (const cut of [
      {
        name: "startup-worker",
        command: startupCommand,
        marker: "linux-startup-blocked",
      },
      {
        name: "ready-runner",
        command: readyCommand,
        marker: "linux-ready-held",
      },
    ]) {
      const runner = await startLinuxParentRunner(policy, [
        process.execPath,
        "--import",
        FIXTURE_WATCHDOG,
        "--import",
        loader,
        worker,
        serializeLinuxIsolationPolicy(policy),
        JSON.stringify(cut.command),
      ]);
      let tree: readonly ProcessIdentity[] = [];

      try {
        await expect
          .poll(runner.stdout, { timeout: 20_000, interval: 100 })
          .toContain(cut.marker);
        await expect
          .poll(
            () =>
              descendantEvents(runner.stdout(), "linux-resistant-ready").length,
            { timeout: 5_000, interval: 100 },
          )
          .toBe(2);
        await expect
          .poll(
            () =>
              ["linux-worker-started", "linux-outer-started"].every((event) =>
                runner.messages().some((message) => message.event === event),
              ),
            { timeout: 5_000, interval: 100 },
          )
          .toBe(true);
        const outer = runner
          .messages()
          .find((message) => message.event === "linux-outer-started")?.pid;
        const workerPid = runner
          .messages()
          .find((message) => message.event === "linux-worker-started")?.pid;

        if (!outer || !workerPid)
          throw new Error(
            "Linux parent control has no captured outer/worker identity",
          );
        tree = await linuxControlTree(invocation, outer);
        const children = await assertResistantDescendants(
          invocation,
          tree,
          runner.stdout(),
        );

        await expect
          .poll(
            () =>
              descendantEvents(runner.stdout(), "linux-resistant-term").length,
            { timeout: 5_000, interval: 100 },
          )
          .toBe(2);
        for (const child of children)
          expect((await processIdentity(invocation, child.pid)).zombie).toBe(
            false,
          );
        if (cut.name === "startup-worker") {
          expect(
            runner
              .messages()
              .some((message) => message.event === "linux-application-ready"),
          ).toBe(false);
          expect(runner.stdout()).not.toContain("linux-unexpected-exec");
          await signalInvocationProcess(
            invocation,
            await processIdentity(invocation, workerPid),
            "SIGKILL",
          );
        } else {
          await expect
            .poll(
              () =>
                runner
                  .messages()
                  .some(
                    (message) => message.event === "linux-application-ready",
                  ),
              { timeout: 5_000, interval: 100 },
            )
            .toBe(true);
          tree = await linuxControlTree(invocation, runner.identity.pid);
          await signalInvocationProcess(invocation, runner.identity, "SIGKILL");
        }
        await assertLinuxTreeGone(invocation, tree, `LI-parent/${cut.name}`);
        if (cut.name === "startup-worker")
          expect(
            (await processIdentity(invocation, runner.identity.pid)).zombie,
          ).toBe(false);
        await assertSiblingAlive();
      } finally {
        await containLinuxControlTree(invocation, tree);
        await signalInvocationProcess(invocation, runner.identity, "SIGKILL");
        await runner.closed;
        await assertInvocationGroupEmpty(invocation, runner.identity.pgid);
      }
    }

    const held = Promise.withResolvers<void>();
    const sockets = new Set<Socket>();
    const server = createServer((socket) => {
      sockets.add(socket);
      let message = "";

      socket.on("data", (chunk: Buffer) => {
        message += chunk.toString();
      });
      socket.once("end", () => {
        if (message === "linux-probe-held\n") held.resolve();
        else held.reject(new Error("Invalid active-probe readiness message"));
      });
      socket.once("error", (error) => held.reject(error));
      socket.once("close", () => sockets.delete(socket));
    });

    void held.promise.catch(() => undefined);
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    server.on("error", (error) => held.reject(error));
    const address = server.address();

    if (!address || typeof address === "string")
      throw new Error("Probe readiness TCP address is missing");
    let runner: LinuxParentControl | undefined;
    let probeTree: readonly ProcessIdentity[] = [];

    try {
      runner = await startLinuxParentRunner(policy, [
        process.execPath,
        "--import",
        FIXTURE_WATCHDOG,
        "--import",
        loader,
        fileURLToPath(
          new URL("../fixtures/linux-probe-parent.mjs", import.meta.url),
        ),
        serializeLinuxIsolationPolicy(policy),
        sentinel,
        String(address.port),
      ]);
      await Promise.race([
        held.promise,
        runner.closed.then((): never => {
          throw new Error("Probe parent exited before its active barrier");
        }),
        runner.workerClosed.then((): never => {
          throw new Error(
            `Probe worker exited before its active barrier: ${runner!.stderr()}`,
          );
        }),
      ]);
      probeTree = await linuxControlTree(invocation, runner.identity.pid);
      expect(probeTree.length).toBeGreaterThanOrEqual(6);
      expect(
        (await invocationRecords(invocation)).some(
          (record) =>
            record.kind === "process" &&
            record.rootRole === "isolation-probe" &&
            probeTree.some((identity) =>
              sameProcess(identity, record.identity),
            ),
        ),
      ).toBe(true);
      await signalInvocationProcess(invocation, runner.identity, "SIGKILL");
      await assertLinuxTreeGone(
        invocation,
        probeTree,
        "LI-parent/active-probe-runner",
      );
      await assertSiblingAlive();
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await containLinuxControlTree(invocation, probeTree);
      if (runner) {
        await signalInvocationProcess(invocation, runner.identity, "SIGKILL");
        await runner.closed;
        await assertInvocationGroupEmpty(invocation, runner.identity.pgid);
      }
    }
  } finally {
    const witness = await findProcessIdentity(
      foreign,
      registration.identity.pid,
    );

    logInvocation(invocation, "linux-foreign-before-containment", {
      control: "LI-parent",
      alive:
        witness !== null &&
        !witness.zombie &&
        sameProcess(registration.identity, witness),
    });
    await signalInvocationGroup(foreign, registration.identity.pgid, "SIGKILL");
    await siblingClosed;
    await assertInvocationGroupEmpty(foreign, registration.identity.pgid);
    const failures = await releaseInvocation(foreign, "LI-parent");

    if (failures.length)
      throw new AggregateError(
        failures,
        "Linux parent foreign-witness cleanup failed",
      );
  }
}, 60_000);
