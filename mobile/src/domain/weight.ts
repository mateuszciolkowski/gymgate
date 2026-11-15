/** Weight arithmetic in integer hundredths of a kg, matching the server's Decimal(6,2). */

/** "62.5" | 62.5 -> 6250. */
export function toHundredths(weight: string | number): number {
  return Math.round(Number(weight) * 100);
}

/** 6250 -> "62.5", 6000 -> "60" (same text Prisma Decimal produces). */
export function fromHundredths(h: number): string {
  return String(h / 100);
}

/** Canonical decimal text for storage and the wire. */
export function normalizeWeight(weight: string | number): string {
  return fromHundredths(toHundredths(weight));
}
