import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../analytics/expansion_analytics.dart';
import '../../auth/auth_controller.dart';
import '../../commons/theme/commons_colors.dart';
import '../../conference/current_conference_holder.dart';
import '../../conference/models/conference.dart';
import '../../conference/services/conference_repository.dart';
import '../../conference/theme/conference_colors.dart';
import '../../models/community_event.dart';
import '../../services/events_repository.dart';
import '../../theme/app_theme.dart';
import '../mortarverse_signals.dart';
import '../widgets/mortarverse_focus_card.dart';

/// Post-login landing screen: a live action widget answering "what needs me?",
/// then the three shops as a horizontally scrollable street.
///
/// Every number shown is derived from data the app already stores. The app has
/// no unread-message tracking and no presence system, so the messages item
/// counts *conversations waiting on a reply* and no tile claims who is online.
class MortarverseChooserScreen extends StatefulWidget {
  const MortarverseChooserScreen({super.key});

  @override
  State<MortarverseChooserScreen> createState() => _MortarverseChooserScreenState();
}

class _MortarverseChooserScreenState extends State<MortarverseChooserScreen> {
  final ConferenceRepository _conferenceRepository = ConferenceRepository();
  final MortarverseSignalsService _signals = MortarverseSignalsService();
  final EventsRepository _events = EventsRepository();

  late final Future<Conference?> _activeConferenceFuture;
  late final List<Offset> _starPositions;

  @override
  void initState() {
    super.initState();
    // Standing at the chooser means no conference is open. Every exit from the
    // Conference app routes through here, so this is the one place that can
    // reliably clear the holder — without it the id stays set for the life of
    // the process and analytics would stamp conference_id onto Expansion events
    // logged after the user left.
    CurrentConferenceHolder.instance.conferenceId = null;
    _activeConferenceFuture = _conferenceRepository.fetchActiveConference();
    final rng = Random(7);
    _starPositions = List.generate(60, (_) => Offset(rng.nextDouble(), rng.nextDouble()));
  }

  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  /// Priority order: conversations waiting → a conference to enter → the next
  /// MORTAR event → swap cards → finish your profile. Only items with something
  /// real behind them are queued; the card is never empty because the QR item
  /// always applies.
  List<MortarverseAction> _buildQueue({
    required int waiting,
    required Conference? conference,
    required CommunityEvent? nextEvent,
    required MortarverseSignals signals,
  }) {
    return [
      if (waiting > 0) MortarverseAction.messages(waiting),
      if (conference != null)
        MortarverseAction.conference(conference.name, '/conference/gate'),
      if (nextEvent != null)
        MortarverseAction.event(
          title: nextEvent.title,
          when: _eventWhen(nextEvent),
        ),
      MortarverseAction.qrCard,
      if (signals.profileIncomplete)
        MortarverseAction.profile(signals.profileCompletion),
    ];
  }

  String _eventWhen(CommunityEvent e) {
    final d = e.date;
    if (d == null) return e.time.trim().isEmpty ? 'Date TBD' : e.time.trim();
    return DateFormat('EEE, MMM d').format(d);
  }

  void _openAction(MortarverseAction item) {
    unawaited(ExpansionAnalytics.log(
      'mortarverse_action_widget_tapped',
      sourceScreen: 'mortarverse',
      extra: {'action_type': item.type},
    ));
    if (item.type == 'conference') {
      // The gate needs to know which conference it is gating.
      unawaited(_activeConferenceFuture.then((c) {
        if (c != null) CurrentConferenceHolder.instance.conferenceId = c.id;
      }));
    }
    context.go(item.route);
  }

  void _reportShown(MortarverseAction item) {
    unawaited(ExpansionAnalytics.log(
      'mortarverse_action_widget_shown',
      sourceScreen: 'mortarverse',
      extra: {'action_type': item.type},
    ));
  }

