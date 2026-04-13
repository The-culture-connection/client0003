import 'dart:io';

import 'package:add_2_calendar/add_2_calendar.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/community_event.dart';
import '../theme/app_theme.dart';

/// Local start time from [CommunityEvent.date] and the stored [CommunityEvent.time] string.
DateTime? eventLocalStart(CommunityEvent event) {
  final d = event.date;
  if (d == null) return null;
  final day = DateTime(d.year, d.month, d.day);
  final ts = event.time.trim();
  if (ts.isEmpty) {
    return DateTime(day.year, day.month, day.day, 9, 0);
  }
  DateTime? tryParseTime(DateTime Function(DateTime base) combine) {
    try {
      final p = DateFormat.jm().parse(ts);
      return combine(p);
    } catch (_) {}
    try {
      final p = DateFormat('h:mm a', 'en_US').parse(ts);
      return combine(p);
    } catch (_) {}
    try {
      final p = DateFormat.Hm().parse(ts);
      return combine(p);
    } catch (_) {}
    return null;
  }

  final fromIntl = tryParseTime((p) => DateTime(day.year, day.month, day.day, p.hour, p.minute));
  if (fromIntl != null) return fromIntl;

  final m = RegExp(r'^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?').firstMatch(ts);
  if (m != null) {
    var hour = int.tryParse(m.group(1)!);
    final minute = int.tryParse(m.group(2)!) ?? 0;
    final ampm = m.group(4);
    if (hour != null) {
      if (ampm != null) {
        final isPm = ampm.toLowerCase() == 'pm';
        final isAm = ampm.toLowerCase() == 'am';
        if (isAm && hour == 12) hour = 0;
        if (isPm && hour < 12) hour += 12;
      }
      return DateTime(day.year, day.month, day.day, hour, minute);
    }
  }
  return DateTime(day.year, day.month, day.day, 9, 0);
}

String _escapeIcsText(String input) {
  return input
      .replaceAll('\\', '\\\\')
      .replaceAll(';', r'\;')
      .replaceAll(',', r'\,')
      .replaceAll('\r\n', '\n')
      .replaceAll('\n', r'\n');
}

