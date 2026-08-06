import 'dart:async';

import 'package:add_2_calendar/add_2_calendar.dart' as add_2_calendar;
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../conference_analytics.dart';
import '../../services/expansion_session_service.dart'
    show userMessageForFirebaseCallableError;
import '../current_conference_holder.dart';
import '../models/conference_session.dart';
import '../services/conference_repository.dart';
import '../services/conference_session_service.dart';
import '../theme/conference_colors.dart';
import '../../theme/cosmic_content.dart';

class ConferenceSessionDetailScreen extends StatefulWidget {
  const ConferenceSessionDetailScreen({required this.sessionId, super.key});

  final String sessionId;

  @override
  State<ConferenceSessionDetailScreen> createState() => _ConferenceSessionDetailScreenState();
}

class _ConferenceSessionDetailScreenState extends State<ConferenceSessionDetailScreen> {
  final ConferenceRepository _repository = ConferenceRepository();
  final ConferenceSessionService _service = ConferenceSessionService();

  String? get _conferenceId => CurrentConferenceHolder.instance.conferenceId;
  String? get _uid => FirebaseAuth.instance.currentUser?.uid;

  Set<String> _savedIds = {};
  StreamSubscription<Set<String>>? _savedSub;
  bool _rsvpBusy = false;

  @override
  void initState() {
    super.initState();
    logConferenceEvent(
      () => ConferenceAnalytics.sessionViewed(sessionId: widget.sessionId),
    );
    final cid = _conferenceId;
    if (cid != null) {
      _savedSub = _service.watchSavedSessionIds(cid).listen((ids) {
        if (mounted) setState(() => _savedIds = ids);
      });
    }
  }

  @override
  void dispose() {
    _savedSub?.cancel();
    super.dispose();
  }

