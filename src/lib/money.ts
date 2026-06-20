// Money is integer cents stored as BigInt (CLAUDE.md rule #2). Convert at the
// UI edge only. Cents fit safely in a JS double up to ~$90 trillion, so Number()
// is safe for formatting real-world amounts.

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Cents = bigint | number | null | undefined;

function toNum(cents: Cents): number {
  if (cents === null || cents === undefined) return 0;
  return typeof cents === "bigint" ? Number(cents) : cents;
}

/** Dollars (UI input) → integer cents (BigInt for storage). */
export function toCents(dollars: number): bigint {
  return BigInt(Math.round(dollars * 100));
}

/** Integer cents → dollars number (UI edge only). */
export function toDollars(cents: Cents): number {
  return toNum(cents) / 100;
}

/** Format integer cents as "$1,234.56". */
export function fmtUSD(cents: Cents): string {
  return USD.format(toNum(cents) / 100);
}

/** Compact money for tiles: $1.2M, $45.0K. */
export function fmtUSDCompact(cents: Cents): string {
  const d = toNum(cents) / 100;
  if (Math.abs(d) >= 1_000_000) return `$${(d / 1_000_000).toFixed(1)}M`;
  if (Math.abs(d) >= 1_000) return `$${(d / 1_000).toFixed(1)}K`;
  return `$${d.toFixed(0)}`;
}

/** Sum a list of BigInt cents safely. */
export function sumCents(values: Cents[]): bigint {
  return values.reduce<bigint>((s, v) => s + BigInt(toNum(v)), 0n);
}

/** Factor rate / holdback are Decimals (not loan rates). Format as 1.49 / 12%. */
export function fmtFactor(factor: number | string | null | undefined): string {
  if (factor === null || factor === undefined) return "—";
  return Number(factor).toFixed(2);
}

export function fmtPct(fraction: number | string | null | undefined, digits = 1): string {
  if (fraction === null || fraction === undefined) return "—";
  return `${(Number(fraction) * 100).toFixed(digits)}%`;
}
