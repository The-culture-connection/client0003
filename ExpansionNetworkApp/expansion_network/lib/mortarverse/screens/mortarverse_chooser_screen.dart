import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../analytics/expansion_analytics.dart';
import '../../auth/auth_controller.dart';
import '../../commons/theme/commons_colors.dart';
import '../../constants/app_links.dart';
import '../../conference/current_conference_holder.dart';
import '../../conference/models/conference.dart';
import '../../conference/services/conference_repository.dart';
import '../../conference/theme/conference_colors.dart';
import '../../models/community_event.dart';
import '../../services/events_repository.dart';
import '../../services/user_profile_repository.dart';
import '../../theme/app_theme.dart';
import '../../utils/safe_launch_url.dart';
import '../../widgets/expansion_tour.dart';
import '../mortarverse_signals.dart';
import '../../theme/cosmic_widgets.dart';
import '../widgets/mortarverse_focus_card.dart';
import '../widgets/mortarverse_planet.dart';
import '../../theme/cosmic_content.dart';

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

  // Spotlight targets for the first-visit walkthrough of this screen.
  final GlobalKey _tourFocusCard = GlobalKey();
  final GlobalKey _tourStreet = GlobalKey();
  final GlobalKey _tourEvents = GlobalKey();
  final GlobalKey _tourCardScan = GlobalKey();
  ExpansionTour? _activeTour;

  @override
  void initState() {
    super.initState();
    // Standing at the chooser means no conference is open. Every exit from the
    // Conference app routes through here, so this is the one place that can
    // reliably clear the holder — without it the id stays set for the life of
    // the process and analytics would stamp conference_id onto Expansion events
    // logged after the user left.
    CurrentConferenceHolder.instance.clear();
    _activeConferenceFuture = _conferenceRepository.fetchActiveConference();
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeRunTour());
  }

  @override
  void dispose() {
    _activeTour?.finish();
    super.dispose();
  }

  /// First-visit walkthrough of this screen — "can we get a short tutorial to
  /// learn how to navigate the home screen?" Testers landed on the Mortarverse
  /// after sign-in with no explanation of the focus card, the street of
  /// destinations, or where their QR card lived.
  ///
  /// Seen-state is separate from the networking hall's tour ([ExpansionShell]),
  /// because reaching one screen never implies having seen the other.
  static const String _seenKey = 'mortarverse_tour_seen';

  Future<void> _maybeRunTour() async {
    if (!mounted) return;
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_seenKey) ?? false) return;
    // Let the street and events strip lay out before pointing at them.
    await Future<void>.delayed(const Duration(milliseconds: 800));
    if (!mounted) return;
    await prefs.setBool(_seenKey, true);
    _startTour();
  }

  void _startTour() {
    if (!mounted) return;
    _activeTour?.finish();
    // A step whose target never laid out would spotlight nothing, so drop it.
    final steps = <TourStep>[
      TourStep(
        key: _tourFocusCard,
        shape: TourShape.rrect,
        title: 'What needs you',
        body: 'The top card always shows the one thing worth doing next — an '
            'unread message, an open conference, your next event. Tap it to go there.',
      ),
      TourStep(
        key: _tourStreet,
        shape: TourShape.rrect,
        title: 'Pick a destination',
        body: 'Swipe this street sideways. Each planet is a place: the '
            'Networking Hall, a live Conference, the Commons, and Digital '
            'Curriculum on the web.',
      ),
      TourStep(
        key: _tourEvents,
        shape: TourShape.rrect,
        title: 'Upcoming events',
        body: 'The next MORTAR events sit down here. Tap one to see the '
            'details and register.',
      ),
      TourStep(
        key: _tourCardScan,
        shape: TourShape.rrect,
        title: 'Your member card',
        body: 'This opens your QR card — show it to another member to swap '
            'details, or scan theirs.',
      ),
    ].where((s) => s.key.currentContext != null).toList();
    if (steps.isEmpty) return;

    unawaited(ExpansionAnalytics.log(
      'mortarverse_tour_started',
      sourceScreen: 'mortarverse',
    ));
    final tour = buildExpansionTour(
      steps: steps,
      onDone: () => _activeTour = null,
    );
    _activeTour = tour;
    tour.show(context: context);
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
    // "Anything waiting, show the user a pop up of what that is" — tapping the
    // waiting-messages item explains exactly what is waiting before opening.
    if (item.type == 'messages') {
      _showWaitingExplainer();
      return;
    }
    if (item.type == 'conference') {
      // The gate needs to know which conference it is gating.
      unawaited(_activeConferenceFuture.then((c) {
        if (c != null) CurrentConferenceHolder.instance.target(c.id);
      }));
    }
    // Standalone screens (events, profile edit, the QR card) are PUSHED so
    // their back buttons have somewhere to go — `go()` replaces the stack,
    // which is why back used to be missing on Android and dead on iOS.
    // Shell worlds (conference, commons, networking-hall tabs) keep `go`,
    // since they have their own navigation back out.
    if (_pushedRoutes.any((p) => item.route.startsWith(p))) {
      context.push(item.route);
      return;
    }
    context.go(item.route);
  }

  /// Route prefixes for standalone (non-shell) screens opened from this hub.
  static const List<String> _pushedRoutes = [
    '/events',
    '/profile/edit',
    '/card',
  ];

  /// Partner uids of the threads currently waiting on the user (latest value
  /// from [MortarverseSignalsService.watchWaitingConversationPartners]).
  List<String> _waitingPartnerIds = const [];

  /// Small explainer of what "waiting" means, listing who is waiting, with a
  /// direct path to the inbox.
  void _showWaitingExplainer() {
    final partnerIds = _waitingPartnerIds.take(6).toList();
    final users = UserProfileRepository();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Waiting on you'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'These conversations have messages you haven\'t opened yet:',
              style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
            ),
            const SizedBox(height: 12),
            if (partnerIds.isEmpty)
              const Text(
                'Nothing waiting right now.',
                style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
              )
            else
              for (final id in partnerIds)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: FutureBuilder<String>(
                    future: users.getDisplayNameForUser(id),
                    builder: (context, snap) => Text(
                      '• Unread message from ${snap.data ?? 'a member'}',
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                ),
            if (_waitingPartnerIds.length > partnerIds.length)
              Text(
                '…and ${_waitingPartnerIds.length - partnerIds.length} more.',
                style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground),
              ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              context.go('/commons/messages');
            },
            child: const Text('Open messages'),
          ),
        ],
      ),
    );
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
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          SafeArea(
            child: StreamBuilder<List<String>>(
              stream: _signals.watchWaitingConversationPartners(),
              builder: (context, waitingSnap) {
                _waitingPartnerIds = waitingSnap.data ?? const [];
                final waiting = _waitingPartnerIds.length;
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
      // The design puts the card/scan control top-right beside the wordmark as
      // a squircle lit from below, not a floating circle bottom-right.
      floatingActionButton: null,
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
        // Wordmark centred, card/scan parked at the right edge of the same
        // band — the design's `position:absolute; right:18px; top:52px`.
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Stack(
            alignment: Alignment.center,
            children: [
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 64, vertical: 14),
                child: Text(
                  'MORTARVERSE',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    height: 1,
                    fontWeight: FontWeight.w700,
                    // .1em at 20px.
                    letterSpacing: 2,
                    shadows: [
                      Shadow(color: Color(0x73FF505A), blurRadius: 22),
                    ],
                  ),
                ),
              ),
              Positioned(
                right: 0,
                child: _CardScanButton(
                  key: _tourCardScan,
                  onTap: () => context.push('/card'),
                ),
              ),
              // Replays the walkthrough for anyone who skipped it or is
              // returning after a while.
              Positioned(
                left: 0,
                child: IconButton(
                  onPressed: _startTour,
                  icon: const Icon(Icons.help_outline_rounded,
                      color: Cosmic.textFaint, size: 20),
                  tooltip: 'How this screen works',
                ),
              ),
            ],
          ),
        ),
        const Padding(
          padding: EdgeInsets.only(top: 22, bottom: 18),
          child: TornHorizon(),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
          child: MortarverseFocusCard(
            key: _tourFocusCard,
            queue: queue,
            onOpen: _openAction,
            onShown: _reportShown,
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
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
                  // Only live when there is somewhere to go. While loading, or
                  // with no open conference, the chip is a status read-out.
                  onTap: conference == null
                      ? null
                      : () {
                          CurrentConferenceHolder.instance.target(conference.id);
                          context.go('/conference/gate');
                        },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _SecondaryChip(
                  icon: Icons.account_circle_rounded,
                  label: signals.profileIncomplete
                      ? 'Profile ${signals.profileCompletion}%\ncomplete'
                      : '${signals.badgesEarned} badges\nearned',
                  accent: CommonsColors.accent,
                  muted: true,
                  // Both states are about the user's profile, so both land on
                  // it — incomplete to finish it, complete to see the badges.
                  onTap: () => context.go('/commons/profile'),
                ),
              ),
            ],
          ),
        ),
        // In option 1a the street sits directly on the deep field — the single
        // torn edge lives under the wordmark, so there is no panel down here.
        const Padding(
          padding: EdgeInsets.fromLTRB(20, 30, 20, 16),
          child: _SectionHeader(
            title: 'WHERE TO GO',
            trailing: 'Swipe the street →',
          ),
        ),
        _ShopStreet(
          key: _tourStreet,
          hasExpansionAccess: hasExpansionAccess,
          waiting: waiting,
          conference: conference,
          conferenceLoading: conferenceLoading,
          signals: signals,
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 30, 20, 40),
          child: _EventsStrip(key: _tourEvents, events: upcoming),
        ),
      ],
    );
  }
}

