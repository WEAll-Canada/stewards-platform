/** Build a simple iCalendar feed from steward events. */

export type IcsEvent = {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIcsDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z").replace(/T/, "").slice(0, 15) + "Z";
  }
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildIcsCalendar(events: IcsEvent[], calendarName = "WeAll Canada Stewards"): string {
  const stamp = toIcsDate(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WeAll Canada//Stewards Platform//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const event of events) {
    const end = event.ends_at || event.starts_at;
    lines.push(
      "BEGIN:VEVENT",
      `UID:stewards-event-${event.id}@weallcanada.org`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toIcsDate(event.starts_at)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(event.description || "")}`,
      `LOCATION:${escapeText(event.location || "")}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