  Future<void> _toggleRsvp(ConferenceSession session) async {
    final cid = _conferenceId;
    if (cid == null) return;
    setState(() => _rsvpBusy = true);
    try {
      final going = !session.isGoing(_uid);
      await _service.setRsvp(conferenceId: cid, sessionId: session.id, going: going);
      logConferenceEvent(() => ConferenceAnalytics.sessionRsvpChanged(
            sessionId: session.id,
            going: going,
          ));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(userMessageForFirebaseCallableError(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _rsvpBusy = false);
    }
  }

  Future<void> _toggleSave(ConferenceSession session) async {
    final cid = _conferenceId;
    if (cid == null) return;
    try {
      final saved = !_savedIds.contains(session.id);
      await _service.setSaved(conferenceId: cid, session: session, saved: saved);
      logConferenceEvent(() => ConferenceAnalytics.sessionSaved(
            sessionId: session.id,
            saved: saved,
          ));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(userMessageForFirebaseCallableError(e))),
        );
      }
    }
  }

  Future<void> _addToCalendar(ConferenceSession session) async {
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
      if (mounted) _fallbackToClipboard(session, start, end);
    } on PlatformException {
      if (mounted) _fallbackToClipboard(session, start, end);
    }
  }

  void _fallbackToClipboard(ConferenceSession session, DateTime start, DateTime end) {
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
    final cid = _conferenceId;
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: ConferenceColors.gold,
        title: const Text('SESSION', style: TextStyle(letterSpacing: 1)),
      ),
      body: cid == null
          ? const Center(
              child: Text('No conference selected.', style: TextStyle(color: ConferenceColors.mutedForeground)))
          : StreamBuilder<ConferenceSession?>(
              stream: _repository.watchSession(cid, widget.sessionId),
              builder: (context, snapshot) {
                if (!snapshot.hasData && snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: ConferenceColors.gold));
                }
                final session = snapshot.data;
                if (session == null) {
                  return const Center(
                    child: Text('Session not found.', style: TextStyle(color: ConferenceColors.mutedForeground)),
                  );
                }
                return _buildBody(session);
              },
            ),
    );
  }

  Widget _buildBody(ConferenceSession session) {
    final going = session.isGoing(_uid);
    final saved = _savedIds.contains(session.id);
    final full = !going && session.isFull;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (session.track != null && session.track!.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: ConferenceColors.goldAlpha(0.12),
                borderRadius: Cosmic.chipRadius,
                border: Border.all(color: ConferenceColors.goldAlpha(0.25)),
              ),
              child: Text(session.track!.toUpperCase(),
                  style: const TextStyle(color: ConferenceColors.gold, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
            ),
            const SizedBox(height: 12),
          ],
          Text(session.title,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 22)),
          const SizedBox(height: 10),
          if (session.startTime != null)
            _metaRow(Icons.schedule_rounded, DateFormat('EEE, MMM d • h:mm a').format(session.startTime!)),
          if (session.roomLabel != null) _metaRow(Icons.room_rounded, session.roomLabel!),
          _metaRow(Icons.people_alt_rounded,
              session.capacity != null && session.capacity! > 0
                  ? '${session.goingCount}/${session.capacity} going'
                  : '${session.goingCount} going'),
          if (session.speakerNames.isNotEmpty) ...[
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
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
          if (session.speakerTitle != null && session.speakerTitle!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(session.speakerTitle!, style: const TextStyle(color: ConferenceColors.mutedForeground)),
          ],
          if (session.description.trim().isNotEmpty) ...[
            const SizedBox(height: 18),
            Text(session.description, style: const TextStyle(color: Colors.white, height: 1.4)),
          ],
          const SizedBox(height: 24),

          // Primary actions: RSVP + Save.
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: going ? ConferenceColors.gold : ConferenceColors.goldAlpha(0.16),
                    foregroundColor: going ? Colors.black : ConferenceColors.gold,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: Cosmic.chipRadius,
                      side: BorderSide(color: ConferenceColors.goldAlpha(0.5)),
                    ),
                  ),
                  onPressed: _rsvpBusy || full ? null : () => _toggleRsvp(session),
                  icon: _rsvpBusy
                      ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: ConferenceColors.gold))
                      : Icon(going ? Icons.check_circle_rounded : Icons.add_circle_outline_rounded, size: 18),
                  label: Text(full ? 'FULL' : (going ? "YOU'RE GOING" : 'RSVP'),
                      style: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                ),
              ),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: () => _toggleSave(session),
                child: Container(
                  padding: const EdgeInsets.all(13),
                  decoration: BoxDecoration(
                    color: saved ? ConferenceColors.gold : Colors.white.withValues(alpha: 0.08),
                    borderRadius: Cosmic.chipRadius,
                    border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                  ),
                  child: Icon(saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                      size: 20, color: saved ? Colors.black : Cosmic.textMuted),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Secondary actions: Join chat + Add to calendar.
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: ConferenceColors.gold,
                    side: BorderSide(color: ConferenceColors.goldAlpha(0.5)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
                  ),
                  onPressed: () => context.push('/conference/session/${session.id}/chat'),
                  icon: const Icon(Icons.forum_rounded, size: 18),
                  label: const Text('Join chat', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.grey.shade200,
                    side: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
                  ),
                  onPressed: () => _addToCalendar(session),
                  icon: const Icon(Icons.calendar_month_outlined, size: 18),
                  label: const Text('Calendar', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
          if (session.mapRoomId != null) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: ConferenceColors.gold,
                  side: BorderSide(color: ConferenceColors.goldAlpha(0.5)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
                ),
                onPressed: () => context.push(
                  '/conference/map?floor=${session.mapFloorId ?? ''}&room=${session.mapRoomId}',
                ),
                icon: const Icon(Icons.place_rounded, size: 18),
                label: const Text('Find on map', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _metaRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Icon(icon, size: 14, color: ConferenceColors.gold),
          const SizedBox(width: 6),
          Expanded(child: Text(text, style: const TextStyle(color: ConferenceColors.mutedForeground))),
        ],
      ),
    );
  }
}
