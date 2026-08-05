import 'package:flutter/material.dart';

/// The illustrated planet art, one per destination.
abstract final class MortarversePlanets {
  static const String networkingHall = 'assets/planets/networking_hall.png';
  static const String conferenceCenter = 'assets/planets/conference_center.png';
  static const String commons = 'assets/planets/commons.png';
}

/// A destination rendered as its planet illustration.
///
/// [size] is the diameter of the *sphere*, not the size of the widget's box —
/// which is what makes the three line up. All three source images are
/// 1920×1080 with a transparent background and the sphere centred at 858px
/// tall, so the art is scaled off that constant rather than fitted to the box.
///
/// Fitting them normally would go wrong two ways. `BoxFit.contain` in a square
/// would letterbox the 16:9 canvas and shrink the sphere to ~45% of the box,
/// and `BoxFit.cover` would crop the sides — which is fine for two of them but
/// slices the tips off Networking Hall's ring, the one image whose content is
/// wider than its sphere. So the image is laid out at full size inside an
/// [OverflowBox] and allowed to spill: the spill is transparent margin plus,
/// for Networking Hall, the ring.
class MortarversePlanet extends StatelessWidget {
  const MortarversePlanet({
    super.key,
    required this.asset,
    this.size = 104,
    this.enabled = true,
  });

  final String asset;

  /// Diameter of the sphere, and the side of the square this occupies in
  /// layout. Anything wider than the sphere overhangs without taking space.
  final double size;

  /// Disabled planets dim; they never grey out entirely, so a locked
  /// destination still reads as somewhere real.
  final bool enabled;

  /// Sphere height ÷ canvas height (858 / 1080) in all three source images.
  static const double _sphereFraction = 858 / 1080;

  /// Canvas aspect ratio (1920 / 1080).
  static const double _canvasAspect = 1920 / 1080;

  /// Widest content ÷ canvas width, from Networking Hall's ring (1164 / 1920).
  /// The others are narrower, so this bounds the overhang for all three.
  static const double _widestContentFraction = 1164 / 1920;

  /// How far content reaches past the sphere on each side, in units of [size].
  /// At the default 104 that is ~19px — inside the 22px the shop tile already
  /// pads, so a planet never touches its neighbour.
  static double overhangFor(double size) {
    final canvasWidth = size / _sphereFraction * _canvasAspect;
    return (canvasWidth * _widestContentFraction - size) / 2;
  }

  @override
  Widget build(BuildContext context) {
    final canvasHeight = size / _sphereFraction;
    final canvasWidth = canvasHeight * _canvasAspect;

    return SizedBox(
      width: size,
      height: size,
      child: Opacity(
        opacity: enabled ? 1 : 0.55,
        child: OverflowBox(
          minWidth: canvasWidth,
          maxWidth: canvasWidth,
          minHeight: canvasHeight,
          maxHeight: canvasHeight,
          child: Image.asset(
            asset,
            // Constraints are already the canvas aspect, so fill and contain
            // agree — fill just skips the extra fitting work.
            fit: BoxFit.fill,
            filterQuality: FilterQuality.medium,
            // Flat vector art: a missing asset should not take out the screen.
            errorBuilder: (_, __, ___) => const SizedBox.shrink(),
          ),
        ),
      ),
    );
  }
}
