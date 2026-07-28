import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../services/expansion_session_service.dart'
    show userMessageForFirebaseCallableError;
import '../conference_analytics.dart';
import '../current_conference_holder.dart';
import '../models/conference_mission.dart';
import '../services/conference_mission_service.dart';
import '../services/conference_ticket_service.dart';
import '../theme/conference_brand.dart';
import '../theme/conference_colors.dart';
import '../widgets/conference_brand_mark.dart';
import '../widgets/conference_scope.dart';
import '../widgets/conference_shell.dart';

/// Conference home tab — based on
/// `Conference App Figma Mockup/src/app/pages/ConferenceLobby.tsx`: a hero
/// showing the conference name, dates and live status, an Explore/Missions/Map
/// segmented tab set (Figma's "Badges" tab is "Missions" here — see
/// `docs/conference-app-plan.md` on why they're progress-tracked, not
/// earned/not-earned), and a floating button that opens the member card.
///
/// The Figma mock's activity ticker and per-zone status badges ("Very Active",
/// "Live Now") are intentionally not implemented: there is no data behind them,
/// and the original placeholders invented attendee activity.
class ConferenceLobbyScreen extends StatefulWidget {
  const ConferenceLobbyScreen({super.key});

  @override
  State<ConferenceLobbyScreen> createState() => _ConferenceLobbyScreenState();
}

enum _LobbyTab { explore, missions, map }

