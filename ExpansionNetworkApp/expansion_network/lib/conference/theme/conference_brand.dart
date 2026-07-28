import 'package:flutter/material.dart';

import 'conference_colors.dart';

/// Per-conference branding, resolved from the conference doc.
///
/// Only the *ambient* colours vary. Controls — pills, borders, icons, the FAB —
/// stay [ConferenceColors.gold] on purpose: that accent is a compile-time
/// constant referenced across 23 files, and swapping it per event is a
/// separate, much larger change. Brand identity here comes from imagery and the
/// background wash instead.
class ConferenceBrand {
  const ConferenceBrand({
    this.primary,
    this.secondary,
    this.logoUrl,
    this.heroImageUrl,
  });

  final Color? primary;
  final Color? secondary;
  final String? logoUrl;
  final String? heroImageUrl;

  /// Nothing branded supplied — render exactly as the app did before.
  static const ConferenceBrand none = ConferenceBrand();

  bool get hasWash => primary != null;

  /// Top-of-screen wash colour, kept subtle so white text stays readable.
  Color get washTop => (primary ?? ConferenceColors.gold).withValues(alpha: 0.42);

  Color get washMid =>
      (secondary ?? primary ?? ConferenceColors.gold).withValues(alpha: 0.16);

  /// Faint grid lines, matching the density of the default backdrop.
  Color get gridLine => (primary ?? ConferenceColors.gold).withValues(alpha: 0.05);

  /// Builds from a conference doc's fields. Unparseable colours fall back to
  /// the default look rather than throwing.
  static ConferenceBrand from({
    String? brandColor,
    String? brandColorSecondary,
    String? logoUrl,
    String? heroImageUrl,
  }) {
    String? clean(String? v) =>
        (v != null && v.trim().isNotEmpty) ? v.trim() : null;
    return ConferenceBrand(
      primary: parseHexColor(brandColor),
      secondary: parseHexColor(brandColorSecondary),
      logoUrl: clean(logoUrl),
      heroImageUrl: clean(heroImageUrl),
    );
  }
}

/// Parses `#RRGGBB`, `RRGGBB` or `#AARRGGBB`. Returns null on anything else —
/// an admin typo should degrade to the default theme, not crash the app.
Color? parseHexColor(String? raw) {
  var s = raw?.trim();
  if (s == null || s.isEmpty) return null;
  if (s.startsWith('#')) s = s.substring(1);
  if (s.length == 6) s = 'FF$s';
  if (s.length != 8) return null;
  final value = int.tryParse(s, radix: 16);
  return value == null ? null : Color(value);
}
