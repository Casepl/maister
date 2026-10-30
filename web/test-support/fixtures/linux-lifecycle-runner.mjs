import { spawn } from "node:child_process";

import {
  decodeLinuxCommand,
  decodeLinuxIsolationPolicy,
} from "../linux-isolation-protocol.ts";
import {
  fixtureProcessEnvironment,
  processIdentity,
  registerSpawnedProcess,
} from "../process-invocation.ts";

if (!process.send)
  throw new Error("Linux lifecycle runner requires private IPC");
const policy = decodeLinuxIsolationPolicy(process.argv[2] ?? "");
const command = decodeLinuxCommand(process.argv[3] ?? "");
const invocation = policy.invocation;
const identity = await processIdentity(invocation, process.pid);
const child = spawn(command[0], command.slice(1), {
  env: {
    ...process.env,
    ...(await fixtureProcessEnvironment(invocation)),
    MAISTER_TEST_PROCESS_OWNER: JSON.stringify(identity),
  },
  detached: true,
  stdio: ["ignore", "pipe", "pipe", "ipc"],
});
const closed = new Promise((resolve) => child.once("close", resolve));

child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
child.on("message", (message) => process.send(message));
await registerSpawnedProcess(
  invocation,
  {
    role: "fixture",
    caseName: "LI-parent",
    rootRole: "linux-worker",
    root: policy.cwd,
    bootId: String(child.pid),
    logFile: null,
  },
  child,
);
process.send({ event: "linux-worker-started", pid: child.pid });
await closed;
// Worker-death is an intentional cut; the outer must observe it independently.
process.send({ event: "linux-worker-exited" });
setInterval(() => {}, 1000);