class _ConferenceLobbyScreenState extends State<ConferenceLobbyScreen>
    with WidgetsBindingObserver {
  _LobbyTab _tab = _LobbyTab.explore;

  /// Re-renders the hero so "starts in 4m" and the LIVE pill stay honest
  /// without the user pulling to refresh.
  Timer? _clockTimer;

  final ConferenceTicketService _tickets = ConferenceTicketService();
  bool _checkingIn = false;
  bool? _checkedInToday; // null = status not loaded yet
  int _todayCount = 0;

  static const _zones = [
    _Zone(
      title: 'Networking Zone',
      subtitle: 'Connect with founders',
      icon: Icons.people_alt_rounded,
      route: '/conference/network',
    ),
    _Zone(
      title: 'Event Schedule',
      subtitle: 'Sessions & Workshops',
      icon: Icons.calendar_month_rounded,
      route: '/conference/schedule',
    ),
    _Zone(
      title: 'Community Hub',
      subtitle: 'Discussions & Topics',
      icon: Icons.forum_rounded,
      route: '/conference/community',
    ),
    _Zone(
      title: 'Sponsor Hall',
      subtitle: 'Booths & Giveaways',
      icon: Icons.storefront_rounded,
      route: '/conference/sponsors',
    ),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    logConferenceEvent(ConferenceAnalytics.entered);
    _clockTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() {});
    });
    _loadCheckInStatus();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _clockTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Refresh the check-in status when returning to the app (e.g. a new day).
    if (state == AppLifecycleState.resumed) _loadCheckInStatus();
  }

  /// Non-writing status read so the button reflects today's state on load.
  Future<void> _loadCheckInStatus() async {
    final conferenceId = CurrentConferenceHolder.instance.conferenceId;
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (conferenceId == null || uid == null) return;
    try {
      final res = await _tickets.checkIn(conferenceId: conferenceId, peek: true);
      if (!mounted) return;
      setState(() {
        _checkedInToday = res['checkedInToday'] == true;
        _todayCount = (res['todayCount'] as num?)?.toInt() ?? 0;
      });
    } catch (_) {
      // Best-effort — leave the button in its default state.
    }
  }

  Future<void> _handleCheckIn() async {
    final conferenceId = CurrentConferenceHolder.instance.conferenceId;
    if (conferenceId == null || _checkingIn || _checkedInToday == true) return;
    setState(() => _checkingIn = true);
    try {
      final res = await _tickets.checkIn(conferenceId: conferenceId);
      final already = res['alreadyToday'] == true;
      logConferenceEvent(() => ConferenceAnalytics.checkedIn(
            alreadyToday: already,
            todayCount: (res['todayCount'] as num?)?.toInt(),
          ));
      if (!mounted) return;
      setState(() {
        _checkedInToday = true;
        _todayCount = (res['todayCount'] as num?)?.toInt() ?? _todayCount;
        _checkingIn = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(already
              ? "You're already checked in for today."
              : "You're checked in for today! 🎉"),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _checkingIn = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userMessageForFirebaseCallableError(e))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final conference = ConferenceScope.of(context).conference;
    final brand = ConferenceBrand.from(
      brandColor: conference?.brandColor,
      brandColorSecondary: conference?.brandColorSecondary,
      logoUrl: conference?.logoUrl,
      heroImageUrl: conference?.heroImageUrl,
    );

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Ambient wash takes the event's palette when it has one; otherwise
          // this is byte-for-byte the previous backdrop.
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: brand.hasWash
                    ? [brand.washTop, brand.washMid, Colors.black, Colors.black]
                    : const [ConferenceColors.atmosphere, Colors.black, Colors.black],
                stops: brand.hasWash ? const [0, 0.22, 0.6, 1] : null,
              ),
            ),
          ),
          SafeArea(
            bottom: false,
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(child: _HeroBanner(conference: conference)),
                SliverToBoxAdapter(child: _buildCheckInCard(context)),
                SliverToBoxAdapter(child: _buildTabBar()),
                SliverToBoxAdapter(child: _buildTabContent(context, conference?.mapImageUrl)),
                const SliverToBoxAdapter(child: SizedBox(height: 140)),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: _buildMemberCardFab(context),
    );
  }

  /// Prominent daily check-in CTA in the lobby (resets each conference-local day).
  Widget _buildCheckInCard(BuildContext context) {
    final checkedIn = _checkedInToday == true;
    // Null when nobody has checked in yet — an empty count is better left
    // unsaid than dressed up as encouragement.
    final countLabel = _todayCount > 0 ? '$_todayCount checked in today' : null;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: ConferenceColors.goldAlpha(checkedIn ? 0.5 : 0.3)),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [ConferenceColors.goldAlpha(0.10), Colors.black.withValues(alpha: 0.4)],
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: ConferenceColors.goldAlpha(0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: ConferenceColors.gold, width: 1.4),
              ),
              child: Icon(
                checkedIn ? Icons.how_to_reg_rounded : Icons.location_on_rounded,
                color: ConferenceColors.gold,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    checkedIn ? "YOU'RE CHECKED IN" : 'DAILY CHECK-IN',
                    style: const TextStyle(
                      color: ConferenceColors.gold,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                      letterSpacing: 0.8,
                    ),
                  ),
                  if (countLabel != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      countLabel,
                      style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 10),
            if (_checkingIn)
              const SizedBox(
                width: 44,
                height: 40,
                child: Center(
                  child: SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: ConferenceColors.gold),
                  ),
                ),
              )
            else
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: checkedIn ? ConferenceColors.goldAlpha(0.16) : ConferenceColors.gold,
                  foregroundColor: checkedIn ? ConferenceColors.gold : Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: ConferenceColors.goldAlpha(0.5)),
                  ),
                ),
                onPressed: checkedIn ? null : _handleCheckIn,
                child: Text(
                  checkedIn ? 'Checked in ✓' : 'Check In',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabBar() {
    Widget tabButton(_LobbyTab tab, String label) {
      final selected = _tab == tab;
      return Expanded(
        child: GestureDetector(
          onTap: () => setState(() => _tab = tab),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: selected ? ConferenceColors.gold : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              label.toUpperCase(),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                letterSpacing: 1,
                fontWeight: FontWeight.w600,
                color: selected ? Colors.black : Colors.grey.shade400,
              ),
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        ),
        child: Row(
          children: [
            tabButton(_LobbyTab.explore, 'Explore'),
            tabButton(_LobbyTab.missions, 'Missions'),
            tabButton(_LobbyTab.map, 'Map'),
          ],
        ),
      ),
    );
  }

  Widget _buildTabContent(BuildContext context, String? mapImageUrl) {
    switch (_tab) {
      case _LobbyTab.explore:
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(children: [for (final zone in _zones) _ZoneCard(zone: zone)]),
        );
      case _LobbyTab.missions:
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.emoji_events_rounded, size: 20, color: ConferenceColors.gold),
                  const SizedBox(width: 8),
                  Text(
                    'COLLECT BADGES',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontWeight: FontWeight.w700, letterSpacing: 1),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const _MissionsList(),
            ],
          ),
        );
      case _LobbyTab.map:
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: _MapTabContent(mapImageUrl: mapImageUrl),
        );
    }
  }

  /// Bottom-right FAB — the conference entry point to the member card, which
  /// opens on "My Code" with a "Scan" tab beside it.
  ///
  /// Check In and Add to Calendar, previously reachable from this button's
  /// quick-action menu, remain available from the lobby's own Check In button
  /// and the conference gate screen respectively.
  Widget _buildMemberCardFab(BuildContext context) {
    return Padding(
      // ConferenceShell's nav pill floats over this screen's body, so the FAB
      // has to clear it or it sits underneath and cannot be tapped.
      padding: EdgeInsets.only(bottom: ConferenceShell.navBarClearance(context)),
      child: FloatingActionButton(
        backgroundColor: ConferenceColors.gold,
        tooltip: 'My card & scan',
        onPressed: () => context.push('/card?ctx=conference'),
        child: const Icon(Icons.qr_code_2_rounded, size: 30, color: Colors.black),
      ),
    );
  }
}


