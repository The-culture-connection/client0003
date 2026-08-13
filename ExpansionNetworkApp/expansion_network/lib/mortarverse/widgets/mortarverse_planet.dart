import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Visual identity of one destination's planet: its base colour (unchanged
/// from the old illustrated art, so each destination keeps its identity), a
/// seed that makes its surface detail unique *and* deterministic — the same
/// bands and mottling every frame and every launch — and whether it wears a
/// ring.
class MortarversePlanetStyle {
  const MortarversePlanetStyle({
    required this.base,
    required this.seed,
    this.ringed = false,
  });

  final Color base;

  /// Seeds the per-planet surface detail. Same seed → same planet, always.
  final int seed;

  /// Networking Hall's ring survives from the old art.
  final bool ringed;
}

/// One style per destination. Base colours are the zones' existing accents,
/// so the chooser reads the same as it did with the illustrated art.
abstract final class MortarversePlanets {
  /// Expansion brick red, ringed — the old art's ringed planet.
  static const MortarversePlanetStyle networkingHall = MortarversePlanetStyle(
    base: Color(0xFFC42430),
    seed: 3,
    ringed: true,
  );

  /// Conference gold.
  static const MortarversePlanetStyle conferenceCenter = MortarversePlanetStyle(
    base: Color(0xFFCBB878),
    seed: 7,
  );

  /// Commons teal.
  static const MortarversePlanetStyle commons = MortarversePlanetStyle(
    base: Color(0xFF4E948C),
    seed: 11,
  );

  /// Digital Curriculum indigo — the web platform's planet.
  static const MortarversePlanetStyle digitalCurriculum = MortarversePlanetStyle(
    base: Color(0xFF5D74C4),
    seed: 17,
  );
}

/// A destination rendered as a painted planet.
///
/// Replaces the flat illustrated PNGs — beta feedback (Shannon) asked for
/// planets that look "more realistic, not cartooney". The rendering is layered
/// in code: limb-darkened sphere lit from the upper left (consistent light
/// direction across all planets), faint latitude banding and surface mottling
/// (deterministic per [MortarversePlanetStyle.seed]), a soft terminator
/// falling away from the light, a small specular highlight, and an atmosphere
/// rim glow. The ringed planet draws its ring behind and in front of the disc.
///
/// [size] is the diameter of the sphere and the side of the square the widget
/// occupies in layout — the glow and ring overhang without taking space, which
/// is what keeps the chooser's tile layout unchanged.
class MortarversePlanet extends StatelessWidget {
  const MortarversePlanet({
    super.key,
    required this.style,
    this.size = 104,
    this.enabled = true,
  });

  final MortarversePlanetStyle style;

  /// Sphere diameter, and the side of this widget's layout square.
  final double size;

  /// Disabled planets dim; they never grey out entirely, so a locked
  /// destination still reads as somewhere real.
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Opacity(
        opacity: enabled ? 1 : 0.55,
        // The painter never animates, so the boundary keeps stream-driven
        // parent rebuilds (waiting counts, conference state) from re-rasterising
        // the blurred glow and gradients every time.
        child: RepaintBoundary(
          child: CustomPaint(
            isComplex: true,
            willChange: false,
            painter: _PlanetPainter(style),
          ),
        ),
      ),
    );
  }
}

/// A latitude band: vertical centre (fraction of radius, -1..1), half
/// thickness, opacity, and whether it lightens or darkens the surface.
class _Band {
  const _Band(this.y, this.halfThickness, this.alpha, this.light);

  final double y;
  final double halfThickness;
  final double alpha;
  final bool light;
}

/// A mottling spot inside the unit disc.
class _Spot {
  const _Spot(this.x, this.y, this.r, this.alpha, this.light);

  final double x;
  final double y;
  final double r;
  final double alpha;
  final bool light;
}

/// Surface detail for one seed. Generated once and cached — deterministic
/// across frames and instances, no per-frame randomness.
class _PlanetFeatures {
  _PlanetFeatures(int seed)
      : bands = _genBands(math.Random(seed)),
        spots = _genSpots(math.Random(seed * 31 + 7));

  final List<_Band> bands;
  final List<_Spot> spots;

  static List<_Band> _genBands(math.Random rnd) {
    final n = 4 + rnd.nextInt(3);
    return List.generate(n, (i) {
      final y = -0.75 + (i + rnd.nextDouble() * 0.6) * (1.5 / n);
      return _Band(
        y.clamp(-0.85, 0.85),
        0.05 + rnd.nextDouble() * 0.10,
        0.05 + rnd.nextDouble() * 0.08,
        rnd.nextBool(),
      );
    });
  }

  static List<_Spot> _genSpots(math.Random rnd) {
    return List.generate(9, (_) {
      final angle = rnd.nextDouble() * 2 * math.pi;
      final dist = math.sqrt(rnd.nextDouble()) * 0.8;
      return _Spot(
        math.cos(angle) * dist,
        math.sin(angle) * dist,
        0.06 + rnd.nextDouble() * 0.14,
        0.04 + rnd.nextDouble() * 0.06,
        rnd.nextBool(),
      );
    });
  }

  static final Map<int, _PlanetFeatures> _cache = {};

  static _PlanetFeatures forSeed(int seed) =>
      _cache.putIfAbsent(seed, () => _PlanetFeatures(seed));
}

