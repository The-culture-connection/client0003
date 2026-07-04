import 'package:flutter/material.dart';

/// "The Commons" — shared/universal features (profile, messages,
/// notifications) that live outside both the Expansion and Conference
/// "shops" on the Mortarverse chooser. Neutral grey, distinct from
/// Expansion's red (`AppColors.primary`) and Conference's gold
/// (`ConferenceColors.gold`).
abstract final class CommonsColors {
  static const Color accent = Color(0xFFA8A8A8);

  static Color accentAlpha(double opacity) => accent.withValues(alpha: opacity);
}
