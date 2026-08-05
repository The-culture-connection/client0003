import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import 'conference_colors.dart';

/// Re-themes the button set in gold for everything under `/conference/*`.
///
/// The app-wide button themes in [buildAppTheme] carry a brick-red
/// `shadowColor`. Conference screens override `backgroundColor` to gold but
/// leave elevation alone, so without this wrapper they would inherit that red
/// glow — the exact cross-brand bleed [ConferenceColors] exists to prevent.
///
/// This keeps the *shape* of the new button language (sunken slab, ember ring,
/// tracked-out caps, glow on press) and swaps only the hue, so conference
/// buttons read as the same system in a different key.
class ConferenceTheme extends StatelessWidget {
  const ConferenceTheme({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context);
    return Theme(
      data: base.copyWith(
        // PRIMARY — solid gold, dark ink. Gold is bright, so the glow runs
        // cooler than the red equivalent or it blooms into the page.
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: ConferenceColors.gold,
            foregroundColor: Colors.black,
            disabledBackgroundColor: ConferenceColors.goldAlpha(0.16),
            disabledForegroundColor: ConferenceColors.goldDim,
            shadowColor: ConferenceColors.gold,
            padding: AppButtons.padding,
            shape: AppButtons.shape,
            textStyle: AppButtons.label,
          ).copyWith(elevation: AppButtons.glow(10)),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: ConferenceColors.gold,
            foregroundColor: Colors.black,
            disabledBackgroundColor: ConferenceColors.goldAlpha(0.16),
            disabledForegroundColor: ConferenceColors.goldDim,
            shadowColor: ConferenceColors.gold,
            padding: AppButtons.padding,
            shape: AppButtons.shape,
            textStyle: AppButtons.label,
          ).copyWith(elevation: AppButtons.glow(10)),
        ),
        // SECONDARY — sunken slab ringed in gold.
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            backgroundColor: Colors.black.withValues(alpha: 0.55),
            foregroundColor: ConferenceColors.gold,
            disabledForegroundColor: ConferenceColors.mutedForeground,
            shadowColor: ConferenceColors.gold,
            padding: AppButtons.padding,
            shape: AppButtons.shape,
            textStyle: AppButtons.label,
          ).copyWith(
            elevation: AppButtons.glow(7),
            side: WidgetStateProperty.resolveWith((states) {
              if (states.contains(WidgetState.disabled)) {
                return const BorderSide(color: ConferenceColors.cardBorder);
              }
              if (states.contains(WidgetState.pressed) ||
                  states.contains(WidgetState.hovered) ||
                  states.contains(WidgetState.focused)) {
                return const BorderSide(color: ConferenceColors.gold, width: 1.6);
              }
              return BorderSide(color: ConferenceColors.goldAlpha(0.5), width: 1.2);
            }),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: ConferenceColors.gold,
            disabledForegroundColor: ConferenceColors.mutedForeground,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            shape: AppButtons.shape,
            textStyle: AppButtons.label.copyWith(
              fontSize: 12,
              letterSpacing: 1.2,
            ),
          ),
        ),
      ),
      child: child,
    );
  }
}
