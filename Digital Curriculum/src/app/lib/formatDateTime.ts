/**
 * Mortar date/time display helpers (12-hour AM/PM for admin, student portal, emails).
 */

/** "09:00" / "9:00" → "9:00 AM"; "14:30" → "2:30 PM */
export function formatTime12Hour(hhmm: string): string {
  const trimmed = hhmm.trim();
  if (!trimmed) return trimmed;
  if (/\b(AM|PM)\b/i.test(trimmed)) return trimmed;

  const m = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return trimmed;

  let hours = parseInt(m[1], 10);
  const mins = m[2];
  if (Number.isNaN(hours)) return trimmed;

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${hours}:${mins} ${ampm}`;
}

/** "3/16/2026 at 09:00" → "3/16/2026 at 9:00 AM" (idempotent if already AM/PM). */
export function formatMeetingTimeLabel(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  if (/\b(AM|PM)\b/i.test(s)) return s;

  const match = s.match(/^(.+?)\s+at\s+(\d{1,2}):(\d{2})(?::\d{2})?$/i);
  if (!match) return s;

  const datePart = match[1].trim();
  const timePart = `${match[2]}:${match[3]}`;
  return `${datePart} at ${formatTime12Hour(timePart)}`;
}

export function formatAvailabilityWindowLabel(
  date: Date,
  startTime: string,
  endTime: string
): string {
  const datePart = date.toLocaleDateString("en-US");
  return `${datePart} from ${formatTime12Hour(startTime)} to ${formatTime12Hour(endTime)}`;
}

/** Build admin meeting option label: "3/16/2026 at 9:00 AM". */
export function formatMeetingOptionLabel(date: Date, hours24: number, minutes: number): string {
  const datePart = date.toLocaleDateString("en-US");
  const hh = String(hours24).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${datePart} at ${formatTime12Hour(`${hh}:${mm}`)}`;
}