/// The card/scan control: a lit squircle beside the wordmark, with the
/// design's 3×3 QR glyph rather than a Material icon.
class _CardScanButton extends StatelessWidget {
  const _CardScanButton({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'My card and scan',
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(15),
        child: InkWell(
          borderRadius: BorderRadius.circular(15),
          onTap: onTap,
          child: Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(15),
              border: Border.all(color: const Color(0x73FFFFFF)),
              // Same light source as every other lit control, in the zone
              // accent rather than a hardcoded red.
              gradient: GlowPill.bloom(Theme.of(context).colorScheme.primary),
            ),
            child: const Center(child: _QrGlyph()),
          ),
        ),
      ),
    );
  }
}

/// The design's QR mark: a 3×3 grid with the four corners, centre and edges
/// lit — five dots on the diagonal pattern.
class _QrGlyph extends StatelessWidget {
  const _QrGlyph();

  static const List<bool> _on = [
    true, false, true,
    false, true, false,
    true, false, true,
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 19,
      height: 19,
      child: GridView.count(
        crossAxisCount: 3,
        mainAxisSpacing: 2,
        crossAxisSpacing: 2,
        physics: const NeverScrollableScrollPhysics(),
        children: [
          for (final lit in _on)
            DecoratedBox(
              decoration: BoxDecoration(
                color: lit ? Colors.white : Colors.transparent,
              ),
            ),
        ],
      ),
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
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Color(0xD9FFFFFF),
            fontSize: 11,
            fontWeight: FontWeight.w600,
            // .24em at 11px.
            letterSpacing: 2.64,
            height: 1,
          ),
        ),
        const Spacer(),
        if (trailing != null)
          Text(
            trailing!,
            style: const TextStyle(
              color: Cosmic.textFaint,
              fontSize: 10.5,
              fontWeight: FontWeight.w300,
              fontStyle: FontStyle.italic,
              height: 1,
            ),
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
    this.onTap,
  });

  final IconData icon;
  final String label;
  final Color accent;
  final bool muted;

  /// Null leaves the chip inert — a status read-out rather than a control.
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    // The design splits the chip's copy across two lines with different
    // weights: the fact on top, its qualifier under it.
    final lines = label.split('\n');
    final head = lines.first;
    final tail = lines.length > 1 ? lines.sublist(1).join(' ') : null;

    final body = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      child: Row(
        children: [
          // The option draws a bare 22px ring here; the icon inside keeps the
          // two chips distinguishable without changing the silhouette.
          Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0x73FFFFFF)),
            ),
            child: Icon(icon, size: 12, color: muted ? Cosmic.textMuted : accent),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text.rich(
              TextSpan(
                text: head,
                children: [
                  if (tail != null)
                    TextSpan(
                      text: '\n$tail',
                      style: const TextStyle(
                        color: Cosmic.textMuted,
                        fontWeight: FontWeight.w300,
                      ),
                    ),
                ],
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Cosmic.textPrimary,
                fontSize: 11.5,
                height: 1.35,
                fontWeight: FontWeight.w400,
              ),
            ),
          ),
          // A chevron only where there is somewhere to go, so a tappable chip
          // is distinguishable from an inert one at a glance.
          if (onTap != null)
            const Padding(
              padding: EdgeInsets.only(left: 4),
              child: Icon(
                Icons.chevron_right_rounded,
                size: 16,
                color: Cosmic.textFaint,
              ),
            ),
        ],
      ),
    );

    final shape = BorderRadius.circular(16);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: shape,
        border: Border.all(color: Cosmic.chipBorder),
        gradient: Cosmic.chipFill,
      ),
      // Material + InkWell rather than GestureDetector so the tap gets the
      // standard ripple; the chip previously had no handler at all.
      child: Material(
        color: Colors.transparent,
        borderRadius: shape,
        child: onTap == null
            ? body
            : InkWell(borderRadius: shape, onTap: onTap, child: body),
      ),
    );
  }
}

