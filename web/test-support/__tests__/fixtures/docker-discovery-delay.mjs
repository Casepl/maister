// Preloaded into the probe child. Testcontainers resolves the runtime host's
// IPs (node:dns/promises lookup) after the daemon has answered, as part of SDK
// client construction; delaying the first lookup makes that real discovery
// step slow without touching the daemon contact the short guard measures.
import { appendFileSync } from "node:fs";
import { createRequire } from "node:module";

const evidence = process.env.MAISTER_DOCKER_CONTROL_EVIDENCE;
const delayMs = Number(process.env.MAISTER_DOCKER_CONTROL_DELAY_MS);

if (
  !evidence ||
  !Number.isInteger(delayMs) ||
  delayMs < 1 ||
  delayMs > 35_000
)
  throw new Error(
    "real SDK discovery control requires its evidence path and delay",
  );

const dns = createRequire(import.meta.url)("node:dns/promises");
const lookup = dns.lookup;
let delayed = false;

dns.lookup = async (...args) => {
  if (!delayed) {
    delayed = true;
    const startedAt = Date.now();

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    appendFileSync(
      evidence,
      `${JSON.stringify({ event: "real-host-discovery", delayMs: Date.now() - startedAt })}\n`,
    );
  }

  return lookup(...args);
};
