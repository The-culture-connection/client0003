import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:tutorial_coach_mark/tutorial_coach_mark.dart';

import '../analytics/expansion_analytics.dart';
import '../theme/app_theme.dart';
import 'badge_earned_session_listener.dart';
import 'expansion_tour.dart';

/// Bottom navigation matching [UI Basis/src/app/components/BottomNav.tsx]:
/// Home, Events, Groups, Explore, Profile.
class ExpansionShell extends StatefulWidget {
  const ExpansionShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  /// Replays the guided tour from anywhere (e.g. a "How to use the app"
  /// entry on the Profile screen).
  static void replayTour() => _ExpansionShellState._instance?._startTour();

  @override
  State<ExpansionShell> createState() => _ExpansionShellState();
}

class _ExpansionShellState extends State<ExpansionShell> {
  static _ExpansionShellState? _instance;

  // Stable keys anchored to each bottom-nav icon so the coach-mark tour can
  // spotlight them. NavigationBar renders both the unselected and selected
  // icon, so we keep a key for each and target whichever the tour needs.
  final List<GlobalKey> _iconKeys = List.generate(4, (_) => GlobalKey());
  final List<GlobalKey> _selectedIconKeys = List.generate(4, (_) => GlobalKey());
  TutorialCoachMark? _activeTour;

  static const _destinations = [
    _NavSpec(
      label: 'Home',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home_rounded,
      tourTitle: 'Home',
      tourBody:
          'Your dashboard — run Smart Matching to meet members, catch up on '
          'MORTAR HQ announcements, and see recent activity from your communities.',
    ),
    _NavSpec(
      label: 'Events',
      icon: Icons.calendar_month_outlined,
      selectedIcon: Icons.calendar_month_rounded,
      tourTitle: 'Events',
      tourBody:
          'Browse and register for alumni events. Switch between All Events and '
          'the ones you\'ve already registered for.',
    ),
    _NavSpec(
      label: 'Groups',
      icon: Icons.groups_outlined,
      selectedIcon: Icons.groups_rounded,
      tourTitle: 'Groups',
      tourBody:
          'Join communities, start discussions and meet other alumni. Tap the '
          '+ in the header to create your own group.',
    ),
    _NavSpec(
      label: 'Explore',
      icon: Icons.explore_outlined,
      selectedIcon: Icons.explore_rounded,
      tourTitle: 'Explore',
      tourBody:
          'Post a job, offer a skill, or search the member network — then '
          'message anyone directly from their card.',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _instance = this;
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeAutoRunTour());
  }

  @override
  void dispose() {
    if (identical(_instance, this)) _instance = null;
    _activeTour?.finish();
    super.dispose();
  }

  Future<void> _maybeAutoRunTour() async {
    if (!mounted) return;
    if (await hasSeenExpansionTour()) return;
    // Let the first frame settle so the nav icons have a laid-out position.
    await Future<void>.delayed(const Duration(milliseconds: 700));
    if (!mounted) return;
    _startTour();
    await markExpansionTourSeen();
  }

  void _startTour() {
    if (!mounted) return;
    _activeTour?.finish();
    final currentIndex = widget.navigationShell.currentIndex;
    final steps = <TourStep>[
      for (var i = 0; i < _destinations.length; i++)
        TourStep(
          // Spotlight the icon that is actually painted for this tab.
          key: i == currentIndex ? _selectedIconKeys[i] : _iconKeys[i],
          title: _destinations[i].tourTitle,
          body: _destinations[i].tourBody,
        ),
    ];
    final tour = buildExpansionTour(
      steps: steps,
      onDone: () => _activeTour = null,
    );
    _activeTour = tour;
    tour.show(context: context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            BadgeEarnedSessionListener(
              child: widget.navigationShell,
            ),
            Positioned(
              top: 8,
              right: 8,
              child: Material(
                color: Colors.black.withValues(alpha: 0.55),
                shape: const CircleBorder(),
                child: IconButton(
                  onPressed: () {
                    unawaited(
                      ExpansionAnalytics.log('expansion_exit_to_mortarverse_clicked', sourceScreen: 'main_shell'),
                    );
                    context.go('/mortarverse');
                  },
                  icon: const Icon(Icons.logout_rounded, color: Colors.white, size: 20),
                  tooltip: 'Back to the MORTARVERSE',
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        minimum: EdgeInsets.zero,
        child: NavigationBarTheme(
          data: Theme.of(context).navigationBarTheme.copyWith(
                height: 72,
              ),
          child: NavigationBar(
            selectedIndex: widget.navigationShell.currentIndex,
            onDestinationSelected: (i) {
              unawaited(
                ExpansionAnalytics.log(
                  'main_tab_selected',
                  sourceScreen: 'main_shell',
                  extra: <String, Object?>{
                    'tab_index': i,
                    'tab_label': _destinations[i].label,
                  },
                ),
              );
              widget.navigationShell.goBranch(i);
            },
            backgroundColor: AppColors.card,
            indicatorColor: AppColors.primary.withValues(alpha: 0.2),
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            destinations: [
              for (var i = 0; i < _destinations.length; i++)
                NavigationDestination(
                  icon: Icon(_destinations[i].icon, key: _iconKeys[i]),
                  selectedIcon: Icon(
                    _destinations[i].selectedIcon,
                    color: AppColors.primary,
                    key: _selectedIconKeys[i],
                  ),
                  label: _destinations[i].label,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavSpec {
  const _NavSpec({
    required this.label,
    required this.icon,
    required this.selectedIcon,
    required this.tourTitle,
    required this.tourBody,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final String tourTitle;
  final String tourBody;
}
