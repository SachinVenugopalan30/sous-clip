import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";

const TICK_MS = 250;

/** Subtract `dt` from every timer in place; delete and return the ids that ran out. */
export function advanceTimers(timers: Map<string, number>, dt: number): string[] {
  const expired: string[] = [];
  for (const [id, remaining] of timers) {
    if (remaining - dt <= 0) expired.push(id);
    else timers.set(id, remaining - dt);
  }
  expired.forEach((id) => timers.delete(id));
  return expired;
}

/**
 * Gives each started id `durationMs` of VISIBLE page time (hidden-tab time doesn't count),
 * then drops it from `completingIds` and calls `onExpire(id)`.
 */
export function useVisibilityTimer(durationMs: number, onExpire: (id: string) => void) {
  const timers = useRef(new Map<string, number>());
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const expire = useEffectEvent(onExpire);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const expired = advanceTimers(timers.current, TICK_MS);
      if (expired.length === 0) return;
      setCompletingIds(new Set(timers.current.keys()));
      expired.forEach(expire);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const startTimer = useCallback(
    (id: string) => {
      timers.current.set(id, durationMs);
      setCompletingIds(new Set(timers.current.keys()));
    },
    [durationMs]
  );

  return { completingIds, startTimer };
}
