import { decodeLinuxIsolationPolicy } from "../linux-isolation-protocol.ts";
import {
  probeFilesystemAccess,
  resolveIsolationDriver,
} from "../process-isolation.ts";

const policy = decodeLinuxIsolationPolicy(process.argv[2] ?? "");
const target = process.argv[3];
const port = Number(process.argv[4]);

if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Linux probe parent requires a valid readiness port");
const driver = resolveIsolationDriver();
/** @type {import('../process-isolation.ts').IsolationDriver} */
const heldProbe = {
  ...driver,
  wrap(command, deniedRoots, immutablePolicy) {
    if (command[1] !== "-e") throw new Error("Unexpected access probe command");
    return driver.wrap(
      [
        command[0],
        "-e",
        `${command[2]};
       const socket = require("node:net").connect(${port}, "127.0.0.1");
       socket.once("error", error => { throw error; });
       socket.once("connect", () => socket.end("linux-probe-held\\n"));
       setInterval(() => {}, 1000);`,
        ...command.slice(3),
      ],
      deniedRoots,
      immutablePolicy,
    );
  },
};

await probeFilesystemAccess(heldProbe, policy.deniedRoots, target, policy);
throw new Error("Held access probe completed before parent death");
