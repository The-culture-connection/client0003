import 'package:add_2_calendar/add_2_calendar.dart' as add_2_calendar;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../current_conference_holder.dart';
import '../models/conference_session.dart';
import '../services/conference_repository.dart';
import '../theme/conference_colors.dart';

class ConferenceSessionDetailScreen extends StatelessWidget {
  ConferenceSessionDetailScreen({
    required this.sessionId,
    super.key,
  });

  final String sessionId;
  final ConferenceRepository _repository = ConferenceRepository();

  Future<ConferenceSession?> _fetchSession() {
    final conferenceId = CurrentConferenceHolder.instance.conferenceId;
    if (conferenceId == null) return Future.value(null);
    return _repository.fetchSession(conferenceId, sessionId);
  }

  Future<void> _addToCalendar(BuildContext context, ConferenceSession session) async {
    final start = session.startTime;
    if (start == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This session has no scheduled time yet.')),
      );
      return;
    }
    final end = session.endTime ?? start.add(const Duration(hours: 1));
    try {
      await add_2_calendar.Add2Calendar.addEvent2Cal(
        add_2_calendar.Event(
          title: session.title,
          description: session.description,
          location: session.roomLabel,
          startDate: start,
          endDate: end,
        ),
      );
    } on MissingPluginException {
      if (!context.mounted) return;
      _fallbackToClipboard(context, session, start, end);
    } on PlatformException {
      if (!context.mounted) return;
      _fallbackToClipboard(context, session, start, end);
    }
  }

  void _fallbackToClipboard(
    BuildContext context,
    ConferenceSession session,
    DateTime start,
    DateTime end,
  ) {
    final summary =
        '${session.title}\n${DateFormat('EEE, MMM d • h:mm a').format(start)} – ${DateFormat('h:mm a').format(end)}'
        '${session.roomLabel != null ? '\n${session.roomLabel}' : ''}';
    Clipboard.setData(ClipboardData(text: summary));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Calendar app unavailable — session details copied instead.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: const Text('SESSION', style: TextStyle(letterSpacing: 1)),
      ),
      body: FutureBuilder<ConferenceSession?>(
        future: _fetchSession(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator(color: ConferenceColors.gold));
          }
          final session = snapshot.data;
          if (session == null) {
            return const Center(
              child: Text('Session not found.', style: TextStyle(color: ConferenceColors.mutedForeground)),
            );
          }
          return Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  session.title,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 22),
                ),
                const SizedBox(height: 8),
                if (session.startTime != null)
                  Row(
                    children: [
                      const Icon(Icons.schedule_rounded, size: 14, color: ConferenceColors.gold),
                      const SizedBox(width: 6),
                      Text(
                        DateFormat('EEE, MMM d • h:mm a').format(session.startTime!),
                        style: const TextStyle(color: ConferenceColors.mutedForeground),
                      ),
                    ],
                  ),
                if (session.roomLabel != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.room_rounded, size: 14, color: ConferenceColors.gold),
                      const SizedBox(width: 6),
                      Text(session.roomLabel!, style: const TextStyle(color: ConferenceColors.mutedForeground)),
                    ],
                  ),
                ],
                if (session.speakerNames.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    children: [
                      for (final name in session.speakerNames)
                        Chip(
                          label: Text(name, style: const TextStyle(color: Colors.white)),
                          backgroundColor: ConferenceColors.goldAlpha(0.12),
                          side: BorderSide(color: ConferenceColors.goldAlpha(0.4)),
                        ),
                    ],
                  ),
                ],
                const SizedBox(height: 18),
                Text(session.description, style: const TextStyle(color: Colors.white, height: 1.4)),
                const SizedBox(height: 28),
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: ConferenceColors.gold,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: () => _addToCalendar(context, session),
                  icon: const Icon(Icons.calendar_month_outlined),
                  label: const Text('Add to Calendar'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