/// The three shops as a horizontally scrollable street.
class _ShopStreet extends StatelessWidget {
  const _ShopStreet({
    super.key,
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
      height: 226,
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
            planetAsset: MortarversePlanets.networkingHall,
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
            planetAsset: MortarversePlanets.conferenceCenter,
            enabled: conferenceOpen,
            onTap: conferenceOpen
                ? () {
                    CurrentConferenceHolder.instance.target(conference!.id);
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
            planetAsset: MortarversePlanets.commons,
            enabled: true,
            outlinedPill: true,
            onTap: () => context.go('/commons/profile'),
          ),
          const SizedBox(width: 12),
          // Digital Curriculum is a separate web app, so this leaves the app
          // rather than routing — the street is where people look for "where
          // can I go", and the curriculum was missing from it entirely.
          _ShopTile(
            title: 'DIGITAL\nCURRICULUM',
            subtitle: 'Courses • Alumni application',
            pill: 'ON THE WEB',
            shopColor: _curriculumAccent,
            planetAsset: MortarversePlanets.digitalCurriculum,
            planetFallbackTint: _curriculumAccent,
            enabled: true,
            outlinedPill: true,
            onTap: () => _openCurriculum(context),
          ),
        ],
      ),
    );
  }

  /// Curriculum's own blue — distinct from Expansion red, Conference gold and
  /// the Commons accent, so the street stays readable at a glance.
  static const Color _curriculumAccent = Color(0xFF5B9DFF);

  Future<void> _openCurriculum(BuildContext context) async {
    unawaited(ExpansionAnalytics.log(
      'mortarverse_digital_curriculum_opened',
      sourceScreen: 'mortarverse',
    ));
    await safeLaunchExternalUrl(
      Uri.parse(AppLinks.digitalCurriculum),
      messengerContext: context,
      userFailureMessage: 'Could not open Digital Curriculum.',
    );
  }
}

