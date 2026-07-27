import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/commons_colors.dart';

/// Bottom-nav shell for "The Commons" — the shared/universal features
/// (profile editing, direct messages, badges/certificates) that live outside
/// both the Expansion and Conference "shops", reached from its own tile on
/// the Mortarverse chooser rather than being duplicated inside each app.
class CommonsShell extends StatelessWidget {
  const CommonsShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  static const _destinations = [
    _NavSpec(label: 'Profile', icon: Icons.person_outline_rounded, selectedIcon: Icons.person_rounded),
    _NavSpec(label: 'Messages', icon: Icons.chat_bubble_outline_rounded, selectedIcon: Icons.chat_bubble_rounded),
    _NavSpec(label: 'Badges', icon: Icons.military_tech_outlined, selectedIcon: Icons.military_tech_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(bottom: false, child: navigationShell),
      bottomNavigationBar: SafeArea(
        top: false,
        minimum: EdgeInsets.zero,
        child: NavigationBarTheme(
          data: Theme.of(context).navigationBarTheme.copyWith(
                height: 72,
                labelTextStyle: WidgetStateProperty.resolveWith((states) {
                  if (states.contains(WidgetState.selected)) {
                    return const TextStyle(color: CommonsColors.accent, fontSize: 12, fontWeight: FontWeight.w500);
                  }
                  return const TextStyle(color: Colors.grey, fontSize: 12);
                }),
              ),
          child: NavigationBar(
            selectedIndex: navigationShell.currentIndex,
            onDestinationSelected: navigationShell.goBranch,
            indicatorColor: CommonsColors.accentAlpha(0.2),
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            destinations: [
              for (final d in _destinations)
                NavigationDestination(
                  icon: Icon(d.icon),
                  selectedIcon: Icon(d.selectedIcon, color: CommonsColors.accent),
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
  const _NavSpec({required this.label, required this.icon, required this.selectedIcon});

  final String label;
  final IconData icon;
  final IconData selectedIcon;
}
