import 'dart:math';

import 'package:flutter/material.dart';

import '../../theme/grunge_texture.dart';

/// Scorched panel with a torn-paper top edge — the Mortarverse mockup's
/// ripped strip. Shared across landing, auth, and hub screens.
///
/// The fill is [GrungeSurface] rather than flat glass, so the ripped lip
/// opens onto burnt material instead of a clean translucent sheet.
class TornPanel extends StatelessWidget {
  const TornPanel({
    super.key,
    required this.child,
    this.seed = 11,
    this.intensity = 1,
  });

  final Widget child;

  /// Vary per screen so torn edges and grain don't look stamped from one
  /// template. Feeds both the rip and the texture.
  final int seed;

  /// Passed through to [GrungeSurface.intensity]; drop it on panels carrying
  /// dense body copy.
  final double intensity;

  @override
  Widget build(BuildContext context) {
    return ClipPath(
      clipper: _TornEdgeClipper(seed),
      child: GrungeSurface(
        seed: seed,
        intensity: intensity,
        child: DecoratedBox(
          decoration: const BoxDecoration(
            border: Border(
              top: BorderSide(color: Color(0x26FFFFFF), width: 0.5),
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}

class _TornEdgeClipper extends CustomClipper<Path> {
  _TornEdgeClipper(this.seed);

  final int seed;

  @override
  Path getClip(Size size) {
    final rng = Random(seed);
    final path = Path()..moveTo(0, 14);
    var x = 0.0;
    while (x < size.width) {
      x += 14 + rng.nextDouble() * 26;
      final y = 2 + rng.nextDouble() * 16;
      path.lineTo(min(x, size.width), y);
    }
    path
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    return path;
  }

  @override
  bool shouldReclip(covariant _TornEdgeClipper oldClipper) =>
      oldClipper.seed != seed;
}
