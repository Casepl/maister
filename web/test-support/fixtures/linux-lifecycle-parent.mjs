import {
  decodeLinuxCommand,
  decodeLinuxIsolationPolicy,
} from "../linux-isolation-protocol.ts";
import { startLinuxControlProcess } from "../linux-lifecycle-controls.ts";

if (!process.send)
  throw new Error("Linux lifecycle parent requires private IPC");
const policy = decodeLinuxIsolationPolicy(process.argv[2] ?? "");
const command = decodeLinuxCommand(process.argv[3] ?? "");
const control = await startLinuxControlProcess(policy, command);

process.stdout.write(control.stdout());
process.stderr.write(control.stderr());
control.child.stdout.pipe(process.stdout);
control.child.stderr.pipe(process.stderr);
process.send({ event: "linux-outer-started", pid: control.identity.pid });
await control.observation.ready;
process.send({ event: "linux-application-ready" });
const outcome = await control.observation.outcome;

throw new Error(
  `Linux lifecycle application exited before parent death: ${JSON.stringify(outcome)}`,
);
