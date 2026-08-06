import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
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
import '../widgets/conference_background.dart';
import '../widgets/conference_scope.dart';
import '../../theme/cosmic_content.dart';

enum _Filter { all, going, saved }

/// Event Schedule — ports `Conference App Figma Mockup/src/app/pages/ConferenceSchedule.tsx`
/// onto the live `conferences/{id}/sessions` stream, with persistent save,
/// RSVP ("going"), All/Going/Saved filtering, and a link into each session chat.
class ConferenceScheduleScreen extends StatefulWidget {
  const ConferenceScheduleScreen({super.key});

  @override
  State<ConferenceScheduleScreen> createState() => _ConferenceScheduleScreenState();
}

class _ConferenceScheduleScreenState extends State<ConferenceScheduleScreen> {
  final ConferenceRepository _repository = ConferenceRepository();
  final ConferenceSessionService _service = ConferenceSessionService();

  int _activeDay = 0;
  _Filter _filter = _Filter.all;
  Set<String> _savedIds = {};
  final Set<String> _rsvpBusy = {};
  StreamSubscription<Set<String>>? _savedSub;

  String? get _uid => FirebaseAuth.instance.currentUser?.uid;

  @override
  void initState() {
    super.initState();
    logConferenceEvent(ConferenceAnalytics.scheduleViewed);
    final cid = CurrentConferenceHolder.instance.conferenceId;
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

  void _comingSoon(String label) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$label is coming in a later update.')),
    );
  }

  Future<void> _toggleSave(ConferenceSession session) async {
    final cid = CurrentConferenceHolder.instance.conferenceId;
    if (cid == null) return;
    final saved = _savedIds.contains(session.id);
    try {
      await _service.setSaved(conferenceId: cid, session: session, saved: !saved);
      logConferenceEvent(() => ConferenceAnalytics.sessionSaved(
            sessionId: session.id,
            saved: !saved,
          ));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(userMessageForFirebaseCallableError(e))),
        );
      }
    }
  }

  Future<void> _toggleRsvp(ConferenceSession session) async {
    final cid = CurrentConferenceHolder.instance.conferenceId;
    if (cid == null) return;
    final going = session.isGoing(_uid);
    setState(() => _rsvpBusy.add(session.id));
    try {
      await _service.setRsvp(conferenceId: cid, sessionId: session.id, going: !going);
      // Mission metric `sessions_attended` counts this event with going=true,
      // so the schedule list must emit it exactly like the detail screen does.
      logConferenceEvent(() => ConferenceAnalytics.sessionRsvpChanged(
            sessionId: session.id,
            going: !going,
          ));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(userMessageForFirebaseCallableError(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _rsvpBusy.remove(session.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final scope = ConferenceScope.of(context);
    final conferenceName = scope.conference?.name ?? 'Conference';

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: ConferenceGridBackground(
        child: SafeArea(
          bottom: false,
          child: StreamBuilder<List<ConferenceSession>>(
            stream: _repository.watchSessions(scope.conferenceId),
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator(color: ConferenceColors.gold));
              }
              final sessions = snapshot.data!;
              final goingCount = sessions.where((s) => s.isGoing(_uid)).length;

              // Day keys only matter for the "All" view.
              final dayKeys = sessions
                  .where((s) => s.startTime != null)
                  .map((s) => DateFormat('yyyy-MM-dd').format(s.startTime!))
                  .toSet()
                  .toList()
                ..sort();
              final showDays = _filter == _Filter.all && dayKeys.length > 1;
              if (_activeDay >= dayKeys.length) _activeDay = 0;

              final List<ConferenceSession> visible;
              switch (_filter) {
                case _Filter.going:
                  visible = sessions.where((s) => s.isGoing(_uid)).toList();
                  break;
                case _Filter.saved:
                  visible = sessions.where((s) => _savedIds.contains(s.id)).toList();
                  break;
                case _Filter.all:
                  visible = showDays
                      ? sessions
                          .where((s) =>
                              s.startTime != null &&
                              DateFormat('yyyy-MM-dd').format(s.startTime!) == dayKeys[_activeDay])
                          .toList()
                      : sessions;
                  break;
              }

              return CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(child: _buildHeader(conferenceName)),
                  SliverToBoxAdapter(child: _buildFilterChips(goingCount, _savedIds.length)),
                  if (showDays) SliverToBoxAdapter(child: _buildDaySelector(dayKeys)),
                  if (visible.isEmpty)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 80),
                          child: Text(_emptyLabel(),
                              style: const TextStyle(color: ConferenceColors.mutedForeground)),
                        ),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 140),
                      sliver: SliverList.separated(
                        itemCount: visible.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 16),
                        itemBuilder: (context, i) => _buildSessionCard(visible[i]),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  String _emptyLabel() {
    switch (_filter) {
      case _Filter.going:
        return "You haven't RSVP'd to any sessions yet.";
      case _Filter.saved:
        return 'No saved sessions yet — tap the bookmark on a session.';
      case _Filter.all:
        return 'No sessions published yet.';
    }
  }

  Widget _buildHeader(String conferenceName) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    const Icon(Icons.calendar_month_rounded, size: 24, color: ConferenceColors.gold),
                    const SizedBox(width: 8),
                    const Flexible(
                      child: Text(
                        'EVENT SCHEDULE',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              _circleIcon(Icons.search, () => _comingSoon('Search')),
              const SizedBox(width: 8),
              _circleIcon(Icons.filter_list_rounded, () => _comingSoon('Filters')),
            ],
          ),
          const SizedBox(height: 6),
          Text(conferenceName, style: TextStyle(color: Cosmic.textMuted, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _circleIcon(IconData icon, VoidCallback onTap) {
    return InkResponse(
      onTap: onTap,
      radius: 24,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withValues(alpha: 0.05),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        ),
        child: Icon(icon, size: 20, color: Cosmic.textMuted),
      ),
    );
  }

  Widget _buildFilterChips(int goingCount, int savedCount) {
    Widget chip(String label, _Filter value) {
      final selected = _filter == value;
      return Padding(
        padding: const EdgeInsets.only(right: 8),
        child: GestureDetector(
          onTap: () => setState(() => _filter = value),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
            decoration: BoxDecoration(
              color: selected ? ConferenceColors.gold : Colors.white.withValues(alpha: 0.05),
              borderRadius: Cosmic.chipRadius,
              border: Border.all(
                color: selected ? ConferenceColors.gold : Colors.white.withValues(alpha: 0.1),
              ),
            ),
            child: Text(
              label.toUpperCase(),
              style: TextStyle(
                color: selected ? Colors.black : Cosmic.textMuted,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
              ),
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: Row(
        children: [
          chip('All', _Filter.all),
          chip('Going${goingCount > 0 ? ' $goingCount' : ''}', _Filter.going),
          chip('Saved${savedCount > 0 ? ' $savedCount' : ''}', _Filter.saved),
        ],
      ),
    );
  }

  Widget _buildDaySelector(List<String> dayKeys) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: Row(
        children: [
          for (var i = 0; i < dayKeys.length; i++) ...[
            if (i > 0) const SizedBox(width: 8),
            Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _activeDay = i),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: _activeDay == i ? ConferenceColors.gold : Colors.white.withValues(alpha: 0.05),
                    borderRadius: Cosmic.chipRadius,
                    border: Border.all(
                      color: _activeDay == i ? ConferenceColors.gold : Colors.white.withValues(alpha: 0.1),
                    ),
                  ),
                  child: Text(
                    DateFormat('MMM d').format(DateTime.parse(dayKeys[i])).toUpperCase(),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: _activeDay == i ? Colors.black : Cosmic.textMuted,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSessionCard(ConferenceSession session) {
    final saved = _savedIds.contains(session.id);
    final going = session.isGoing(_uid);
    final rsvpBusy = _rsvpBusy.contains(session.id);
    final speaker = session.primarySpeaker;
    final timeLabel = _timeLabel(session);
    final capacity = session.capacity;
    final showProgress = capacity != null && capacity > 0;

    return Stack(
      children: [
        Material(
          color: Colors.white.withValues(alpha: 0.05),
          borderRadius: Cosmic.chipRadius,
          child: InkWell(
            borderRadius: Cosmic.chipRadius,
            onTap: () => context.push('/conference/schedule/${session.id}'),
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                borderRadius: Cosmic.chipRadius,
                border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (session.track != null && session.track!.isNotEmpty) ...[
                    _trackBadge(session.track!),
                    const SizedBox(height: 12),
                  ],
                  Padding(
                    padding: const EdgeInsets.only(right: 44),
                    child: Text(
                      session.title,
                      style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700),
                    ),
                  ),
                  if (speaker != null) ...[
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        _speakerAvatar(speaker, session.speakerPhotoUrl),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(speaker,
                                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                              if (session.speakerTitle != null && session.speakerTitle!.isNotEmpty)
                                Text(session.speakerTitle!,
                                    style: TextStyle(color: Cosmic.textMuted, fontSize: 12)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 16),
                  _detailsGrid(timeLabel, session, capacity),
                  if (showProgress) ...[
                    const SizedBox(height: 14),
                    ClipRRect(
                      borderRadius: Cosmic.chipRadius,
                      child: LinearProgressIndicator(
                        value: (session.goingCount / capacity).clamp(0, 1).toDouble(),
                        minHeight: 6,
                        backgroundColor: Colors.white.withValues(alpha: 0.1),
                        valueColor: const AlwaysStoppedAnimation(ConferenceColors.gold),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: _rsvpButton(going, rsvpBusy, session)),
                      const SizedBox(width: 10),
                      _chatButton(session),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
        Positioned(
          top: 12,
          right: 12,
          child: GestureDetector(
            onTap: () => _toggleSave(session),
            child: Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: saved ? ConferenceColors.gold : Colors.white.withValues(alpha: 0.1),
              ),
              child: Icon(
                saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                size: 18,
                color: saved ? Colors.black : Cosmic.textMuted,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _rsvpButton(bool going, bool busy, ConferenceSession session) {
    final full = !going && session.isFull;
    return FilledButton.icon(
      style: FilledButton.styleFrom(
        backgroundColor: going ? ConferenceColors.gold : ConferenceColors.goldAlpha(0.16),
        foregroundColor: going ? Colors.black : ConferenceColors.gold,
        padding: const EdgeInsets.symmetric(vertical: 13),
        shape: RoundedRectangleBorder(
          borderRadius: Cosmic.chipRadius,
          side: BorderSide(color: ConferenceColors.goldAlpha(0.5)),
        ),
      ),
      onPressed: busy || full ? null : () => _toggleRsvp(session),
      icon: busy
          ? const SizedBox(
              height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: ConferenceColors.gold))
          : Icon(going ? Icons.check_circle_rounded : Icons.add_circle_outline_rounded, size: 18),
      label: Text(
        full ? 'FULL' : (going ? "GOING" : 'RSVP'),
        style: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.5),
      ),
    );
  }

  Widget _chatButton(ConferenceSession session) {
    return GestureDetector(
      onTap: () => context.push('/conference/session/${session.id}/chat'),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.08),
          borderRadius: Cosmic.chipRadius,
          border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
        ),
        child: const Icon(Icons.forum_rounded, size: 20, color: ConferenceColors.gold),
      ),
    );
  }

  Widget _trackBadge(String track) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: ConferenceColors.goldAlpha(0.12),
        borderRadius: Cosmic.chipRadius,
        border: Border.all(color: ConferenceColors.goldAlpha(0.25)),
      ),
      child: Text(
        track.toUpperCase(),
        style: const TextStyle(color: ConferenceColors.gold, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8),
      ),
    );
  }

  Widget _speakerAvatar(String name, String? photoUrl) {
    final initials = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();
    final fallback = Text(
      initials,
      style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700),
    );
    return Container(
      width: 40,
      height: 40,
      clipBehavior: Clip.antiAlias,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: ConferenceColors.goldAlpha(0.25),
        border: Border.all(color: ConferenceColors.gold, width: 2),
      ),
      child: (photoUrl != null && photoUrl.isNotEmpty)
          ? Image.network(
              photoUrl,
              width: 40,
              height: 40,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Center(child: fallback),
            )
          : fallback,
    );
  }

  Widget _detailsGrid(String? timeLabel, ConferenceSession session, int? capacity) {
    final goingLabel = capacity != null && capacity > 0
        ? '${session.goingCount}/$capacity going'
        : '${session.goingCount} going';
    final cells = <Widget>[
      if (timeLabel != null) _detailCell(Icons.schedule_rounded, timeLabel),
      if (session.roomLabel != null && session.roomLabel!.isNotEmpty)
        _detailCell(Icons.location_on_rounded, session.roomLabel!),
      _detailCell(Icons.people_alt_rounded, goingLabel),
      if (session.level != null && session.level!.isNotEmpty) _detailCell(Icons.star_rounded, session.level!),
    ];
    return Wrap(
      spacing: 12,
      runSpacing: 10,
      children: [
        for (final cell in cells)
          SizedBox(width: (MediaQuery.of(context).size.width - 40 - 36 - 12) / 2, child: cell),
      ],
    );
  }

  Widget _detailCell(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 16, color: ConferenceColors.gold),
        const SizedBox(width: 8),
        Expanded(
          child: Text(text,
              style: TextStyle(color: Cosmic.textMuted, fontSize: 13), overflow: TextOverflow.ellipsis),
        ),
      ],
    );
  }

  String? _timeLabel(ConferenceSession session) {
    final start = session.startTime;
    final end = session.endTime;
    if (start == null) return null;
    final startStr = DateFormat('h:mm a').format(start);
    if (end != null) return '$startStr - ${DateFormat('h:mm a').format(end)}';
    return startStr;
  }
}
