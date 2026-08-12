import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../theme/commons_colors.dart';

/// Bottom-nav shell for "The Commons" — the shared/universal features
/// (profile editing, direct messages, badges/certificates) that live outside
/// both the Expansion and Conference "shops", reached from its own tile on
/// the Mortarverse chooser rather than being duplicated inside each app.
class CommonsShell extends StatefulWidget {
  const CommonsShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  @override
  State<CommonsShell> createState() => _CommonsShellState();
}

class _CommonsShellState extends State<CommonsShell> {
  static const _destinations = [
    _NavSpec(label: 'Profile', icon: Icons.person_outline_rounded, selectedIcon: Icons.person_rounded),
    _NavSpec(label: 'Messages', icon: Icons.chat_bubble_outline_rounded, selectedIcon: Icons.chat_bubble_rounded),
    _NavSpec(label: 'Badges', icon: Icons.military_tech_outlined, selectedIcon: Icons.military_tech_rounded),
  ];

  /// One-time "what is The Commons" explainer (beta feedback: "needs to be
  /// instructions on what 'the commons' is"). Hidden once dismissed.
  static const String _introSeenPrefsKey = 'commons_intro_seen_v1';

  bool _showIntro = false;

  @override
  void initState() {
    super.initState();
    unawaited(_loadIntroSeen());
  }

  Future<void> _loadIntroSeen() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (!mounted) return;
      if (prefs.getBool(_introSeenPrefsKey) != true) {
        setState(() => _showIntro = true);
      }
    } catch (_) {
      // Prefs unavailable — skip the banner rather than nag on every visit.
    }
  }

  Future<void> _dismissIntro() async {
    setState(() => _showIntro = false);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_introSeenPrefsKey, true);
    } catch (_) {
      // Best-effort persistence only.
    }
  }

  Widget _introBanner(BuildContext context) {
    return Material(
      color: CommonsColors.accentAlpha(0.14),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 4, 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.info_outline_rounded, size: 18, color: CommonsColors.accent),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Welcome to The Commons — your community space. Your profile, '
                'direct messages, and badges all live here.',
                style: TextStyle(fontSize: 12.5, height: 1.35),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, size: 18),
              tooltip: 'Dismiss',
              onPressed: () => unawaited(_dismissIntro()),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            if (_showIntro) _introBanner(context),
            Expanded(child: widget.navigationShell),
          ],
        ),
      ),
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
            selectedIndex: widget.navigationShell.currentIndex,
            onDestinationSelected: widget.navigationShell.goBranch,
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