class _PlanetPainter extends CustomPainter {
  _PlanetPainter(this.style) : features = _PlanetFeatures.forSeed(style.seed);

  final MortarversePlanetStyle style;
  final _PlanetFeatures features;

  /// Light comes from the upper left on every planet, so the chooser's row
  /// reads as one scene under one sun.
  static const Alignment _light = Alignment(-0.42, -0.48);

  /// Ring tilt, radians.
  static const double _ringTilt = -0.30;

  static Color _lighten(Color c, double t) => Color.lerp(c, Colors.white, t)!;
  static Color _darken(Color c, double t) => Color.lerp(c, Colors.black, t)!;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    final c = size.center(Offset.zero);
    final r = math.min(size.width, size.height) / 2;
    final sphere = Rect.fromCircle(center: c, radius: r);
    final base = style.base;

    if (style.ringed) _drawRing(canvas, c, r, front: false);

    // Atmosphere rim glow — a soft halo hugging the limb, brightest where the
    // light grazes it.
    canvas.drawCircle(
      c,
      r * 1.16,
      Paint()
        ..shader = RadialGradient(
          colors: [
            base.withValues(alpha: 0),
            base.withValues(alpha: 0),
            _lighten(base, 0.25).withValues(alpha: 0.34),
            base.withValues(alpha: 0),
          ],
          stops: const [0, 0.72, 0.86, 1],
        ).createShader(Rect.fromCircle(center: c, radius: r * 1.16)),
    );

    // The sphere itself: lit centre offset toward the light, falling through
    // the base colour to a near-black limb (limb darkening).
    canvas.drawCircle(
      c,
      r,
      Paint()
        ..shader = RadialGradient(
          center: _light,
          radius: 1.35,
          colors: [
            _lighten(base, 0.42),
            _lighten(base, 0.12),
            base,
            _darken(base, 0.42),
            _darken(base, 0.78),
          ],
          stops: const [0, 0.28, 0.52, 0.8, 1],
        ).createShader(sphere),
    );

    // Surface detail, clipped to the disc and tilted slightly so the bands
    // don't read as ruled lines.
    canvas.save();
    canvas.clipPath(Path()..addOval(sphere));
    canvas.translate(c.dx, c.dy);
    canvas.rotate(-0.16);
    final detail = Paint()
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, r * 0.06);
    for (final b in features.bands) {
      detail.color = (b.light ? Colors.white : Colors.black)
          .withValues(alpha: b.alpha);
      canvas.drawOval(
        Rect.fromCenter(
          center: Offset(0, b.y * r),
          // Wider than the disc so a band always spans limb to limb.
          width: r * 2.6,
          height: b.halfThickness * 2 * r,
        ),
        detail,
      );
    }
    for (final s in features.spots) {
      detail.color = (s.light ? Colors.white : Colors.black)
          .withValues(alpha: s.alpha);
      canvas.drawOval(
        Rect.fromCenter(
          center: Offset(s.x * r, s.y * r),
          width: s.r * 2.4 * r,
          height: s.r * 1.5 * r,
        ),
        detail,
      );
    }
    canvas.restore();

    // Terminator — the shadowed limb opposite the light. Painted over the
    // banding so the detail fades into the night side instead of crossing it.
    canvas.drawCircle(
      c,
      r,
      Paint()
        ..shader = RadialGradient(
          center: _light,
          radius: 1.42,
          colors: [
            Colors.black.withValues(alpha: 0),
            Colors.black.withValues(alpha: 0),
            Colors.black.withValues(alpha: 0.42),
            Colors.black.withValues(alpha: 0.72),
          ],
          stops: const [0, 0.62, 0.88, 1],
        ).createShader(sphere),
    );

    // Specular highlight — one small hot spot where the light lands.
    canvas.drawCircle(
      c,
      r,
      Paint()
        ..shader = RadialGradient(
          center: _light,
          radius: 0.38,
          colors: [
            Colors.white.withValues(alpha: 0.38),
            Colors.white.withValues(alpha: 0),
          ],
        ).createShader(sphere),
    );

    if (style.ringed) _drawRing(canvas, c, r, front: true);
  }

  /// The ring as a tilted ellipse: the far arc paints before the sphere, the
  /// near arc after, so the disc sits *inside* the ring. The near side also
  /// casts no light — it darkens slightly where it crosses the night side.
  void _drawRing(Canvas canvas, Offset c, double r, {required bool front}) {
    canvas.save();
    canvas.translate(c.dx, c.dy);
    canvas.rotate(_ringTilt);
    // Keep only the half being drawn (in ring space, +y is the near side).
    final clip = front
        ? Rect.fromLTRB(-r * 2.2, 0, r * 2.2, r * 2.2)
        : Rect.fromLTRB(-r * 2.2, -r * 2.2, r * 2.2, 0);
    canvas.clipRect(clip);

    final outer = Rect.fromCenter(
      center: Offset.zero,
      width: r * 3.35,
      height: r * 1.06,
    );
    canvas.drawOval(
      outer,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = r * 0.16
        ..color = _lighten(style.base, 0.35)
            .withValues(alpha: front ? 0.30 : 0.20),
    );
    canvas.drawOval(
      outer.deflate(r * 0.12),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = r * 0.05
        ..color = Colors.white.withValues(alpha: front ? 0.40 : 0.24),
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _PlanetPainter oldDelegate) =>
      oldDelegate.style != style;
}
