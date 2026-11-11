export function sum(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

export function mean(values: readonly number[]): number {
  return values.length === 0 ? Number.NaN : sum(values) / values.length;
}

/** Sample standard deviation. */
export function stdev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  let squares = 0;
  for (const value of values) squares += (value - avg) ** 2;
  return Math.sqrt(squares / (values.length - 1));
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/** Nearest-rank percentile of an already sorted array. */
export function percentile(sorted: ArrayLike<number>, p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1]!;
}

export interface LatencySummary {
  /** All values in milliseconds. */
  mean: number;
  p50: number;
  p90: number;
  p99: number;
  p999: number;
  max: number;
}

/** Summarises latency samples given in microseconds; the result is in milliseconds. */
export function summarizeLatencies(samplesUs: Float64Array): LatencySummary {
  const sorted = samplesUs.slice().sort();
  const toMs = (us: number) => us / 1000;
  let total = 0;
  for (const value of sorted) total += value;

  return {
    mean: toMs(total / sorted.length),
    p50: toMs(percentile(sorted, 50)),
    p90: toMs(percentile(sorted, 90)),
    p99: toMs(percentile(sorted, 99)),
    p999: toMs(percentile(sorted, 99.9)),
    max: toMs(sorted[sorted.length - 1] ?? Number.NaN),
  };
}