String _buildIcs({
  required String calendarUid,
  required String title,
  required DateTime startLocal,
  required DateTime endLocal,
  required String description,
  required String location,
}) {
  final dt = DateFormat("yyyyMMdd'T'HHmmss");
  final stamp = DateFormat("yyyyMMdd'T'HHmmss'Z'").format(DateTime.now().toUtc());
  final lines = <String>[
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MortarAlumni//Expansion//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:$calendarUid',
    'DTSTAMP:$stamp',
    'DTSTART:${dt.format(startLocal)}',
    'DTEND:${dt.format(endLocal)}',
    'SUMMARY:${_escapeIcsText(title)}',
    if (description.isNotEmpty) 'DESCRIPTION:${_escapeIcsText(description)}',
    if (location.isNotEmpty) 'LOCATION:${_escapeIcsText(location)}',
    'BEGIN:VALARM',
    'TRIGGER:-P2D',
    'ACTION:DISPLAY',
    'DESCRIPTION:${_escapeIcsText('2 days before: $title')}',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:${_escapeIcsText('1 day before: $title')}',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return '${lines.join('\r\n')}\r\n';
}

String _googleCalendarDetails(CommunityEvent event) {
  final base = StringBuffer(event.details.trim());
  if (base.isNotEmpty) base.writeln();
  base.writeln();
  base.writeln('Reminders: add 2-day and 1-day notifications in Google Calendar if they are not imported.');
  if (event.time.trim().isNotEmpty) {
    base.writeln('Time: ${event.time.trim()}');
  }
  return base.toString();
}

Uri _googleCalendarUri(CommunityEvent event, DateTime startLocal, DateTime endLocal) {
  String fmtUtc(DateTime d) {
    final u = d.toUtc();
    String t(int n) => n.toString().padLeft(2, '0');
    return '${u.year}${t(u.month)}${t(u.day)}T${t(u.hour)}${t(u.minute)}${t(u.second)}Z';
  }

  return Uri.https('www.google.com', '/calendar/render', {
    'action': 'TEMPLATE',
    'text': event.title,
    'dates': '${fmtUtc(startLocal)}/${fmtUtc(endLocal)}',
    'details': _googleCalendarDetails(event),
    'location': event.location,
  });
}

Future<void> _shareEventIcs(CommunityEvent event, DateTime start, DateTime end) async {
  final ics = _buildIcs(
    calendarUid: '${event.id}@expansion-network.mortar',
    title: event.title,
    startLocal: start,
    endLocal: end,
    description: event.details,
    location: event.location,
  );
  final dir = await getTemporaryDirectory();
  final safeName = event.title.replaceAll(RegExp(r'[^\w\-]+'), '_').replaceAll('__', '_');
  final file = File('${dir.path}/${safeName.isEmpty ? 'event' : safeName}_${event.id}.ics');
  await file.writeAsString(ics, flush: true);
  try {
    await SharePlus.instance.share(
      ShareParams(
        files: [
          XFile(file.path, mimeType: 'text/calendar', name: '${event.title}.ics'),
        ],
        subject: event.title,
      ),
    );
  } on MissingPluginException {
    throw StateError(
      'Calendar sharing is unavailable in this emulator session. '
      'Please fully restart the app/device and try again.',
    );
  } on PlatformException {
    throw StateError(
      'Calendar sharing is unavailable in this emulator session. '
      'Please fully restart the app/device and try again.',
    );
  }
}

Future<void> _openGoogleCalendar(CommunityEvent event, DateTime start, DateTime end) async {
  final uri = _googleCalendarUri(event, start, end);
  try {
    if (await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      return;
    }
  } on MissingPluginException {
    // Fall through to share fallback when plugin channels are not initialized.
  } on PlatformException {
    // Fall through to share fallback on emulator/plugin channel issues.
  }

  try {
    await SharePlus.instance.share(
      ShareParams(
        text: uri.toString(),
        subject: 'Open in Google Calendar',
      ),
    );
    return;
  } on MissingPluginException {
    // Fall through to clipboard fallback.
  } on PlatformException {
    // Fall through to clipboard fallback.
  }

  await Clipboard.setData(ClipboardData(text: uri.toString()));
  throw StateError(
    'Could not open Google Calendar automatically in this emulator session. '
    'Calendar link copied to clipboard.',
  );
}

Event _nativeAdd2Event(CommunityEvent event, DateTime start, DateTime end) {
  final buf = StringBuffer(event.details.trim());
  if (event.time.trim().isNotEmpty) {
    if (buf.isNotEmpty) buf.writeln();
    buf.write('Time: ${event.time.trim()}');
  }
  final desc = buf.isEmpty ? 'Mortar Alumni Network event' : buf.toString();
  return Event(
    title: event.title,
    description: desc,
    location: event.location.trim().isEmpty ? null : event.location.trim(),
    startDate: start,
    endDate: end,
    iosParams: const IOSParams(
      reminder: Duration(days: 2),
    ),
    androidParams: const AndroidParams(),
  );
}

Future<bool> _tryOpenNativeCalendarAddUi(CommunityEvent event, DateTime start, DateTime end) async {
  if (kIsWeb) return false;
  if (!Platform.isIOS && !Platform.isAndroid) return false;
  try {
    return await Add2Calendar.addEvent2Cal(_nativeAdd2Event(event, start, end));
  } on MissingPluginException catch (e, st) {
    debugPrint('add_2_calendar MissingPluginException: $e\n$st');
    return false;
  } on PlatformException catch (e, st) {
    debugPrint('add_2_calendar PlatformException: $e\n$st');
    return false;
  } catch (e, st) {
    debugPrint('add_2_calendar: $e\n$st');
    return false;
  }
}

Future<void> _showLegacyCalendarChoicesBottomSheet(
  BuildContext context,
  CommunityEvent event,
  DateTime start,
  DateTime end,
) async {
  await showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    backgroundColor: AppColors.card,
    builder: (ctx) {
      final theme = Theme.of(ctx);
      final appleLabel = defaultTargetPlatform == TargetPlatform.iOS
          ? 'Apple Calendar'
          : 'Phone calendar';
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Add to calendar another way',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(
                'Share an .ics file (with 2-day and 1-day alerts) or open Google Calendar in the browser.',
                style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.mutedForeground),
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.onPrimary,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                onPressed: () async {
                  Navigator.of(ctx).pop();
                  try {
                    await _shareEventIcs(event, start, end);
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
                        SnackBar(content: Text('Could not share calendar file: $e')),
                      );
                    }
                  }
                },
                icon: const Icon(Icons.calendar_month_outlined, size: 22),
                label: Text('$appleLabel · .ics with alerts'),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  foregroundColor: AppColors.foreground,
                  side: const BorderSide(color: AppColors.border),
                ),
                onPressed: () async {
                  Navigator.of(ctx).pop();
                  try {
                    await _openGoogleCalendar(event, start, end);
                    if (context.mounted) {
                      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
                        const SnackBar(
                          content: Text(
                            'In Google Calendar, confirm notifications (e.g. 2 days and 1 day before) after saving.',
                          ),
                        ),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
                        SnackBar(content: Text('$e')),
                      );
                    }
                  }
                },
                icon: Icon(Icons.open_in_new, size: 22, color: AppColors.foreground),
                label: const Text('Google Calendar (web)'),
              ),
              const SizedBox(height: 4),
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Not now'),
              ),
            ],
          ),
        ),
      );
    },
  );
}

/// After a successful RSVP on `events_mobile`, opens the **system** add-event UI when possible
/// (iOS Calendar / Android’s calendar insert flow, usually Google Calendar on Android).
/// If that fails or the user dismisses without saving, offers .ics share + Google Calendar web.
Future<void> showPostRegisterCalendarSheet(BuildContext context, CommunityEvent event) async {
  final start = eventLocalStart(event);
  if (start == null) {
    if (context.mounted) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(content: Text('This event has no date, so calendar reminders are not available.')),
      );
    }
    return;
  }
  final end = start.add(const Duration(hours: 1));

  if (!context.mounted) return;

  final nativeOk = await _tryOpenNativeCalendarAddUi(event, start, end);
  if (nativeOk) {
    return;
  }

  if (!context.mounted) return;
  await _showLegacyCalendarChoicesBottomSheet(context, event, start, end);
}
