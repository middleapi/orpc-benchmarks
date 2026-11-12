export function sum(values: Iterable<number>): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

export function mean(values: ArrayLike<number> & Iterable<number>): number {
  return values.length === 0 ? Number.NaN : sum(values) / values.length;
}

/** Sample standard deviation. */
export function stdev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(sum(values.map((value) => (value - avg) ** 2)) / (values.length - 1));
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/** Nearest-rank percentile of a sorted array. */
export function percentile(sorted: ArrayLike<number>, p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1]!;
}

/** Milliseconds. */
export interface LatencySummary {
  mean: number;
  p50: number;
  p90: number;
  p99: number;
  p999: number;
  max: number;
}

export function summarizeLatencies(latencies: readonly number[]): LatencySummary {
  const sorted = Float64Array.from(latencies).sort();
  return {
    mean: mean(sorted),
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p99: percentile(sorted, 99),
    p999: percentile(sorted, 99.9),
    max: sorted.at(-1) ?? Number.NaN,
  };
}
