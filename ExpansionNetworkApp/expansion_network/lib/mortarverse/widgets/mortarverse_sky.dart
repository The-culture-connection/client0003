import 'dart:math';

import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// The Mortarverse sky: deep-space black, a twinkling starfield, and soft
/// red nebula auras bleeding in from the edges — mirrors the webapp's
/// `.space-surface` + `.starfield` + `.aura-glow` background stack.
///
/// Drop behind a screen's content with a [Stack]:
/// ```dart
/// Stack(children: [const MortarverseSky(), SafeArea(child: ...)])
/// ```
class MortarverseSky extends StatefulWidget {
  const MortarverseSky({super.key, this.starCount = 90});

  final int starCount;

  @override
  State<MortarverseSky> createState() => _MortarverseSkyState();
}

class _MortarverseSkyState extends State<MortarverseSky>
    with SingleTickerProviderStateMixin {
  late final AnimationController _twinkle;
  late final List<_Star> _stars;

  @override
  void initState() {
    super.initState();
    _twinkle = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 9),
    )..repeat(reverse: true);
    final rng = Random(7);
    _stars = List.generate(widget.starCount, (_) {
      return _Star(
        position: Offset(rng.nextDouble(), rng.nextDouble()),
        radius: 0.4 + rng.nextDouble() * 1.1,
        phase: rng.nextDouble() * 2 * pi,
        baseAlpha: 0.25 + rng.nextDouble() * 0.6,
      );
    });
  }

  @override
  void dispose() {
    _twinkle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: RepaintBoundary(
        child: Stack(
          children: [
            // Space surface: near-black with a hint of depth at the top.
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment(0, -1.2),
                  radius: 1.4,
                  colors: [Color(0xFF0D0D0D), Colors.black],
                ),
              ),
              child: SizedBox.expand(),
            ),
            // Twinkling stars.
            AnimatedBuilder(
              animation: _twinkle,
              builder: (context, _) => CustomPaint(
                size: Size.infinite,
                painter: _StarfieldPainter(_stars, _twinkle.value),
              ),
            ),
            // Nebula auras — brick glows bleeding in from the edges.
            const _Aura(
              alignment: Alignment(1.35, -1.1),
              size: 340,
              color: AppColors.primary,
              opacity: 0.30,
            ),
            const _Aura(
              alignment: Alignment(-1.4, 0.55),
              size: 300,
              color: AppColors.deepRed,
              opacity: 0.24,
            ),
          ],
        ),
      ),
    );
  }
}

class _Aura extends StatelessWidget {
  const _Aura({
    required this.alignment,
    required this.size,
    required this.color,
    required this.opacity,
  });

  final Alignment alignment;
  final double size;
  final Color color;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: alignment,
      child: IgnorePointer(
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(
              colors: [
                color.withValues(alpha: opacity),
                color.withValues(alpha: 0),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Star {
  const _Star({
    required this.position,
    required this.radius,
    required this.phase,
    required this.baseAlpha,
  });

  final Offset position; // normalized 0..1
  final double radius;
  final double phase;
  final double baseAlpha;
}

class _StarfieldPainter extends CustomPainter {
  _StarfieldPainter(this.stars, this.t);

  final List<_Star> stars;
  final double t; // 0..1 twinkle progress

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint();
    for (final star in stars) {
      final twinkle =
          0.55 + 0.45 * sin(star.phase + t * 2 * pi).abs();
      paint.color =
          Colors.white.withValues(alpha: star.baseAlpha * twinkle);
      canvas.drawCircle(
        Offset(star.position.dx * size.width, star.position.dy * size.height),
        star.radius,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _StarfieldPainter oldDelegate) =>
      oldDelegate.t != t;
}
