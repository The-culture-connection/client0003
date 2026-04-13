import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';

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
        child: navigationShell,
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
            onDestinationSelected: navigationShell.goBranch,
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
