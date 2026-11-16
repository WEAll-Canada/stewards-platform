/** Admin analytics helpers — Festival-inspired ranges + Stewards-specific metrics. */

export type AnalyticsRange = "7d" | "30d" | "90d" | "all";

export type TimeseriesPoint = { date: string; value: number };

export type NamedCount = { label: string; count: number };

export function parseAnalyticsRange(raw: string | null): AnalyticsRange {
  if (raw === "7d" || raw === "90d" || raw === "all") return raw;
  return "30d";
}

export function rangeStartIso(range: AnalyticsRange, now = new Date()): string | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const start = new Date(now.getTime() - (days - 1) * 86_400_000);
  return start.toISOString().slice(0, 10) + "T00:00:00Z";
}

export function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function enumerateDays(startKey: string, endKeyInclusive: string): string[] {
  const out: string[] = [];
  let cursor = startKey;
  while (cursor <= endKeyInclusive) {
    out.push(cursor);
    const d = new Date(`${cursor}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return out;
}

export function fillTimeseries(
  rows: { day: string; value: number }[],
  startKey: string,
  endKey: string,
): TimeseriesPoint[] {
  const map = new Map(rows.map((r) => [r.day.slice(0, 10), Number(r.value) || 0]));
  return enumerateDays(startKey, endKey).map((date) => ({
    date,
    value: map.get(date) ?? 0,
  }));
}

export function maxSeriesValue(series: TimeseriesPoint[]): number {
  return Math.max(1, ...series.map((p) => p.value));
}
