import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../analytics/expansion_analytics.dart';
import '../theme/app_theme.dart';
import 'badge_earned_session_listener.dart';

/// Bottom navigation matching [UI Basis/src/app/components/BottomNav.tsx]:
/// Home, Events, Groups, Explore, Profile.
class ExpansionShell extends StatelessWidget {
  const ExpansionShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  static const _destinations = [
    _NavSpec(
      label: 'Home',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home_rounded,
    ),
    _NavSpec(
      label: 'Events',
      icon: Icons.calendar_month_outlined,
      selectedIcon: Icons.calendar_month_rounded,
    ),
    _NavSpec(
      label: 'Groups',
      icon: Icons.groups_outlined,
      selectedIcon: Icons.groups_rounded,
    ),
    _NavSpec(
      label: 'Explore',
      icon: Icons.explore_outlined,
      selectedIcon: Icons.explore_rounded,
    ),
    _NavSpec(
      label: 'Profile',
      icon: Icons.person_outline_rounded,
      selectedIcon: Icons.person_rounded,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: BadgeEarnedSessionListener(
          child: navigationShell,
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
            selectedIndex: navigationShell.currentIndex,
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
              navigationShell.goBranch(i);
            },
            backgroundColor: AppColors.card,
            indicatorColor: AppColors.primary.withValues(alpha: 0.2),
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            destinations: [
              for (final d in _destinations)
                NavigationDestination(
                  icon: Icon(d.icon),
                  selectedIcon: Icon(d.selectedIcon, color: AppColors.primary),
                  label: d.label,
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
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
}
