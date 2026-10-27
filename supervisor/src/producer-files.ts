import type { HostState } from "./host-state";

import { dirname, join } from "node:path";

import { HostRuntimeEventError } from "./host-runtime-errors";

const LOG_RESERVATION_BLOCK_BYTES = 64 * 1024;

export type ProducerFiles = {
  spoolPath: string;
  tryReserveLogBytes: (bytes: number) => boolean;
  reserveTeardownLogBytes: (bytes: number) => void;
  recordLogBytes: (bytes: number) => void;
  recordSpoolBytes: (bytes: number) => void;
  finish: () => void;
  abandonUnstarted: () => void;
};

/** Reserves the reusable spool before spawning; raw-log growth is write-driven. */
export function prepareProducerFiles(input: {
  state: HostState;
  walletId: string;
  sessionId: string;
  logPath: string;
}): ProducerFiles {
  const { state, walletId, sessionId, logPath } = input;
  const logId = `log:${sessionId}`;
  const spoolId = `spool:${sessionId}`;
  const spoolPath = join(dirname(logPath), `.acp-frame-${sessionId}.tmp`);
  let logBytes = 0;
  let logCapacity = 0;

  state.reserveRuntimeFile(
    {
      fileId: logId,
      privatePath: logPath,
      temporaryPath: null,
      kind: "log",
      walletId,
      capacityBytes: 0,
      writtenBytes: 0,
      sealed: false,
    },
    { kind: "producer", walletId },
  );
  state.reserveRuntimeFile(
    {
      fileId: spoolId,
      privatePath: spoolPath,
      temporaryPath: null,
      kind: "spool",
      walletId,
      capacityBytes: 2 * 1024 * 1024,
      writtenBytes: 0,
      sealed: false,
    },
    { kind: "wallet", walletId },
  );

  const finish = (): void => {
    if (!state.runtimeStorageAvailable()) return;
    state.releaseRuntimeFile(spoolId);
    state.sealRuntimeFile(logId, logBytes);
  };

  return {
    spoolPath,
    tryReserveLogBytes(bytes) {
      try {
        if (!state.runtimeStorageAvailable())
          throw new HostRuntimeEventError(
            "runtime_storage_unavailable",
            "runtime storage requires repair before producer capture resumes",
          );
        const needed = logBytes + bytes - logCapacity;

        if (needed > 0) {
          const reserved =
            Math.ceil(needed / LOG_RESERVATION_BLOCK_BYTES) *
            LOG_RESERVATION_BLOCK_BYTES;

          state.growRuntimeFile(logId, reserved, {
            kind: "producer",
            walletId,
          });
          logCapacity += reserved;
        }

        return true;
      } catch (error) {
        if (
          error instanceof HostRuntimeEventError &&
          error.reason === "runtime_storage_pressure" &&
          state.getReceipt(walletId)?.phase !== "accepted"
        )
          return false;
        throw error;
      }
    },
    reserveTeardownLogBytes(bytes) {
      const needed = Math.max(0, logBytes + bytes - logCapacity);

      if (needed > 0) {
        state.growRuntimeFile(logId, needed, { kind: "wallet", walletId });
        logCapacity += needed;
      }
    },
    recordLogBytes(bytes) {
      logBytes += bytes;
      state.recordProducerFileBytes(logId, logBytes);
    },
    recordSpoolBytes(bytes) {
      state.recordProducerFileBytes(spoolId, bytes);
    },
    finish,
    abandonUnstarted: finish,
  };
}
