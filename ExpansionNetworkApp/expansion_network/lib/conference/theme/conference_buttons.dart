import 'package:flutter/material.dart';

import '../../theme/cosmic.dart';

/// Re-themes everything under `/conference/*` to the conference gold.
///
/// The app's base theme is [cosmicTheme] in the Expansion red. Accent is the
/// only thing that varies by zone — surfaces, radii, spacing and type are
/// identical everywhere — so this is a single call rather than a parallel set
/// of button themes.
///
/// Wrapping here rather than inside each screen means a new conference route
/// picks the accent up for free.
class ConferenceTheme extends StatelessWidget {
  const ConferenceTheme({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: cosmicTheme(accent: Cosmic.accentConference),
      child: child,
    );
  }
}
