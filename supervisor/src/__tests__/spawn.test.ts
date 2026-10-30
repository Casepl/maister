import type { SessionEvent, StartSessionRequest } from "../types";

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pino from "pino";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SESSION_EVENT_CHANNEL } from "../registry";
import { spawnSession } from "../spawn";

import { directoryWorkspace, HANDLE } from "./_fixtures/workspace";

const FIXTURE_PATH = resolve(
  fileURLToPath(import.meta.url),
  "../../../test/fixtures/fake-acp.mjs",
);
const logger = pino({ level: "silent" });
const CREATED_BY = {
  commandId: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f",
  assignmentId: "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d",
  assignmentEpoch: 1,
};

let runtimeRoot: string;

beforeEach(async () => {
  runtimeRoot = await mkdtemp(join(tmpdir(), "spawn-test-"));
});

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

function request(): StartSessionRequest {
  return {
    executionWorkspaceId: HANDLE,
    stepId: "step-1",
    executor: { agent: "claude", model: "claude-sonnet-4-6" },
  };
}

describe("spawnSession", () => {
  it("captures complete bounded frames for protocol-owned publication", async () => {
    const { child, emitter, record, acpStdoutTap } = await spawnSession({
      sessionId: "session-1",
      request: request(),
      createdBy: CREATED_BY,
      workspace: directoryWorkspace({
        runtimeRoot,
        cwd: process.cwd(),
        runId: "run-1",
        stepId: "step-1",
      }),
      logger,
      binaryOverride: process.execPath,
      preArgs: [FIXTURE_PATH, "--lines", "3"],
    });
    const events: SessionEvent[] = [];
    const frames: Buffer[] = [];

    emitter.on(SESSION_EVENT_CHANNEL, (event: SessionEvent) =>
      events.push(event),
    );
    acpStdoutTap.on("data", (frame: Buffer) => frames.push(frame));

    await new Promise<void>((resolvePromise) =>
      child.once("exit", resolvePromise),
    );
    await record.outputDrained;

    expect(record.outputFailure).toBeUndefined();
    expect(frames).toHaveLength(3);
    expect(frames.every((frame) => frame.at(-1) === 10)).toBe(true);
    expect(
      frames.map(
        (frame) => (JSON.parse(frame.toString()) as { text: string }).text,
      ),
    ).toEqual(["line 0", "line 1", "line 2"]);
    // The protocol boundary assigns IDs and publishes only after durable commit.
    expect(events).toEqual([]);
    expect(record.monotonicId).toBe(0);
  });

  it("does not resurrect a run events JSONL file", async () => {
    const workspace = directoryWorkspace({
      runtimeRoot,
      cwd: process.cwd(),
      runId: "run-no-events-file",
      stepId: "step-1",
    });
    const { child, record, acpStdoutTap } = await spawnSession({
      sessionId: "session-no-events-file",
      request: request(),
      createdBy: CREATED_BY,
      workspace,
      logger,
      binaryOverride: process.execPath,
      preArgs: [FIXTURE_PATH, "--lines", "0"],
    });

    acpStdoutTap.resume();
    await new Promise<void>((resolvePromise) =>
      child.once("exit", resolvePromise),
    );
    await record.outputDrained;
    expect(record.outputFailure).toBeUndefined();

    await expect(
      import("node:fs/promises").then(({ access }) =>
        access(join(workspace.runDir, "run.events.jsonl")),
      ),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
