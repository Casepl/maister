import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, URL as NodeURL } from "node:url";

import {
  assertInvocationGroupEmpty,
  fixtureProcessEnvironment,
  logInvocation,
  nativeExecutable,
  registerSpawnedProcess,
  signalInvocationGroup,
  type Invocation,
} from "./process-invocation";

/** Hold two real HTTP response streams using bounded kernel receive buffers. */
export async function holdRuntimeObjectReads(
  invocation: Invocation,
  url: string,
): Promise<{ release(): Promise<void> }> {
  const executable = await nativeExecutable(
    invocation,
    fileURLToPath(new NodeURL("./fixtures/held-http-reads.c", import.meta.url)),
    "held-http-reads",
  );
  const endpoint = new NodeURL(url);
  const bootId = randomUUID();
  const logFile = path.join(
    invocation.directory,
    `held-http-reads-${bootId}.log`,
  );
  const env = {
    ...process.env,
    ...(await fixtureProcessEnvironment(invocation)),
  };

  await writeFile(logFile, "", { mode: 0o600 });
  const child = spawn(executable, [endpoint.port, endpoint.pathname], {
    env,
    detached: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let failure: Error | undefined;
  let diagnostics = "";
  let stdout = "";
  const closed = new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve) => {
    child.once("error", (error) => {
      failure = error;
    });
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  const ready = new Promise<void>((resolve, reject) => {
    child.stdout.on("data", (chunk: Buffer) => {
      stdout = `${stdout}${chunk.toString()}`.slice(0, 1025);
      if (stdout.length > 1024) {
        reject(new Error("held HTTP reads exceeded readiness output bound"));

        return;
      }
      if (!stdout.endsWith("\n")) return;
      const match =
        /^\{"event":"held-http-reads-ready","connections":2,"receiveBufferBytes":\[(\d+),(\d+)\]\}\n$/u.exec(
          stdout,
        );

      if (!match) {
        reject(new Error("held HTTP reads emitted invalid readiness"));

        return;
      }
      logInvocation(invocation, "held-http-reads-ready", {
        pid: child.pid ?? -1,
        bootId,
        connections: 2,
        receiveBufferBytes: [Number(match[1]), Number(match[2])],
      });
      resolve();
    });
    child.once("close", () =>
      reject(
        new Error(
          `held HTTP reads closed before readiness: ${child.exitCode}/${child.signalCode}\n${diagnostics}`,
          { cause: failure },
        ),
      ),
    );
  });

  void ready.catch(() => undefined);
  child.stderr.on("data", (chunk: Buffer) => {
    diagnostics = `${diagnostics}${chunk.toString()}`.slice(-16 * 1024);
  });
  child.stdin.on("error", (error) => {
    failure ??= error;
  });

  async function release(): Promise<void> {
    const failures: unknown[] = [];

    child.stdin.end();
    const result = await Promise.race([
      closed,
      delay(5_000, null, { ref: false }),
    ]);

    if (!result) {
      failures.push(new Error("held HTTP reads exceeded its release deadline"));
      try {
        if (child.pid)
          await signalInvocationGroup(invocation, child.pid, "SIGKILL");
      } catch (error) {
        failures.push(error);
      }
      try {
        await Promise.race([
          closed,
          delay(5_000, undefined, { ref: false }).then(() => {
            throw new Error("held HTTP reads did not close after containment");
          }),
        ]);
      } catch (error) {
        failures.push(error);
      }
    }
    try {
      await writeFile(logFile, `${stdout}${diagnostics}`, { mode: 0o600 });
    } catch (error) {
      failures.push(error);
    }
    try {
      if (child.pid) await assertInvocationGroupEmpty(invocation, child.pid);
    } catch (error) {
      failures.push(error);
    }
    if (failure) failures.push(failure);
    if (!result || result.code !== 0 || result.signal !== null)
      failures.push(
        new Error(
          `held HTTP reads outcome: ${result?.code}/${result?.signal}\n${diagnostics}`,
        ),
      );
    if (failures.length > 0)
      throw new AggregateError(failures, "held HTTP reads cleanup failed");
    logInvocation(invocation, "held-http-reads-released", {
      pid: child.pid ?? -1,
      bootId,
      code: result?.code ?? null,
      signal: result?.signal ?? null,
    });
  }

  try {
    await registerSpawnedProcess(
      invocation,
      {
        role: "fixture",
        caseName: "bounded-output read capacity",
        rootRole: "test-support",
        root: null,
        bootId,
        logFile,
      },
      child,
    );
    await Promise.race([
      ready,
      delay(10_000, undefined, { ref: false }).then(() => {
        throw new Error("held HTTP reads readiness deadline exceeded");
      }),
    ]);
  } catch (error) {
    try {
      await release();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "held HTTP reads startup and cleanup failed",
      );
    }
    throw error;
  }

  return { release };
}
