"use client";

import { useSyncExternalStore } from "react";

const subscribe = (): (() => void) => () => {};

/**
 * False on the server and during hydration, true once the client has taken
 * over — so browser-only values (navigator, localStorage) can be read without a
 * hydration mismatch or a setState-in-effect round trip.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
