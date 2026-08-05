import 'dart:math';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import 'app_theme.dart';

/// Procedural "burnt mortar" grunge — the deep-red scorched surface behind
/// panels and cards. Generated in Dart rather than shipped as a bitmap so it
/// scales to any panel size without tiling seams or repo weight.
///
/// The look is built in six passes, back to front:
///   1. near-black base
///   2. deep-red wash rising from the bottom edge
///   3. a red bloom hugging the bottom (the glow under the buttons)
///   4. fine grain speckle — light dust and dark pits
///   5. horizontal scratch streaks
///   6. a vignette that pulls the middle back down to black
///
/// Every pass is seeded, so a given [seed] always paints the same surface and
/// two panels on one screen can differ by passing different seeds.
class GrungeSurface extends StatelessWidget {
  const GrungeSurface({
    super.key,
    this.seed = 11,
    this.intensity = 1,
    this.topDust = true,
    this.child,
  });

  /// Vary per surface so grain doesn't look stamped from one template.
  final int seed;

  /// Scales every pass above the base coat. Drop below 1 on small surfaces
  /// (cards, tiles) where full-strength grain reads as noise instead of
  /// texture; 0 leaves a flat near-black panel.
  final double intensity;

  /// Draws the pale fibrous band along the top edge — the torn-paper lip.
  /// Turn off for surfaces whose top edge is not torn.
  final bool topDust;

  final Widget? child;

  @override
  Widget build(BuildContext context) {
    // The painter is static, so isolate it from the child's repaints.
    return RepaintBoundary(
      child: CustomPaint(
        painter: GrungeTexturePainter(
          seed: seed,
          intensity: intensity,
          topDust: topDust,
        ),
        // Grain must never intercept taps meant for the child.
        isComplex: true,
        willChange: false,
        child: child,
      ),
    );
  }
}

class GrungeTexturePainter extends CustomPainter {
  const GrungeTexturePainter({
    this.seed = 11,
    this.intensity = 1,
    this.topDust = true,
  });

  final int seed;
  final double intensity;
  final bool topDust;

  /// Charcoal with a red bias — warmer than pure black so the wash sits on it
  /// without a visible seam.
  static const Color _base = Color(0xFF0A0706);

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;

    final rect = Offset.zero & size;
    final rng = Random(seed);
    final k = intensity.clamp(0.0, 2.0);

    canvas.drawRect(rect, Paint()..color = _base);
    if (k == 0) return;

