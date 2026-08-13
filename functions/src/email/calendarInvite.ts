/**
 * iCalendar (.ics) attachments for Mortar emails.
 *
 * Beta feedback on the graduation meeting email: "It mentions to 'put the
 * meeting on your calendar'. Is it possible to make this a calendar invite
 * already, to automatically place the meeting on the recipient's calendar?"
 * Attaching an .ics does exactly that — Gmail, Outlook and Apple Mail all offer
 * a one-tap Add to calendar for it.
 *
 * The meeting time is stored as a display string ("3/16/2026 at 09:00"), not a
 * timestamp, and graduation meetings are booked 9am–5pm Eastern on weekdays, so
 * the wall-clock time is interpreted in `America/New_York` and emitted with a
 * TZID plus a VTIMEZONE block. That keeps the invite correct in the recipient's
 * own timezone without pinning a UTC offset that would be an hour out for half
 * the year.
 */

/** How long a graduation meeting is blocked out for. */
const MEETING_MINUTES = Number(process.env.GRADUATION_MEETING_MINUTES?.trim() || "30");

const TZID = "America/New_York";

export type CalendarAttachment = {
  name: string;
  /** base64-encoded file content, as Brevo's `attachment[].content` expects. */
  base64: string;
};

type ParsedMeeting = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
};

/**
 * Parses the stored meeting string. Accepts the 24-hour form written by the
 * admin panel ("3/16/2026 at 09:00") and the 12-hour form that reaches the
 * field through the legacy `notes` path ("3/16/2026 at 9:00 AM").
 *
 * Returns null for anything else — a malformed string must not turn into a
 * confidently-wrong calendar entry.
 */
export function parseMeetingTime(raw: string): ParsedMeeting | null {
  const s = raw.trim();
  if (!s) return null;

  const m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+at\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i
  );
  if (!m) return null;

  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  let hour = Number(m[4]);
  const minute = Number(m[5]);
  const meridiem = m[6]?.toUpperCase();

  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59) return null;

  return {year, month, day, hour, minute};
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

/** Local date-time in iCalendar form: `YYYYMMDDTHHMMSS` (no trailing Z). */
function localStamp(p: ParsedMeeting): string {
  return `${p.year}${pad(p.month)}${pad(p.day)}T${pad(p.hour)}${pad(p.minute)}00`;
}

/** Adds whole minutes to a parsed wall-clock time, rolling the date over. */
function addMinutes(p: ParsedMeeting, minutes: number): ParsedMeeting {
  // Date arithmetic in UTC so the host machine's timezone never shifts the
  // result; these are wall-clock components, not an instant.
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute));
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

/** RFC 5545 escaping for TEXT values. Order matters: backslash first. */
function escapeText(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * RFC 5545 content-line folding: no line may exceed 75 octets, and a
 * continuation begins with a single space. Measured in UTF-8 bytes, and never
 * split mid-character, so a name or note with an accent or emoji in it stays
 * intact.
 */
function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  // 75 for the first line, 74 thereafter (the leading space counts).
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Back off until `end` sits on a UTF-8 character boundary (continuation
    // bytes match 0b10xxxxxx).
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) {
      end--;
    }
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74;
  }
  return parts.join("\r\n ");
}

/**
 * US Eastern DST rules (second Sunday in March / first Sunday in November),
 * which have been stable since 2007. Without this block, clients that don't
 * already know the zone would fall back to floating time.
 */
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "DTSTART:20070311T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "DTSTART:20071104T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

/**
 * Builds the graduation-meeting invite. Returns null when [meetingTime] cannot
 * be parsed, so the caller can still send the email without an attachment.
 *
 * [uid] makes the event's UID stable per application: re-sending replaces the
 * entry on the recipient's calendar instead of creating a duplicate.
 */
export function buildGraduationMeetingIcs(input: {
  meetingTime: string;
  applicationId: string;
  attendeeEmail: string;
  attendeeName?: string;
  organizerEmail: string;
  organizerName?: string;
  notes?: string | null;
  /** Overrides the generated timestamp; tests pass a fixed value. */
  now?: Date;
}): CalendarAttachment | null {
  const start = parseMeetingTime(input.meetingTime);
  if (!start) return null;
  const end = addMinutes(start, MEETING_MINUTES);

  const now = input.now ?? new Date();
  const dtstamp =
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const description = [
    "Your MORTAR graduation meeting.",
    input.notes?.trim() ? input.notes.trim() : null,
    "Check your email for the meeting link and anything you need to bring.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MORTAR//Digital Curriculum//EN",
    "CALSCALE:GREGORIAN",
    // REQUEST (not PUBLISH) is what makes mail clients render the
    // accept/decline invitation card rather than a plain file attachment.
    "METHOD:REQUEST",
    ...VTIMEZONE,
    "BEGIN:VEVENT",
    `UID:graduation-${input.applicationId}@wearemortar.com`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=${TZID}:${localStamp(start)}`,
    `DTEND;TZID=${TZID}:${localStamp(end)}`,
    "SUMMARY:MORTAR graduation meeting",
    `DESCRIPTION:${escapeText(description)}`,
    `ORGANIZER;CN=${escapeText(input.organizerName || "MORTAR")}:mailto:${input.organizerEmail}`,
    "ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE" +
      `;CN=${escapeText(input.attendeeName || input.attendeeEmail)}:mailto:${input.attendeeEmail}`,
    "STATUS:CONFIRMED",
    // Sequence 0: this is the first issue of the invite. Bump it if a meeting
    // is ever rescheduled through the same UID.
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:MORTAR graduation meeting in 30 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // RFC 5545 requires CRLF line endings and 75-octet folding; Outlook in
  // particular is strict, and DESCRIPTION routinely runs past the limit.
  const ics = `${lines.map(foldLine).join("\r\n")}\r\n`;
  return {
    name: "mortar-graduation-meeting.ics",
    base64: Buffer.from(ics, "utf8").toString("base64"),
  };
}