  @override
  Widget build(BuildContext context) {
    final hasExpansionAccess = context.watch<AuthController>().hasExpansionAccess;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment.topCenter,
                radius: 1.2,
                colors: [Color(0xFF262626), Colors.black],
              ),
            ),
          ),
          Positioned.fill(
            child: CustomPaint(painter: _StarfieldPainter(_starPositions)),
          ),
          SafeArea(
            child: StreamBuilder<int>(
              stream: _signals.watchWaitingConversations(),
              builder: (context, waitingSnap) {
                final waiting = waitingSnap.data ?? 0;
                return StreamBuilder<MortarverseSignals>(
                  stream: _signals.watchProfileSignals(),
                  builder: (context, profileSnap) {
                    final signals = profileSnap.data ?? const MortarverseSignals();
                    return FutureBuilder<Conference?>(
                      future: _activeConferenceFuture,
                      builder: (context, confSnap) {
                        final conference = confSnap.data;
                        final conferenceLoading =
                            confSnap.connectionState != ConnectionState.done;
                        return StreamBuilder<List<CommunityEvent>>(
                          stream: _events.watchPublishedEvents(),
                          builder: (context, eventSnap) {
                            final upcoming = _upcoming(eventSnap.data ?? const []);
                            return _buildBody(
                              context,
                              hasExpansionAccess: hasExpansionAccess,
                              waiting: waiting,
                              signals: signals,
                              conference: conference,
                              conferenceLoading: conferenceLoading,
                              upcoming: upcoming,
                            );
                          },
                        );
                      },
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.primary,
        tooltip: 'My card & scan',
        onPressed: () => context.go('/card'),
        child: const Icon(Icons.qr_code_scanner_rounded, size: 27, color: Colors.white),
      ),
    );
  }

  /// Published events dated today or later, soonest first.
  List<CommunityEvent> _upcoming(List<CommunityEvent> all) {
    final today = DateUtils.dateOnly(DateTime.now());
    final dated = all.where((e) {
      final d = e.date;
      return d != null && !DateUtils.dateOnly(d).isBefore(today);
    }).toList()
      ..sort((a, b) => a.date!.compareTo(b.date!));
    return dated;
  }

  Widget _buildBody(
    BuildContext context, {
    required bool hasExpansionAccess,
    required int waiting,
    required MortarverseSignals signals,
    required Conference? conference,
    required bool conferenceLoading,
    required List<CommunityEvent> upcoming,
  }) {
    final queue = _buildQueue(
      waiting: waiting,
      conference: conference,
      nextEvent: upcoming.isEmpty ? null : upcoming.first,
      signals: signals,
    );

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(22, 20, 22, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _greeting,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
              ),
              const SizedBox(height: 2),
              const Text(
                'THE MORTARVERSE',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  height: 1.25,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(22, 18, 22, 0),
          child: MortarverseFocusCard(
            queue: queue,
            onOpen: _openAction,
            onShown: _reportShown,
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(22, 14, 22, 0),
          child: Row(
            children: [
              Expanded(
                child: _SecondaryChip(
                  icon: Icons.stadium_rounded,
                  label: conferenceLoading
                      ? 'Checking for\nconferences'
                      : conference != null
                          ? '${conference.name}\nis open'
                          : 'No conference\nopen right now',
                  accent: ConferenceColors.gold,
                  muted: conference == null,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _SecondaryChip(
                  icon: Icons.account_circle_rounded,
                  label: signals.profileIncomplete
                      ? 'Profile ${signals.profileCompletion}%\ncomplete'
                      : '${signals.badgesEarned} badges\nearned',
                  accent: CommonsColors.accent,
                  muted: true,
                ),
              ),
            ],
          ),
        ),
        const Padding(
          padding: EdgeInsets.fromLTRB(22, 26, 22, 12),
          child: _SectionHeader(title: 'WHERE TO GO', trailing: 'Swipe the street →'),
        ),
        _ShopStreet(
          hasExpansionAccess: hasExpansionAccess,
          waiting: waiting,
          conference: conference,
          conferenceLoading: conferenceLoading,
          signals: signals,
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(22, 26, 22, 26),
          child: _EventsStrip(events: upcoming),
        ),
        // Clears the FAB.
        const SizedBox(height: 60),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.trailing});

  final String title;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.4,
          ),
        ),
        const Spacer(),
        if (trailing != null)
          Text(
            trailing!,
            style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
          ),
      ],
    );
  }
}

