import 'package:flutter/material.dart';

import '../theme/conference_colors.dart';

/// The event's square logo.
///
/// Falls back to the generic sparkle when the conference hasn't supplied one,
/// or when the image fails to load — a missing logo should never leave a hole
/// in the header.
class ConferenceBrandMark extends StatelessWidget {
  const ConferenceBrandMark({super.key, required this.logoUrl, this.size = 26});

  final String? logoUrl;
  final double size;

  @override
  Widget build(BuildContext context) {
    final url = logoUrl?.trim();
    final fallback = SizedBox(
      width: size,
      height: size,
      child: Center(
        child: Icon(
          Icons.auto_awesome,
          size: size * 0.7,
          color: ConferenceColors.gold,
        ),
      ),
    );
    if (url == null || url.isEmpty) return fallback;

    return ClipRRect(
      borderRadius: BorderRadius.circular(size * 0.26),
      child: Image.network(
        url,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallback,
      ),
    );
  }
}
