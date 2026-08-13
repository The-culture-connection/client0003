import 'package:flutter/material.dart';

/// The illustrated planet art, one per destination.
///
/// These are the supplied illustrations in `assets/planets/`. A procedural
/// painter briefly stood in for them; the artwork is the source of truth, so
/// replacing a planet means replacing its PNG, not editing code.
abstract final class MortarversePlanets {
  static const String networkingHall = 'assets/planets/networking_hall.png';
  static const String conferenceCenter = 'assets/planets/conference_center.png';
  static const String commons = 'assets/planets/commons.png';
  static const String digitalCurriculum = 'assets/planets/digital_curriculum.png';
}

/// A destination rendered as its planet illustration.
///
/// [size] is the diameter of the *sphere*, not the size of the widget's box —
/// which is what makes the four line up. All four source images share the same
/// geometry: a 1920×1080 transparent canvas with the sphere occupying the band
/// y 108–971 (864px tall, centred). The art is scaled off that constant rather
/// than fitted to the box, so **replacement art must keep that geometry** or
/// the planets change size relative to each other.
///
/// Fitting them normally would go wrong two ways. `BoxFit.contain` in a square
/// would letterbox the 16:9 canvas and shrink the sphere to ~45% of the box,
/// and `BoxFit.cover` would crop the sides — fine for the plain spheres, but it
/// slices the edges off the images whose content is wider than their sphere
/// (Networking Hall's ring, Commons' halo). So the image is laid out at full
/// size inside an [OverflowBox] and allowed to spill: the spill is transparent
/// margin plus, for those two, the ring and halo.
class MortarversePlanet extends StatelessWidget {
  const MortarversePlanet({
    super.key,
    required this.asset,
    this.size = 104,
    this.enabled = true,
    this.fallbackTint,
  });

  final String asset;

  /// Diameter of the sphere, and the side of the square this occupies in
  /// layout. Anything wider than the sphere overhangs without taking space.
  final double size;

  /// Disabled planets dim; they never grey out entirely, so a locked
  /// destination still reads as somewhere real.
  final bool enabled;

  /// Drawn as a plain lit sphere if [asset] is missing, so a destination whose
  /// artwork hasn't landed yet still holds its place in the street instead of
  /// leaving a gap.
  final Color? fallbackTint;

  /// Sphere height ÷ canvas height (864 / 1080) in all four source images.
  static const double _sphereFraction = 864 / 1080;

  /// Canvas aspect ratio (1920 / 1080).
  static const double _canvasAspect = 1920 / 1080;

  /// Widest content ÷ canvas width, from Commons' halo (1318 / 1920) — the
  /// widest of the four. The others are narrower, so this bounds the overhang
  /// for all of them.
  static const double _widestContentFraction = 1318 / 1920;

  /// How far content reaches past the sphere on each side, in units of [size].
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
            // A missing asset should never take out the whole screen.
            errorBuilder: (_, __, ___) => _fallback(),
          ),
        ),
      ),
    );
  }

  /// A sphere in the destination's accent, sized and centred like the real art
  /// so the street's alignment holds while an illustration is outstanding.
  Widget _fallback() {
    final tint = fallbackTint;
    if (tint == null) return const SizedBox.shrink();
    return Center(
      child: SizedBox(
        width: size,
        height: size,
        child: DecoratedBox(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(
              // Light from the upper left, matching the illustrated planets.
              center: const Alignment(-0.35, -0.4),
              radius: 0.95,
              colors: [
                Color.lerp(tint, Colors.white, 0.35)!,
                tint,
                Color.lerp(tint, Colors.black, 0.72)!,
              ],
              stops: const [0, 0.45, 1],
            ),
            boxShadow: [
              BoxShadow(color: tint.withValues(alpha: 0.35), blurRadius: 26, spreadRadius: 1),
            ],
          ),
        ),
      ),
    );
  }
}