class _SecondaryChip extends StatelessWidget {
  const _SecondaryChip({
    required this.icon,
    required this.label,
    required this.accent,
    required this.muted,
  });

  final IconData icon;
  final String label;
  final Color accent;
  final bool muted;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
      decoration: BoxDecoration(
        color: muted
            ? Colors.white.withValues(alpha: 0.05)
            : accent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: muted
              ? Colors.white.withValues(alpha: 0.12)
              : accent.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(icon, size: 17, color: muted ? CommonsColors.accent : accent),
          const SizedBox(width: 7),
          Expanded(
            child: Text(
              label,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: muted ? Colors.grey.shade400 : accent,
                fontSize: 11,
                height: 1.25,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The three shops as a horizontally scrollable street.
class _ShopStreet extends StatelessWidget {
  const _ShopStreet({
    required this.hasExpansionAccess,
    required this.waiting,
    required this.conference,
    required this.conferenceLoading,
    required this.signals,
  });

  final bool hasExpansionAccess;
  final int waiting;
  final Conference? conference;
  final bool conferenceLoading;
  final MortarverseSignals signals;

  @override
  Widget build(BuildContext context) {
    final conferenceOpen = !conferenceLoading && conference != null;

    return SizedBox(
      height: 196,
      child: ListView(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.only(left: 22, right: 10),
        children: [
          _ShopTile(
            title: 'NETWORKING\nHALL',
            // No presence system exists, so this never claims who is online.
            subtitle: waiting > 0
                ? '$waiting waiting on you'
                : 'Connect • Grow • Collaborate',
            pill: hasExpansionAccess
                ? (waiting > 0 ? '$waiting WAITING' : 'OPEN')
                : 'LOCKED',
            shopColor: AppColors.primary,
            enabled: true,
            onTap: () => context.go(
              hasExpansionAccess ? '/home' : '/expansion/enter-code',
            ),
          ),
          const SizedBox(width: 12),
          _ShopTile(
            title: 'CONFERENCE\nCENTER',
            subtitle: conferenceLoading
                ? 'Loading…'
                : (conference?.name ?? 'No conference is open right now'),
            pill: conferenceLoading
                ? '…'
                : conferenceOpen
                    ? 'OPEN NOW'
                    : 'CLOSED',
            shopColor: ConferenceColors.gold,
            enabled: conferenceOpen,
            onTap: conferenceOpen
                ? () {
                    CurrentConferenceHolder.instance.conferenceId = conference!.id;
                    // Land on the ticket gate ("first click") screen; it routes
                    // on to the lobby once a ticket code has been redeemed.
                    context.go('/conference/gate');
                  }
                : null,
          ),
          const SizedBox(width: 12),
          _ShopTile(
            title: 'THE\nCOMMONS',
            subtitle: signals.profileIncomplete
                ? 'Profile ${signals.profileCompletion}% complete'
                : '${signals.badgesEarned} badges earned',
            pill: signals.profileIncomplete
                ? 'PROFILE ${signals.profileCompletion}%'
                : 'COMPLETE',
            shopColor: CommonsColors.accent,
            enabled: true,
            outlinedPill: true,
            onTap: () => context.go('/commons/profile'),
          ),
        ],
      ),
    );
  }
}

class _ShopTile extends StatefulWidget {
  const _ShopTile({
    required this.title,
    required this.subtitle,
    required this.pill,
    required this.shopColor,
    required this.enabled,
    required this.onTap,
    this.outlinedPill = false,
  });

  final String title;
  final String subtitle;
  final String pill;
  final Color shopColor;
  final bool enabled;
  final VoidCallback? onTap;
  final bool outlinedPill;

  @override
  State<_ShopTile> createState() => _ShopTileState();
}

class _ShopTileState extends State<_ShopTile> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final color = widget.shopColor;
    final glow = widget.enabled && !widget.outlinedPill;

    return Opacity(
      opacity: widget.enabled ? 1 : 0.45,
      child: GestureDetector(
        onTap: widget.onTap,
        onTapDown: (_) => setState(() => _pressed = true),
        onTapUp: (_) => setState(() => _pressed = false),
        onTapCancel: () => setState(() => _pressed = false),
        child: AnimatedScale(
          scale: _pressed ? 0.97 : 1,
          duration: const Duration(milliseconds: 100),
          child: Container(
            width: 148,
            decoration: BoxDecoration(
              color: const Color(0xFF0D0D0D),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: widget.outlinedPill ? color.withValues(alpha: 0.8) : color,
                width: 2,
              ),
              boxShadow: glow
                  ? [BoxShadow(color: color.withValues(alpha: 0.32), blurRadius: 34)]
                  : null,
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.only(top: 18, bottom: 10),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        color.withValues(alpha: widget.outlinedPill ? 0.12 : 0.16),
                        Colors.transparent,
                      ],
                    ),
                  ),
                  child: ColorFiltered(
                    colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
                    child: Image.asset(
                      'assets/conference/shop_storefront.png',
                      height: 52,
                      width: 92,
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(10, 0, 10, 14),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.start,
                      children: [
                        _Pill(
                          label: widget.pill,
                          color: color,
                          outlined: widget.outlinedPill,
                        ),
                        const SizedBox(height: 5),
                        Text(
                          widget.title,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            height: 1.25,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.7,
                          ),
                        ),
                        const SizedBox(height: 5),
                        Flexible(
                          child: Text(
                            widget.subtitle,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xFF999999),
                              fontSize: 10,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, required this.color, required this.outlined});

  final String label;
  final Color color;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    final onColor = color.computeLuminance() > 0.5 ? Colors.black : Colors.white;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: outlined ? Colors.transparent : color,
        borderRadius: BorderRadius.circular(999),
        border: outlined ? Border.all(color: color.withValues(alpha: 0.7)) : null,
      ),
      child: Text(
        label,
        style: TextStyle(
          color: outlined ? color : onColor,
          fontSize: 9,
          fontWeight: FontWeight.w700,
          letterSpacing: 1,
        ),
      ),
    );
  }
}

/// Upcoming MORTAR events. Hidden entirely when there are none — an empty
/// strip would just be a heading over nothing.
class _EventsStrip extends StatelessWidget {
  const _EventsStrip({required this.events});

  final List<CommunityEvent> events;

  @override
  Widget build(BuildContext context) {
    if (events.isEmpty) return const SizedBox.shrink();
    final shown = events.take(2).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () => context.go('/events'),
          child: const _SectionHeader(title: 'MORTAR EVENTS', trailing: 'See all'),
        ),
        const SizedBox(height: 12),
        for (final e in shown) ...[
          _EventRow(event: e),
          if (e != shown.last) const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _EventRow extends StatelessWidget {
  const _EventRow({required this.event});

  final CommunityEvent event;

  @override
  Widget build(BuildContext context) {
    final date = event.date;
    final meta = [
      if (date != null) DateFormat('EEE, MMM d').format(date),
      if (event.time.trim().isNotEmpty) event.time.trim(),
      if (event.location.trim().isNotEmpty) event.location.trim(),
    ].join(' · ');

    return Material(
      color: Colors.white.withValues(alpha: 0.04),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => context.go('/events/${event.id}'),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withValues(alpha: 0.09)),
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFF1A1A1A),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      date != null ? DateFormat('d').format(date) : '—',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      date != null ? DateFormat('MMM').format(date).toUpperCase() : '',
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 8,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    if (meta.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        meta,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
                ),
                child: const Text(
                  'RSVP',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StarfieldPainter extends CustomPainter {
  _StarfieldPainter(this.positions);

  final List<Offset> positions;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.grey.shade600.withValues(alpha: 0.5);
    for (final p in positions) {
      canvas.drawCircle(Offset(p.dx * size.width, p.dy * size.height), 0.8, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _StarfieldPainter oldDelegate) => false;
}
