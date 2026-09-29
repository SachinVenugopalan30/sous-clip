const FRACTIONS: Record<string, number> = { "⅛": 1 / 8, "¼": 1 / 4, "⅓": 1 / 3, "½": 1 / 2, "⅔": 2 / 3, "¾": 3 / 4 };
const CLOSE = 0.02;

// "2", "0.5", "1/2", "1 1/2", "½", "1½" → number; anything else (ranges, "pinch") → null
function parseQuantity(quantity: string): number | null {
  const m = quantity.trim().match(/^(\d+(?:\.\d+)?)?\s*(?:(\d+)\/(\d+)|([⅛¼⅓½⅔¾]))?$/);
  if (!m || !(m[1] || m[2] || m[4])) return null;
  const n = Number(m[1] ?? 0) + (m[2] ? Number(m[2]) / Number(m[3]) : 0) + (m[4] ? FRACTIONS[m[4]] : 0);
  return Number.isFinite(n) ? n : null;
}

function formatQuantity(n: number): string {
  const rounded = Math.round(n);
  if (rounded > 0 && Math.abs(n - rounded) < CLOSE) return String(rounded);
  const whole = Math.floor(n);
  const symbol = Object.keys(FRACTIONS).find((s) => Math.abs(n - whole - FRACTIONS[s]) < CLOSE);
  if (symbol) return whole ? `${whole}${symbol}` : symbol;
  return String(Math.round(n * 100) / 100);
}

export function scaleQuantity(quantity: string | null, factor: number): string | null {
  if (quantity === null || factor === 1) return quantity;
  const n = parseQuantity(quantity);
  return n === null ? quantity : formatQuantity(n * factor);
}
