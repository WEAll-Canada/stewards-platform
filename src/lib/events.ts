import type { EventRow } from "./db";

export function eventEndMs(e: Pick<EventRow, "starts_at" | "ends_at">): number {
  if (e.ends_at) return Date.parse(e.ends_at);
  return Date.parse(e.starts_at) + 60 * 60 * 1000;
}

export function isOngoing(e: Pick<EventRow, "starts_at" | "ends_at">, now = Date.now()): boolean {
  const start = Date.parse(e.starts_at);
  return start <= now && now <= eventEndMs(e);
}

export function isToday(e: Pick<EventRow, "starts_at" | "ends_at">, now = new Date()): boolean {
  const day = now.toISOString().slice(0, 10);
  const startDay = e.starts_at.slice(0, 10);
  const endDay = (e.ends_at ?? e.starts_at).slice(0, 10);
  return startDay <= day && day <= endDay;
}

export function isUpcoming(e: Pick<EventRow, "starts_at" | "ends_at">, now = Date.now()): boolean {
  return eventEndMs(e) >= now;
}

export function formatEventWhen(e: Pick<EventRow, "starts_at" | "ends_at">): string {
  const start = e.starts_at.slice(0, 16).replace("T", " ");
  if (!e.ends_at) return `${start} UTC`;
  const end = e.ends_at.slice(0, 16).replace("T", " ");
  if (e.starts_at.slice(0, 10) === e.ends_at.slice(0, 10)) {
    return `${start}–${e.ends_at.slice(11, 16)} UTC`;
  }
  return `${start} → ${end} UTC`;
}

export function buildMonthGrid(year: number, monthIndex: number) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const startPad = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells: { date: string | null; day: number | null }[] = [];
  for (let i = 0; i < startPad; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date, day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
  return cells;
}
