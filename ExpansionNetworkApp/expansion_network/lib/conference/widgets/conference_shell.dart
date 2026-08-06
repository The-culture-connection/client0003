import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../current_conference_holder.dart';
import '../../theme/cosmic_content.dart';
import '../theme/conference_colors.dart';
import '../widgets/conference_coming_soon_screen.dart';
import 'conference_scope.dart';

/// Bottom-nav shell for a single conference — a floating gold pill bar
/// matching `Conference App Figma Mockup/src/app/pages/ConferenceLobby.tsx`'s
/// premium bottom navigation. Messages and Profile are not tabs here — they
/// live in the shared "Commons" (`lib/commons/`), reached from its own
/// Mortarverse tile, so they aren't duplicated per app. The id comes from
/// [CurrentConferenceHolder] rather than a route path parameter — see that
/// class's doc comment for why.
class ConferenceShell extends StatefulWidget {
  const ConferenceShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  static const _destinations = [
    _NavSpec(label: 'Lobby', icon: Icons.storefront_outlined, selectedIcon: Icons.storefront_rounded),
    _NavSpec(label: 'Sponsors', icon: Icons.business_center_outlined, selectedIcon: Icons.business_center_rounded),
    _NavSpec(label: 'Events', icon: Icons.event_note_outlined, selectedIcon: Icons.event_note_rounded),
  ];

  /// Bottom margin (12) + the pill's own height: 6 padding, a 20 icon, a 2 gap
  /// and a ~11 label, 6 padding.
  static const double _pillExtent = 12 + 6 + 20 + 2 + 11 + 6;

  /// Vertical space the floating nav pill occupies above the bottom edge.
  ///
  /// Branch screens set [Scaffold.extendBody], so their own content is drawn
  /// *behind* the pill — anything anchored to the bottom (a FAB, a sticky CTA)
  /// must be offset by this much to stay tappable.
  static double navBarClearance(BuildContext context) =>
      _pillExtent + MediaQuery.paddingOf(context).bottom;

  @override
  State<ConferenceShell> createState() => _ConferenceShellState();
}

class _ConferenceShellState extends State<ConferenceShell> {
  String? _conferenceId;
  final bool _loading = false;

  @override
  void initState() {
    super.initState();
    // Nothing to resolve. Admission is decided by the router's conference gate
    // and [CurrentConferenceHolder] before this shell can be built — a cold
    // deep link into `/conference/*` is bounced to the ticket gate, which
    // admits properly or refuses. Self-resolving an id here (the old
    // `fetchActiveConference` fallback) would have handed the shell a
    // conference nobody had checked, so it is deliberately gone.
    _conferenceId = CurrentConferenceHolder.instance.conferenceId;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Colors.transparent,
        body: Center(child: CircularProgressIndicator(color: ConferenceColors.gold)),
      );
    }
    final conferenceId = _conferenceId;
    if (conferenceId == null) {
      return Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(backgroundColor: Colors.transparent, title: const Text('Conference')),
        body: const Center(
          child: Text('No conference is open right now.', style: TextStyle(color: ConferenceColors.mutedForeground)),
        ),
      );
    }
    return ConferenceScope(
      conferenceId: conferenceId,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        extendBody: true,
        body: widget.navigationShell,
        bottomNavigationBar: CosmicBottomNav(
          index: widget.navigationShell.currentIndex,
          accent: Cosmic.accentConference,
          items: [
            for (final d in ConferenceShell._destinations)
              CosmicNavItem(label: d.label, icon: d.selectedIcon),
          ],
          onSelect: widget.navigationShell.goBranch,
        ),
      ),
    );
  }
}

class _NavSpec {
  const _NavSpec({required this.label, required this.icon, required this.selectedIcon});

  final String label;
  final IconData icon;
  final IconData selectedIcon;
}

/// Network zone — Phase 4 (QR connect + matching).
class ConferenceNetworkScreen extends StatelessWidget {
  const ConferenceNetworkScreen({super.key});

  @override
  Widget build(BuildContext context) => const ConferenceComingSoonScreen(
        title: 'Network',
        icon: Icons.groups_rounded,
        description: 'QR-connect and suggested matches arrive in a later update.',
      );
}

