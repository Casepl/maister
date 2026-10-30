"use client";

import type { RefObject } from "react";

import { useLayoutEffect, useRef } from "react";

/**
 * A ref that always holds the latest committed `value`, for effects and event
 * handlers that must not re-subscribe when a callback prop changes identity.
 * Published in a layout effect (never during render), so it is current before
 * any passive effect or user event reads it.
 */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);

  useLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
}
