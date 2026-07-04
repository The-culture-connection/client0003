import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../current_conference_holder.dart';
import '../services/conference_repository.dart';
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
    _NavSpec(label: 'Network', icon: Icons.groups_outlined, selectedIcon: Icons.groups_rounded),
    _NavSpec(label: 'Events', icon: Icons.event_note_outlined, selectedIcon: Icons.event_note_rounded),
  ];

  @override
  State<ConferenceShell> createState() => _ConferenceShellState();
}

class _ConferenceShellState extends State<ConferenceShell> {
  final ConferenceRepository _repository = ConferenceRepository();
  String? _conferenceId;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _resolveConferenceId();
  }

  Future<void> _resolveConferenceId() async {
    var id = CurrentConferenceHolder.instance.conferenceId;
    if (id == null) {
      // Cold deep link into /conference/* without going through the chooser first.
      final conference = await _repository.fetchActiveConference();
      id = conference?.id;
      CurrentConferenceHolder.instance.conferenceId = id;
    }
    if (mounted) {
      setState(() {
        _conferenceId = id;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(child: CircularProgressIndicator(color: ConferenceColors.gold)),
      );
    }
    final conferenceId = _conferenceId;
    if (conferenceId == null) {
      return Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(backgroundColor: Colors.black, title: const Text('Conference')),
        body: const Center(
          child: Text('No conference is open right now.', style: TextStyle(color: ConferenceColors.mutedForeground)),
        ),
      );
    }
    return ConferenceScope(
      conferenceId: conferenceId,
      child: Scaffold(
        backgroundColor: Colors.black,
        extendBody: true,
        body: widget.navigationShell,
        bottomNavigationBar: SafeArea(
          minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.85),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.6), blurRadius: 20)],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                for (var i = 0; i < ConferenceShell._destinations.length; i++)
                  _NavButton(
                    spec: ConferenceShell._destinations[i],
                    selected: widget.navigationShell.currentIndex == i,
                    onTap: () => widget.navigationShell.goBranch(i),
                  ),
              ],
            ),
          ),
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

class _NavButton extends StatelessWidget {
  const _NavButton({required this.spec, required this.selected, required this.onTap});

  final _NavSpec spec;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? ConferenceColors.gold : Colors.grey.shade500;
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? ConferenceColors.goldAlpha(0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          border: selected ? Border.all(color: ConferenceColors.goldAlpha(0.4)) : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(selected ? spec.selectedIcon : spec.icon, size: 20, color: color),
            const SizedBox(height: 2),
            Text(
              spec.label.toUpperCase(),
              style: TextStyle(fontSize: 9, letterSpacing: 0.5, color: color),
            ),
          ],
        ),
      ),
    );
  }
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

