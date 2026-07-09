import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../models/conference.dart';
import '../theme/conference_colors.dart';

/// Adds a conference to the user's calendar with **two reminders** — 1 week and
/// 2 days before it starts.
///
/// We generate an iCalendar (`.ics`) file with two `VALARM` components and hand
/// it to the OS "Add to Calendar" handler via the share sheet. This is the only
/// cross-platform way to set *two* reminders — `add_2_calendar` supports at most
/// a single iOS reminder and none on Android.

String _icsUtc(DateTime d) {
  final u = d.toUtc();
  String two(int n) => n.toString().padLeft(2, '0');
  return '${u.year}${two(u.month)}${two(u.day)}T${two(u.hour)}${two(u.minute)}${two(u.second)}Z';
}

String _icsEscape(String s) => s
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\n', '\\n');

/// Builds the `.ics` payload for [c] with 1-week and 2-day reminders.
String buildConferenceIcs(Conference c) {
  final start = c.startDate ?? DateTime.now().add(const Duration(days: 7));
  final end = c.endDate ?? start.add(const Duration(hours: 2));
  final uid = 'conference-${c.id}@mortar';
  final description = c.description.trim().isEmpty
      ? 'Your Mortar conference. Your Conference Center code unlocks entry during the event.'
      : c.description.trim();

  final b = StringBuffer()
    ..writeln('BEGIN:VCALENDAR')
    ..writeln('VERSION:2.0')
    ..writeln('PRODID:-//Mortar//Conference Center//EN')
    ..writeln('CALSCALE:GREGORIAN')
    ..writeln('METHOD:PUBLISH')
    ..writeln('BEGIN:VEVENT')
    ..writeln('UID:$uid')
    ..writeln('DTSTAMP:${_icsUtc(DateTime.now())}')
    ..writeln('DTSTART:${_icsUtc(start)}')
    ..writeln('DTEND:${_icsUtc(end)}')
    ..writeln('SUMMARY:${_icsEscape(c.name)}')
    ..writeln('DESCRIPTION:${_icsEscape(description)}');
  final location = c.location?.trim();
  if (location != null && location.isNotEmpty) {
    b.writeln('LOCATION:${_icsEscape(location)}');
  }
  // Reminder 1: one week before.
  b
    ..writeln('BEGIN:VALARM')
    ..writeln('ACTION:DISPLAY')
    ..writeln('DESCRIPTION:${_icsEscape('${c.name} is one week away')}')
    ..writeln('TRIGGER:-P1W')
    ..writeln('END:VALARM')
    // Reminder 2: two days before.
    ..writeln('BEGIN:VALARM')
    ..writeln('ACTION:DISPLAY')
    ..writeln('DESCRIPTION:${_icsEscape('${c.name} is in 2 days')}')
    ..writeln('TRIGGER:-P2D')
    ..writeln('END:VALARM')
    ..writeln('END:VEVENT')
    ..writeln('END:VCALENDAR');
  return b.toString();
}

/// Writes the `.ics` and opens the OS share/add-to-calendar handler.
Future<void> addConferenceToCalendar(Conference c) async {
  final ics = buildConferenceIcs(c);
  final dir = await getTemporaryDirectory();
  final safeName = c.name.replaceAll(RegExp(r'[^A-Za-z0-9]+'), '_');
  final file = File('${dir.path}/conference_$safeName.ics');
  await file.writeAsString(ics);
  await SharePlus.instance.share(
    ShareParams(
      files: [XFile(file.path, mimeType: 'text/calendar')],
      subject: c.name,
    ),
  );
}

/// Bottom-sheet prompt offering to add the conference to the user's calendar.
Future<void> showAddToCalendarSheet(BuildContext context, Conference c) {
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: ConferenceColors.atmosphere,
    isScrollControlled: false,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => _AddToCalendarSheet(conference: c),
  );
}

class _AddToCalendarSheet extends StatefulWidget {
  const _AddToCalendarSheet({required this.conference});

  final Conference conference;

  @override
  State<_AddToCalendarSheet> createState() => _AddToCalendarSheetState();
}

class _AddToCalendarSheetState extends State<_AddToCalendarSheet> {
  bool _busy = false;

  Future<void> _add() async {
    setState(() => _busy = true);
    try {
      await addConferenceToCalendar(widget.conference);
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open the calendar. Please try again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.conference;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: ConferenceColors.goldAlpha(0.14),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: ConferenceColors.gold, width: 1.4),
                  ),
                  child: const Icon(Icons.event_available_rounded, color: ConferenceColors.gold),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Add to your calendar',
                        style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        c.name,
                        style: const TextStyle(color: ConferenceColors.gold, fontSize: 13, fontWeight: FontWeight.w600),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
              decoration: BoxDecoration(
                color: ConferenceColors.goldAlpha(0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: ConferenceColors.goldAlpha(0.2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.notifications_active_rounded, size: 18, color: ConferenceColors.gold),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      "We'll remind you 1 week and 2 days before it starts.",
                      style: TextStyle(color: Colors.grey.shade300, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 52,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: ConferenceColors.gold,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: _busy ? null : _add,
                child: _busy
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                      )
                    : const Text('Add to calendar', style: TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _busy ? null : () => Navigator.of(context).pop(),
              style: TextButton.styleFrom(foregroundColor: Colors.grey.shade400),
              child: const Text('Maybe later'),
            ),
          ],
        ),
      ),
    );
  }
}
