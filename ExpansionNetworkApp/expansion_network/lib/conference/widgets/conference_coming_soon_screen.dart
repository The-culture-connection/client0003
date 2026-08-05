import 'package:flutter/material.dart';

import '../theme/conference_colors.dart';

/// Generic "not built yet" placeholder for Conference zones/tabs that belong
/// to a later phase (Network → Phase 4, Messages/Community → Phase 3,
/// Sponsor Hall → Phase 6). Keeps the navigation shell and Figma-matched
/// entry points in place now so nothing needs to be restructured later —
/// see `docs/conference-app-plan.md`.
class ConferenceComingSoonScreen extends StatelessWidget {
  const ConferenceComingSoonScreen({
    required this.title,
    required this.icon,
    required this.description,
    super.key,
  });

  final String title;
  final IconData icon;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: Text(title.toUpperCase(), style: const TextStyle(letterSpacing: 1)),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: ConferenceColors.goldAlpha(0.12),
                  border: Border.all(color: ConferenceColors.goldAlpha(0.4), width: 2),
                ),
                child: Icon(icon, size: 40, color: ConferenceColors.gold),
              ),
              const SizedBox(height: 20),
              Text(
                'Coming soon',
                style: TextStyle(
                  color: ConferenceColors.gold,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                description,
                textAlign: TextAlign.center,
                style: const TextStyle(color: ConferenceColors.mutedForeground),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
