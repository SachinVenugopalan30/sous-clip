import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A timer that only counts down while the page is visible.
 * Returns a set of active item IDs and a function to start a timer for an item.
 * When the timer completes, `onExpire` is called.
 */
export function useVisibilityTimer(
  durationMs: number,
  onExpire: (id: string) => void
) {
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, { remaining: number; startedAt: number }>>(
    new Map()
  );
  const rafRef = useRef<number | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const tick = useCallback(() => {
    if (document.visibilityState === "hidden") {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const now = Date.now();
    const expired: string[] = [];

    timersRef.current.forEach((timer, id) => {
      const elapsed = now - timer.startedAt;
      timer.remaining -= elapsed;
      timer.startedAt = now;

      if (timer.remaining <= 0) {
        expired.push(id);
      }
    });

    if (expired.length > 0) {
      expired.forEach((id) => {
        timersRef.current.delete(id);
        onExpireRef.current(id);
      });
      setActiveIds(new Set(timersRef.current.keys()));
    }

    if (timersRef.current.size > 0) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
    }
  }, []);

  // Pause/resume: when page becomes hidden, snapshot remaining time.
  // When visible again, reset startedAt so elapsed doesn't include hidden time.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        timersRef.current.forEach((timer) => {
          timer.startedAt = now;
        });
        if (timersRef.current.size > 0 && rafRef.current === null) {
          rafRef.current = requestAnimationFrame(tick);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [tick]);

  const start = useCallback(
    (id: string) => {
      timersRef.current.set(id, {
        remaining: durationMs,
        startedAt: Date.now(),
      });
      setActiveIds(new Set(timersRef.current.keys()));

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [durationMs, tick]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return { completingIds: activeIds, startTimer: start };
}