/// Live conference header: real status, real numbers, and one clear next action.
///
/// Everything shown is derived from the conference doc and its sessions. The
/// previous version hard-coded "Tech Summit", a permanent LIVE pill, "Next
/// Session: Soon", "Activity: High", and a rotating ticker of invented activity
/// Live conference header: the conference's name, date, and how live it is.
///
/// Deliberately minimal for now. Everything shown is real — the previous
/// version hard-coded a "Tech Summit" subtitle, a permanent LIVE pill, and a
/// rotating ticker of invented activity ("Sarah just connected with 3
/// founders") presented to attendees as if it had happened.
class _HeroBanner extends StatelessWidget {
  const _HeroBanner({required this.conference});

  final dynamic conference;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final name = conference?.name as String? ?? 'MORTARVERSE Conference';
    final start = conference?.startDate as DateTime?;
    final end = conference?.endDate as DateTime?;
    final dateLabel = start != null ? _dateRange(start, end) : null;
    final heroRaw = (conference?.heroImageUrl as String?)?.trim();
    final heroImage = (heroRaw != null && heroRaw.isNotEmpty) ? heroRaw : null;
    final logoRaw = (conference?.logoUrl as String?)?.trim();
    final logoUrl = (logoRaw != null && logoRaw.isNotEmpty) ? logoRaw : null;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              TextButton.icon(
                onPressed: () => context.go('/mortarverse'),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.grey.shade400,
                  padding: EdgeInsets.zero,
                ),
                icon: const Icon(Icons.arrow_back, size: 16),
                label: const Text('Mortarverse', style: TextStyle(fontSize: 13)),
              ),
              const Spacer(),
              TextButton.icon(
                // Leaves the conference entirely and lands on the conference
                // list, rather than the Mortarverse chooser.
                onPressed: () => context.go('/conference/gate?switch=1'),
                style: TextButton.styleFrom(
                  foregroundColor: ConferenceColors.gold,
                  padding: EdgeInsets.zero,
                ),
                icon: const Icon(Icons.logout_rounded, size: 15),
                label: const Text('Leave conference', style: TextStyle(fontSize: 13)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: ConferenceColors.goldAlpha(0.3)),
                gradient: heroImage == null
                    ? LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          ConferenceColors.goldAlpha(0.1),
                          Colors.black.withValues(alpha: 0.5),
                        ],
                      )
                    : null,
              ),
              child: Stack(
                children: [
                  if (heroImage != null)
                    Positioned.fill(
                      child: Image.network(
                        heroImage,
                        fit: BoxFit.cover,
                        // A broken URL must not blank the header — fall back to
                        // the plain treatment.
                        errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                      ),
                    ),
                  if (heroImage != null)
                    Positioned.fill(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withValues(alpha: 0.15),
                              Colors.black.withValues(alpha: 0.62),
                              Colors.black.withValues(alpha: 0.88),
                            ],
                            stops: const [0, 0.55, 1],
                          ),
                        ),
                      ),
                    ),
                  Padding(
                    padding: EdgeInsets.all(heroImage == null ? 18 : 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Key art needs vertical room to read as an image.
                        if (heroImage != null) const SizedBox(height: 54),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ConferenceBrandMark(logoUrl: logoUrl),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    name.toUpperCase(),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 18,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  if (dateLabel != null) ...[
                                    const SizedBox(height: 6),
                                    Text(
                                      dateLabel,
                                      style: TextStyle(
                                        color: Colors.grey.shade400,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            const SizedBox(width: 10),
                            _StatusPill(status: _statusFor(now, start, end)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// "Jul 8" for a single day, "Jul 8 – 10" when it spans several.
  static String _dateRange(DateTime start, DateTime? end) {
    final startLabel = DateFormat('MMM d, y').format(start);
    if (end == null) return startLabel;
    final sameDay = start.year == end.year &&
        start.month == end.month &&
        start.day == end.day;
    if (sameDay) return startLabel;
    final sameMonth = start.year == end.year && start.month == end.month;
    final endLabel =
        sameMonth ? DateFormat('d, y').format(end) : DateFormat('MMM d, y').format(end);
    return '${DateFormat('MMM d').format(start)} – $endLabel';
  }

  static _ConfStatus _statusFor(DateTime now, DateTime? start, DateTime? end) {
    if (start == null) return _ConfStatus.scheduled;
    final finish = end ?? start.add(const Duration(days: 1));
    if (now.isAfter(finish)) return _ConfStatus.ended;
    if (!now.isBefore(start)) return _ConfStatus.live;
    if (start.difference(now).inDays < 1) return _ConfStatus.today;
    return _ConfStatus.scheduled;
  }
}

enum _ConfStatus { live, today, scheduled, ended }

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status});

  final _ConfStatus status;

  @override
  Widget build(BuildContext context) {
    final (label, bg, fg) = switch (status) {
      _ConfStatus.live => ('LIVE', ConferenceColors.gold, Colors.black),
      _ConfStatus.today => ('TODAY', ConferenceColors.gold, Colors.black),
      _ConfStatus.scheduled => (
          'UPCOMING',
          ConferenceColors.goldAlpha(0.18),
          ConferenceColors.gold
        ),
      _ConfStatus.ended => ('ENDED', Colors.white24, Colors.white70),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (status == _ConfStatus.live) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(color: fg, shape: BoxShape.circle),
            ),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: TextStyle(color: fg, fontSize: 10, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _Zone {
  const _Zone({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.route,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final String route;
}

class _ZoneCard extends StatelessWidget {
  const _ZoneCard({required this.zone});

  final _Zone zone;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: GestureDetector(
        onTap: () => context.go(zone.route),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            color: Colors.white.withValues(alpha: 0.06),
            border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: ConferenceColors.goldAlpha(0.12),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: ConferenceColors.gold, width: 1.5),
                    ),
                    child: Icon(zone.icon, color: ConferenceColors.gold, size: 26),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          zone.title.toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, letterSpacing: 0.5),
                        ),
                        Text(zone.subtitle, style: TextStyle(color: Colors.grey.shade400, fontSize: 12)),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded,
                      color: ConferenceColors.gold, size: 22),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Admin-authored missions for this conference, with live per-user progress.
///
/// Definitions come from `conference_missions`; progress from
/// `mission_progress/{uid}`, written by the mission evaluator that shares the
/// badge rules engine.
class _MissionsList extends StatefulWidget {
  const _MissionsList();

  @override
  State<_MissionsList> createState() => _MissionsListState();
}

class _MissionsListState extends State<_MissionsList> {
  final ConferenceMissionService _service = ConferenceMissionService();

  @override
  Widget build(BuildContext context) {
    final conferenceId = CurrentConferenceHolder.instance.conferenceId;
    if (conferenceId == null) return const SizedBox.shrink();

    return StreamBuilder<List<ConferenceMission>>(
      stream: _service.watchMissions(conferenceId),
      builder: (context, missionSnap) {
        if (missionSnap.hasError) {
          return _missionsNotice('Could not load missions.');
        }
        if (!missionSnap.hasData) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  color: ConferenceColors.gold,
                  strokeWidth: 2,
                ),
              ),
            ),
          );
        }
        final missions = missionSnap.data!;
        if (missions.isEmpty) {
          return _missionsNotice('No missions for this conference yet.');
        }

        return StreamBuilder<Map<String, MissionProgress>>(
          stream: _service.watchMyProgress(),
          builder: (context, progressSnap) {
            final progress = progressSnap.data ?? const <String, MissionProgress>{};
            return Column(
              children: [
                for (final m in missions)
                  _MissionTile(
                    mission: m,
                    progress: progress[m.id] ?? MissionProgress.empty,
                  ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _missionsNotice(String text) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Text(
          text,
          style: const TextStyle(color: ConferenceColors.mutedForeground, fontSize: 13),
        ),
      );
}

/// Maps an admin-chosen icon key to a glyph. Unknown keys fall back to a medal.
IconData missionIconFor(String? key) {
  switch (key) {
  case 'session':
    return Icons.event_available_rounded;
  case 'connect':
    return Icons.handshake_rounded;
  case 'sponsor':
    return Icons.storefront_rounded;
  case 'community':
    return Icons.forum_rounded;
  case 'checkin':
    return Icons.location_on_rounded;
  case 'chat':
    return Icons.chat_bubble_rounded;
  default:
    return Icons.emoji_events_rounded;
  }
}

class _MissionTile extends StatelessWidget {
  const _MissionTile({required this.mission, required this.progress});

  final ConferenceMission mission;
  final MissionProgress progress;

  @override
  Widget build(BuildContext context) {
    final done = progress.completed;
    // Clamp so an over-shot counter (e.g. 7 scans against a target of 5) still
    // renders a full bar rather than overflowing.
    final shown = done ? mission.target : progress.value.clamp(0, mission.target);
    final fraction = mission.target == 0 ? 0.0 : shown / mission.target;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: done
            ? ConferenceColors.goldAlpha(0.10)
            : Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: done
              ? ConferenceColors.goldAlpha(0.45)
              : Colors.white.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                done ? Icons.verified_rounded : missionIconFor(mission.iconKey),
                color: ConferenceColors.gold,
                size: 22,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(mission.title, style: const TextStyle(color: Colors.white)),
                    if (mission.description != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        mission.description!,
                        style: const TextStyle(
                          color: ConferenceColors.mutedForeground,
                          fontSize: 11.5,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                done ? 'Complete' : '$shown/${mission.target}',
                style: TextStyle(
                  color: done ? ConferenceColors.gold : Colors.grey.shade400,
                  fontSize: 12,
                  fontWeight: done ? FontWeight.w700 : FontWeight.w400,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: fraction,
              minHeight: 6,
              backgroundColor: Colors.white.withValues(alpha: 0.1),
              valueColor: const AlwaysStoppedAnimation(ConferenceColors.gold),
            ),
          ),
        ],
      ),
    );
  }
}

class _MapTabContent extends StatelessWidget {
  const _MapTabContent({required this.mapImageUrl});

  /// Legacy single map image (still used as a preview thumbnail if present).
  final String? mapImageUrl;

  @override
  Widget build(BuildContext context) {
    final hasPreview = mapImageUrl != null && mapImageUrl!.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'VENUE MAP',
          style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontWeight: FontWeight.w700, letterSpacing: 1),
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () => context.push('/conference/map'),
          child: Container(
            width: double.infinity,
            height: 200,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: Colors.white.withValues(alpha: 0.05),
              border: Border.all(color: ConferenceColors.goldAlpha(0.2)),
            ),
            clipBehavior: Clip.antiAlias,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (hasPreview)
                  Image.network(mapImageUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox())
                else
                  Center(
                    child: Icon(Icons.map_rounded, size: 48, color: ConferenceColors.goldAlpha(0.5)),
                  ),
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(color: Colors.black.withValues(alpha: hasPreview ? 0.35 : 0)),
                  ),
                ),
                const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.open_in_full_rounded, color: ConferenceColors.gold),
                      SizedBox(height: 6),
                      Text('Tap to explore', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
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
            onPressed: () => context.push('/conference/map'),
            icon: const Icon(Icons.map_rounded, size: 18),
            label: const Text('OPEN VENUE MAP', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.8)),
          ),
        ),
      ],
    );
  }
}

