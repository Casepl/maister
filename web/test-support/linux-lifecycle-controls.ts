import type { ChildProcess } from "node:child_process";
import type { LinuxIsolationPolicy } from "./linux-isolation";
import type { LinuxApplicationObservation } from "./process-isolation";
import type { Invocation, ProcessIdentity } from "./process-invocation";

import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  linuxOuterEnvironment,
  linuxRuntimePaths,
  prepareLinuxIsolationPolicy,
} from "./linux-isolation";
import {
  fixtureProcessEnvironment,
  InvocationOwnershipError,
  readProcessSnapshot,
  registerRoot,
  registerSpawnedProcess,
} from "./process-invocation";
import {
  observeLinuxApplication,
  resolveIsolationDriver,
} from "./process-isolation";

/** Both children acknowledge an installed TERM handler before the owner signals them. */
export function resistantDescendantSource(sentinel: string): string {
  const child = `
    const fs = require("node:fs");
    const detached = process.argv[2] === "true";
    const report = event => process.stdout.write(JSON.stringify({
      event, namespacePid: process.pid, detached
    }) + "\\n");
    process.on("SIGTERM", () => report("linux-resistant-term"));
    process.on("SIGINT", () => {});
    let denial;
    try { fs.readFileSync(process.argv[1]); denial = "READABLE"; }
    catch (error) { denial = error.code; }
    process.stdout.write(JSON.stringify({
      event: "linux-resistant-ready", namespacePid: process.pid, detached, denial
    }) + "\\n");
    setInterval(() => {}, 1000);
  `;

  return `
    for (const detached of [false, true]) {
      spawn(process.execPath, ["--disable-sigusr1", "-e", ${JSON.stringify(child)},
        ${JSON.stringify(sentinel)}, String(detached)], {
        detached, stdio: ["ignore", "inherit", "inherit"]
      }).once("error", error => { throw error; });
    }
  `;
}

export function resistantDescendantPreload(sentinel: string): string {
  return `data:text/javascript,${encodeURIComponent(
    `import { spawn } from "node:child_process";\n${resistantDescendantSource(sentinel)}`,
  )}`;
}

export type LinuxControlPolicy = Readonly<{
  policy: LinuxIsolationPolicy;
  sentinel: string;
  startupPreload: string;
}>;

export async function createLinuxControlPolicy(
  invocation: Invocation,
): Promise<LinuxControlPolicy> {
  const root = await mkdtemp(
    path.join(tmpdir(), "maister-linux-lifecycle-control-"),
  );

  await registerRoot(invocation, root, "linux-lifecycle-control");
  const application = path.join(root, "application");
  const writable = path.join(root, "writable");
  const privateRoot = path.join(root, "private");

  await Promise.all(
    [application, writable, privateRoot].map((file) => mkdir(file)),
  );
  const sentinel = path.join(privateRoot, "sentinel");
  const startupPreload = path.join(application, "startup.cjs");

  await writeFile(sentinel, "private-lifecycle-control");
  await writeFile(
    startupPreload,
    `const { spawn } = require("node:child_process");
     ${resistantDescendantSource(sentinel)}
     require("node:fs").writeSync(1, '{"event":"linux-startup-blocked"}\\n');
     Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);`,
  );
  const policy = await prepareLinuxIsolationPolicy({
    invocation,
    cwd: application,
    readOnlyPaths: [application, ...linuxRuntimePaths([process.execPath])],
    writableRoots: [writable],
    deniedRoots: [privateRoot],
    protectedFiles: [{ path: sentinel }],
  });

  return { policy, sentinel, startupPreload };
}

export type LinuxControlProcess = Readonly<{
  child: ChildProcess;
  identity: ProcessIdentity;
  observation: LinuxApplicationObservation;
  closed: Promise<
    Readonly<{ code: number | null; signal: NodeJS.Signals | null }>
  >;
  stdout(): string;
  stderr(): string;
}>;

export async function startLinuxControlProcess(
  policy: LinuxIsolationPolicy,
  command: readonly string[],
): Promise<LinuxControlProcess> {
  const invocation = policy.invocation;
  const wrapped = resolveIsolationDriver().wrap(
    command,
    policy.deniedRoots,
    policy,
  );
  const child = spawn(wrapped.file, wrapped.args, {
    cwd: policy.cwd,
    env: linuxOuterEnvironment(policy, {
      ...process.env,
      ...(await fixtureProcessEnvironment(invocation)),
    }),
    detached: true,
    stdio: ["ignore", "pipe", "pipe", "pipe"],
  });
  const observation = observeLinuxApplication(child);
  const closed = new Promise<
    Readonly<{ code: number | null; signal: NodeJS.Signals | null }>
  >((resolve) =>
    child.once("close", (code, signal) => resolve({ code, signal })),
  );
  let stdout = "";
  let stderr = "";
  let overflow = false;

  child.stdout!.on("data", (chunk: Buffer) => {
    if (Buffer.byteLength(stdout) + chunk.length > 16_384) overflow = true;
    else stdout += chunk.toString();
  });
  child.stderr!.on("data", (chunk: Buffer) => {
    stderr = `${stderr}${chunk.toString()}`.slice(-16_384);
  });
  const { identity } = await registerSpawnedProcess(
    invocation,
    {
      role: "fixture",
      caseName: "linux-lifecycle-control",
      rootRole: "linux-outer",
      root: policy.cwd,
      bootId: String(child.pid),
      logFile: null,
    },
    child,
  );

  return {
    child,
    identity,
    observation,
    closed,
    stdout: () => {
      if (overflow)
        throw new Error("Linux lifecycle output exceeded its 16KiB bound");

      return stdout;
    },
    stderr: () => stderr,
  };
}

/** Capture the complete reached tree before death; detached children retain ancestry. */
export async function linuxControlTree(
  invocation: Invocation,
  outerPid: number,
): Promise<readonly ProcessIdentity[]> {
  const snapshot = await readProcessSnapshot(invocation);
  const selected = new Set<number>([outerPid]);
  let previousSize = 0;

  while (selected.size !== previousSize) {
    previousSize = selected.size;
    for (const identity of snapshot)
      if (selected.has(identity.ppid)) selected.add(identity.pid);
  }
  const tree = snapshot.filter(
    (identity) => selected.has(identity.pid) && !identity.zombie,
  );

  if (tree.some((identity) => !identity.owned || !identity.inspected))
    throw new InvocationOwnershipError(
      "Linux lifecycle tree contains an unverifiable member",
    );

  return tree;
}

export async function linuxNamespacePid(
  identity: ProcessIdentity,
): Promise<number> {
  const status = await readFile(`/proc/${identity.pid}/status`, "utf8");
  const match = /^NSpid:\s+([\d\t ]+)$/m.exec(status);

  if (!match)
    throw new Error(`Missing NSpid for lifecycle process ${identity.pid}`);

  return Number(match[1].trim().split(/\s+/).at(-1));
}