    _paintRedWash(canvas, rect, k);
    _paintBottomBloom(canvas, rect, k);
    _paintGrain(canvas, size, rng, k);
    _paintScratches(canvas, size, rng, k);
    if (topDust) _paintTopDust(canvas, size, rng, k);
    _paintVignette(canvas, rect, k);
  }

  /// Deep-red haze climbing from the bottom edge — strongest at the floor,
  /// gone by roughly two-thirds up.
  void _paintRedWash(Canvas canvas, Rect rect, double k) {
    final shader = LinearGradient(
      begin: Alignment.bottomCenter,
      end: Alignment.topCenter,
      colors: [
        AppColors.deepRed.withValues(alpha: 0.34 * k),
        AppColors.deepRed.withValues(alpha: 0.10 * k),
        Colors.transparent,
      ],
      stops: const [0, 0.38, 0.72],
    ).createShader(rect);
    canvas.drawRect(rect, Paint()..shader = shader);
  }

  /// The hot core — a wide, shallow ellipse of brick red centred just below
  /// the bottom edge, so only its upper arc shows.
  void _paintBottomBloom(Canvas canvas, Rect rect, double k) {
    final bloom = Rect.fromCenter(
      center: Offset(rect.center.dx, rect.bottom + rect.height * 0.18),
      width: rect.width * 1.5,
      height: rect.height * 1.25,
    );
    final shader = RadialGradient(
      colors: [
        AppColors.primary.withValues(alpha: 0.30 * k),
        AppColors.deepRed.withValues(alpha: 0.14 * k),
        Colors.transparent,
      ],
      stops: const [0, 0.45, 1],
    ).createShader(bloom);
    canvas.drawRect(rect, Paint()..shader = shader);
  }

  /// Grain, in two coats: pale dust catching the light, then darker pits.
  /// Both go down as single `drawPoints` calls rather than per-dot draws.
  void _paintGrain(Canvas canvas, Size size, Random rng, double k) {
    // Scale the count to area so a tall panel isn't sparser than a short one.
    final area = size.width * size.height;
    final dustCount = (area / 190).clamp(40, 1400).round();
    final pitCount = (area / 260).clamp(30, 1000).round();

    final dust = <Offset>[];
    for (var i = 0; i < dustCount; i++) {
      dust.add(Offset(rng.nextDouble() * size.width, rng.nextDouble() * size.height));
    }
    canvas.drawPoints(
      ui.PointMode.points,
      dust,
      Paint()
        ..color = const Color(0xFFD8CFC9).withValues(alpha: 0.055 * k)
        ..strokeWidth = 1.1
        ..strokeCap = StrokeCap.round,
    );

    // Pits cluster low, where the wash is hottest — that contrast is what
    // reads as scorched rather than merely dark.
    final pits = <Offset>[];
    for (var i = 0; i < pitCount; i++) {
      final bias = sqrt(rng.nextDouble());
      pits.add(Offset(rng.nextDouble() * size.width, bias * size.height));
    }
    canvas.drawPoints(
      ui.PointMode.points,
      pits,
      Paint()
        ..color = Colors.black.withValues(alpha: 0.30 * k)
        ..strokeWidth = 1.7
        ..strokeCap = StrokeCap.round,
    );
  }

  /// Long, near-horizontal drags — the scraped-trowel marks.
  void _paintScratches(Canvas canvas, Size size, Random rng, double k) {
    final count = (size.height / 26).clamp(4, 26).round();
    for (var i = 0; i < count; i++) {
      final y = rng.nextDouble() * size.height;
      final x = rng.nextDouble() * size.width * 0.7;
      final len = size.width * (0.12 + rng.nextDouble() * 0.42);
      // Lift lightens, otherwise the mark is a gouge.
      final lift = rng.nextDouble() < 0.45;
      final path = Path()
        ..moveTo(x, y)
        ..quadraticBezierTo(
          x + len / 2,
          y + (rng.nextDouble() - 0.5) * 5,
          x + len,
          y + (rng.nextDouble() - 0.5) * 3,
        );
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 0.6 + rng.nextDouble() * 1.1
          ..color = lift
              ? const Color(0xFFE0D6D0).withValues(alpha: (0.03 + rng.nextDouble() * 0.05) * k)
              : Colors.black.withValues(alpha: (0.10 + rng.nextDouble() * 0.16) * k),
      );
    }
  }

  /// Pale fibrous crumbs along the torn lip, so the ripped edge looks like
  /// torn material rather than a clean cut.
  void _paintTopDust(Canvas canvas, Size size, Random rng, double k) {
    final band = Rect.fromLTWH(0, 0, size.width, min(26, size.height));
    canvas.drawRect(
      band,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            const Color(0xFFBFB3AC).withValues(alpha: 0.16 * k),
            Colors.transparent,
          ],
        ).createShader(band),
    );

    final crumbs = <Offset>[];
    final count = (size.width / 5).clamp(20, 260).round();
    for (var i = 0; i < count; i++) {
      // Squared bias keeps crumbs hugging the very top of the band.
      crumbs.add(Offset(rng.nextDouble() * size.width, pow(rng.nextDouble(), 2) * 22));
    }
    canvas.drawPoints(
      ui.PointMode.points,
      crumbs,
      Paint()
        ..color = const Color(0xFFEDE4DE).withValues(alpha: 0.20 * k)
        ..strokeWidth = 1.2
        ..strokeCap = StrokeCap.round,
    );
  }

  /// Darkens the corners so text and controls sit on a calm middle.
  void _paintVignette(Canvas canvas, Rect rect, double k) {
    final shader = RadialGradient(
      center: Alignment.center,
      radius: 0.85,
      colors: [
        Colors.transparent,
        Colors.black.withValues(alpha: 0.20 * k),
        Colors.black.withValues(alpha: 0.42 * k),
      ],
      stops: const [0.45, 0.8, 1],
    ).createShader(rect);
    canvas.drawRect(rect, Paint()..shader = shader);
  }

  @override
  bool shouldRepaint(covariant GrungeTexturePainter old) =>
      old.seed != seed || old.intensity != intensity || old.topDust != topDust;

  /// The surface is decorative; never let it swallow a tap.
  @override
  bool hitTest(Offset position) => false;
}
