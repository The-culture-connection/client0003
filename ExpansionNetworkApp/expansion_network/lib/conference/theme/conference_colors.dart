import 'package:flutter/material.dart';

/// Conference App accent palette — matches the Figma mockup's gold/tan
/// storefront theme (`Conference App Figma Mockup/src/app/pages/*.tsx`,
/// consistently `#e6dbb4`), kept visually distinct from Expansion's red
/// (`AppColors.primary`) throughout every conference-scoped screen.
abstract final class ConferenceColors {
  static const Color gold = Color(0xFFE6DBB4);
  static const Color goldDim = Color(0xFFD4C9A3);
  static const Color background = Color(0xFF000000);
  static const Color atmosphere = Color(0xFF1A1510);
  static const Color card = Color(0x14FFFFFF);
  static const Color cardBorder = Color(0x33FFFFFF);
  static const Color mutedForeground = Color(0xFF9CA3AF);

  static Color goldAlpha(double opacity) => gold.withValues(alpha: opacity);
}
