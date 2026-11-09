export const REVEAL_PX = 8;
export type BarScroll = { y: number; travel: number; hidden: boolean };

/** Hide after scrolling down past the bar; show again after REVEAL_PX of upward travel. y is clamped to [0, maxY] (iOS rubber-band). */
export function nextBar(s: BarScroll, rawY: number, barH: number, maxY: number): BarScroll {
  const y = Math.min(Math.max(rawY, 0), Math.max(maxY, 0));
  const d = y - s.y;
  if (d === 0) return s;
  const travel = Math.sign(d) === Math.sign(s.travel) ? s.travel + d : d;
  const hidden = y <= barH ? false : travel > 0 ? true : travel <= -REVEAL_PX ? false : s.hidden;
  return { y, travel, hidden };
}