class _ShopTile extends StatefulWidget {
  const _ShopTile({
    required this.title,
    required this.subtitle,
    required this.pill,
    required this.shopColor,
    required this.planetAsset,
    required this.enabled,
    required this.onTap,
    this.outlinedPill = false,
    this.planetFallbackTint,
  });

  final String title;
  final String subtitle;
  final String pill;
  final Color shopColor;

  /// The destination's planet illustration.
  final String planetAsset;

  /// Colour for the plain sphere drawn while [planetAsset] has no artwork yet.
  final Color? planetFallbackTint;

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
          child: SizedBox(
            width: 132,
            child: Column(
              children: [
                // Planet with its orbit ring, and the status pill riding up
                // over the lower edge — the option's `margin-top:-12px`.
                Stack(
                  alignment: Alignment.topCenter,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: SizedBox(
                        width: 132,
                        height: 132,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            // `inset:-9px` ring around the disc.
                            Container(
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: const Color(0x1FFFFFFF),
                                ),
                              ),
                            ),
                            MortarversePlanet(
                              asset: widget.planetAsset,
                              size: 114,
                              enabled: widget.enabled,
                              fallbackTint: widget.planetFallbackTint,
                            ),
                          ],
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      child: _StatusPill(
                        label: widget.pill,
                        lit: !widget.outlinedPill && widget.enabled,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  widget.title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12.5,
                    height: 1.3,
                    fontWeight: FontWeight.w600,
                    // .1em at 12.5px.
                    letterSpacing: 1.25,
                  ),
                ),
                const SizedBox(height: 7),
                Flexible(
                  child: Text(
                    widget.subtitle,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      // Urgency reads in the accent; everything else recedes.
                      color: color == AppColors.primary && widget.subtitle.contains('waiting')
                          ? Cosmic.textAccent
                          : Cosmic.textFaint,
                      fontSize: 10.5,
                      height: 1.25,
                      fontWeight: FontWeight.w300,
                      fontStyle: FontStyle.italic,
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

/// The status capsule that sits over a planet's lower edge.
///
/// [lit] is the design's "OPEN NOW" treatment — near-solid white with dark
/// ink. Everything else takes the recessed "LOCKED" treatment: a smoked
/// capsule with a hairline, so a closed venue never shouts.
class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.lit});

  final String label;
  final bool lit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: lit ? const Color(0xEBFFFFFF) : const Color(0xD90A0004),
        border: lit ? null : Border.all(color: const Color(0x4DFFFFFF)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: lit ? const Color(0xFF12040A) : const Color(0xB3FFFFFF),
          fontSize: 9,
          fontWeight: FontWeight.w500,
          // .16em at 9px.
          letterSpacing: 1.44,
          height: 1,
        ),
      ),
    );
  }
}

/// Upcoming MORTAR events. Hidden entirely when there are none — an empty
/// strip would just be a heading over nothing.
class _EventsStrip extends StatelessWidget {
  const _EventsStrip({super.key, required this.events});

  final List<CommunityEvent> events;

  @override
  Widget build(BuildContext context) {
    if (events.isEmpty) return const SizedBox.shrink();
    final shown = events.take(2).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () => context.push('/events'),
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
      child: InkWell(
        onTap: () => context.push('/events/${event.id}'),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.white.withValues(alpha: 0.09)),
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: const BoxDecoration(color: Color(0x0DFFFFFF)),
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
                        color: Cosmic.textFaint,
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
                        style: TextStyle(color: Cosmic.textFaint, fontSize: 11),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
                decoration: BoxDecoration(
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

