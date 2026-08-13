/**
 * RFC 5545 iCalendar builder for the graduation (alumni pitch) meeting invite.
 * No dependencies: plain-string VCALENDAR with CRLF line endings, 75-octet
 * line folding, and TEXT escaping per the spec.
 */

const CRLF = "\r\n";

/** Escape RFC 5545 TEXT values: backslash, semicolon, comma, newline (§3.3.11). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Fold a content line to at most 75 octets per physical line (RFC 5545 §3.1).
 * Continuation lines start with one space, which counts toward their 75 octets.
 * Splits are byte-aware so multi-byte UTF-8 characters are never cut in half.
 */
export function foldIcsLine(line: string): string {
  const firstLimit = 75;
  const continuationLimit = 74; // leaves room for the leading space octet
  if (Buffer.byteLength(line, "utf8") <= firstLimit) return line;

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  let limit = firstLimit;
  for (const ch of line) {
    const chBytes = Buffer.byteLength(ch, "utf8");
    if (currentBytes + chBytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
      limit = continuationLimit;
    }
    current += ch;
    currentBytes += chBytes;
  }
  if (current) parts.push(current);
  return parts.map((part, i) => (i === 0 ? part : ` ${part}`)).join(CRLF);
}

/**
 * US Eastern DST rule (Energy Policy Act of 2005, in effect since 2007):
 * daylight time starts at 2:00 AM local on the second Sunday of March and
 * ends at 2:00 AM local on the first Sunday of November. Graduation meetings
 * are booked Mon–Fri 9am–5pm ET, so the 1–3 AM boundary ambiguity never
 * applies in practice; the hour is still checked for completeness.
 */
function isEasternDaylightTime(year: number, month: number, day: number, hours: number): boolean {
  if (month > 3 && month < 11) return true;
  if (month < 3 || month > 11) return false;

  const nthSundayOfMonth = (m: number, n: number): number => {
    const firstDow = new Date(Date.UTC(year, m - 1, 1)).getUTCDay(); // 0 = Sunday
    const firstSunday = 1 + ((7 - firstDow) % 7);
    return firstSunday + (n - 1) * 7;
  };

  if (month === 3) {
    const dstStartDay = nthSundayOfMonth(3, 2);
    if (day !== dstStartDay) return day > dstStartDay;
    return hours >= 2;
  }
  const dstEndDay = nthSundayOfMonth(11, 1);
  if (day !== dstEndDay) return day < dstEndDay;
  return hours < 2;
}

/**
 * Parse a graduation `selectedTime` string into an absolute UTC instant.
 *
 * The admin UI stores wall-clock strings, not timestamps: new values look like
 * "3/16/2026 at 9:00 AM" (formatMeetingOptionLabel) and legacy values like
 * "3/16/2026 at 09:00" (24-hour). Availability is collected as Mon–Fri
 * 9am–5pm Eastern, so the wall clock is interpreted in America/New_York and
 * converted to UTC using the US DST rule above (EDT = UTC-4, EST = UTC-5).
 * Returns null when the string doesn't match either format.
 */
export function parseEasternMeetingTime(raw: string): Date | null {
  const m = raw
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+at\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!m) return null;

  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  let hours = Number(m[4]);
  const minutes = Number(m[5]);
  const ampm = m[6]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23 || minutes > 59) {
    return null;
  }

  const offsetHours = isEasternDaylightTime(year, month, day, hours) ? 4 : 5;
  return new Date(Date.UTC(year, month - 1, day, hours + offsetHours, minutes, 0));
}

/** "20260316T140000Z" — RFC 5545 UTC date-time. */
function formatUtcDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/**
 * Build the .ics attachment for the graduation meeting confirmation email.
 *
 * METHOD:PUBLISH (a plain "add to your calendar" event, not an RSVP request —
 * replies would otherwise route to an unmonitored organizer mailbox), so per
 * RFC 5546 the VEVENT carries no ORGANIZER/ATTENDEE properties.
 *
 * Sanity check (unit-style): for applicationId "app1",
 * startUtc = 2026-03-16T13:00:00Z ("3/16/2026 at 9:00 AM" EDT), the output
 * contains "DTSTART:20260316T130000Z", "DTEND:20260316T133000Z",
 * "UID:app1@mortar", "METHOD:PUBLISH", and every line ends with CRLF.
 */
export function buildGraduationMeetingIcs(input: {
  applicationId: string;
  startUtc: Date;
  /** Meeting length; the admin picks from a 30-minute slot grid, so 30 by default. */
  durationMinutes?: number;
  /** Deep link to the Curriculum page's Alumni Application section. */
  applicationUrl?: string;
}): string {
  const durationMinutes = input.durationMinutes ?? 30;
  const endUtc = new Date(input.startUtc.getTime() + durationMinutes * 60_000);
  const description =
    "The MORTAR Alumni Manager will meet with you to review your graduation " +
    "application and talk through your next steps as an alumni candidate." +
    (input.applicationUrl ? `\nView your application: ${input.applicationUrl}` : "");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MORTAR//Digital Curriculum//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(input.applicationId)}@mortar`,
    `DTSTAMP:${formatUtcDateTime(new Date())}`,
    `DTSTART:${formatUtcDateTime(input.startUtc)}`,
    `DTEND:${formatUtcDateTime(endUtc)}`,
    "SUMMARY:MORTAR Alumni Pitch Meeting",
    `DESCRIPTION:${escapeIcsText(description)}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:MORTAR Alumni Pitch Meeting in 30 minutes",
    "TRIGGER:-PT30M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}
