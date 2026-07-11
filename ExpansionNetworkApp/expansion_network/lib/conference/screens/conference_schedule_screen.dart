import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../models/conference_session.dart';
import '../services/conference_repository.dart';
import '../theme/conference_colors.dart';
import '../widgets/conference_background.dart';
import '../widgets/conference_scope.dart';

/// Event Schedule — ports `Conference App Figma Mockup/src/app/pages/ConferenceSchedule.tsx`
/// (day selector, saved-sessions counter, rich session cards) onto the live
/// `conferences/{id}/sessions` stream. Track/level/registered fields render when
/// present on the session doc.
class ConferenceScheduleScreen extends StatefulWidget {
  const ConferenceScheduleScreen({super.key});

  @override
  State<ConferenceScheduleScreen> createState() => _ConferenceScheduleScreenState();
}

class _ConferenceScheduleScreenState extends State<ConferenceScheduleScreen> {
  final ConferenceRepository _repository = ConferenceRepository();
  int _activeDay = 0;
  final Set<String> _saved = {};

  void _comingSoon(String label) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$label is coming in a later update.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scope = ConferenceScope.of(context);
    final conferenceName = scope.conference?.name ?? 'Conference';

    return Scaffold(
      backgroundColor: ConferenceColors.background,
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

              // Distinct day keys from dated sessions.
              final dayKeys = sessions
                  .where((s) => s.startTime != null)
                  .map((s) => DateFormat('yyyy-MM-dd').format(s.startTime!))
                  .toSet()
                  .toList()
                ..sort();
              final showDays = dayKeys.length > 1;
              if (_activeDay >= dayKeys.length) _activeDay = 0;

              final visible = showDays
                  ? sessions
                      .where((s) =>
                          s.startTime != null &&
                          DateFormat('yyyy-MM-dd').format(s.startTime!) == dayKeys[_activeDay])
                      .toList()
                  : sessions;

              return CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(child: _buildHeader(conferenceName)),
                  if (showDays) SliverToBoxAdapter(child: _buildDaySelector(dayKeys)),
                  SliverToBoxAdapter(child: _buildSavedCounter()),
                  if (visible.isEmpty)
                    const SliverFillRemaining(
                      hasScrollBody: false,
                      child: Center(
                        child: Padding(
                          padding: EdgeInsets.only(bottom: 80),
                          child: Text('No sessions published yet.',
                              style: TextStyle(color: ConferenceColors.mutedForeground)),
                        ),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 140),
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
          Text(conferenceName, style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
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
        child: Icon(icon, size: 20, color: Colors.grey.shade400),
      ),
    );
  }

  Widget _buildDaySelector(List<String> dayKeys) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
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
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _activeDay == i ? ConferenceColors.gold : Colors.white.withValues(alpha: 0.1),
                    ),
                    boxShadow: _activeDay == i
                        ? [BoxShadow(color: ConferenceColors.goldAlpha(0.3), blurRadius: 14, spreadRadius: 1)]
                        : null,
                  ),
                  child: Text(
                    DateFormat('MMM d').format(DateTime.parse(dayKeys[i])).toUpperCase(),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: _activeDay == i ? Colors.black : Colors.grey.shade400,
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

  Widget _buildSavedCounter() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: ConferenceColors.goldAlpha(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: ConferenceColors.goldAlpha(0.2)),
        ),
        child: Row(
          children: [
            const Icon(Icons.bookmark_rounded, size: 18, color: ConferenceColors.gold),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '${_saved.length} session${_saved.length == 1 ? '' : 's'} saved',
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
            ),
            GestureDetector(
              onTap: () => _comingSoon('Saved sessions'),
              child: const Text(
                'VIEW ALL',
                style: TextStyle(color: ConferenceColors.gold, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSessionCard(ConferenceSession session) {
    final saved = _saved.contains(session.id);
    final speaker = session.primarySpeaker;
    final timeLabel = _timeLabel(session);
    final registered = session.registeredCount;
    final capacity = session.capacity;
    final showProgress = registered != null && capacity != null && capacity > 0;

    return Stack(
      children: [
        Material(
          color: Colors.white.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(20),
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => context.push('/conference/schedule/${session.id}'),
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
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
                                    style: TextStyle(color: Colors.grey.shade400, fontSize: 12)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 16),
                  _detailsGrid(timeLabel, session, registered, capacity),
                  if (showProgress) ...[
                    const SizedBox(height: 14),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: (registered / capacity).clamp(0, 1).toDouble(),
                        minHeight: 6,
                        backgroundColor: Colors.white.withValues(alpha: 0.1),
                        valueColor: const AlwaysStoppedAnimation(ConferenceColors.gold),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: ConferenceColors.gold,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => _comingSoon('Session chat'),
                      icon: const Icon(Icons.forum_rounded, size: 18),
                      label: const Text('JOIN CHAT',
                          style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.8)),
                    ),
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
            onTap: () => setState(() => saved ? _saved.remove(session.id) : _saved.add(session.id)),
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
                color: saved ? Colors.black : Colors.grey.shade400,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _trackBadge(String track) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: ConferenceColors.goldAlpha(0.12),
        borderRadius: BorderRadius.circular(999),
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

  Widget _detailsGrid(String? timeLabel, ConferenceSession session, int? registered, int? capacity) {
    final cells = <Widget>[
      if (timeLabel != null) _detailCell(Icons.schedule_rounded, timeLabel),
      if (session.roomLabel != null && session.roomLabel!.isNotEmpty)
        _detailCell(Icons.location_on_rounded, session.roomLabel!),
      if (registered != null && capacity != null) _detailCell(Icons.people_alt_rounded, '$registered/$capacity'),
      if (session.level != null && session.level!.isNotEmpty) _detailCell(Icons.star_rounded, session.level!),
    ];
    if (cells.isEmpty) return const SizedBox.shrink();
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
              style: TextStyle(color: Colors.grey.shade400, fontSize: 13), overflow: TextOverflow.ellipsis),
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
