// Deterministic PRNG so server and client render identical mock data
// (no hydration mismatch, stable demo between reloads).
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed = 0xdeb7f100) {
  const rand = mulberry32(seed);
  return {
    next: rand,
    int: (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min,
    float: (min: number, max: number) => rand() * (max - min) + min,
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)],
    bool: (p = 0.5) => rand() < p,
    // Weighted pick: items with weights.
    weighted: <T>(items: readonly { value: T; weight: number }[]): T => {
      const total = items.reduce((s, i) => s + i.weight, 0);
      let r = rand() * total;
      for (const item of items) {
        r -= item.weight;
        if (r <= 0) return item.value;
      }
      return items[items.length - 1].value;
    },
  };
}

// The ISO date the demo treats as "today".
export const TODAY = "2026-06-12";

export function isoDaysFromToday(days: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
