import 'dart:math' as math;

import 'package:flutter/material.dart';

/// The app background from Claude Design `Mortarverse Home.dc.html`, option
/// **1a — "Deep field"**: black space, four soft nebula masses bleeding in from
/// the edges, and a sparse still starfield.
///
/// Ported from the option's two background layers. The nebula radii follow CSS
/// `radial-gradient` semantics — a stop percentage is measured against the
/// distance to the *farthest corner*, not the box size — so they are computed
/// per-frame in [_DeepFieldPainter] rather than guessed at in [Alignment]
/// space, which is what keeps the masses the same shape the design has.
///
/// Mounted ONCE in [MaterialApp.builder]; every screen renders a transparent
/// scaffold over it.
class MortarverseSky extends StatelessWidget {
  const MortarverseSky({super.key});

  @override
  Widget build(BuildContext context) {
    return const Positioned.fill(
      child: RepaintBoundary(
        child: ClipRect(
          child: CustomPaint(
            size: Size.infinite,
            painter: _DeepFieldPainter(),
          ),
        ),
      ),
    );
  }
}

/// A nebula mass: colour, centre as a fraction of the frame, and the radius as
/// the CSS stop fraction of the farthest-corner distance.
class _Nebula {
  const _Nebula(this.cx, this.cy, this.color, this.stop);

  final double cx;
  final double cy;
  final Color color;
  final double stop;
}

/// A star: position as a fraction of the frame, radius in px, opacity.
class _Star {
  const _Star(this.x, this.y, this.r, this.a);

  final double x;
  final double y;
  final double r;
  final double a;
}

class _DeepFieldPainter extends CustomPainter {
  const _DeepFieldPainter();

  static const List<_Nebula> _nebulae = [
    _Nebula(0.84, 0.10, Color(0x6BE41A28), 0.26),
    _Nebula(0.08, 0.63, Color(0x4DC42A60), 0.24),
    _Nebula(0.66, 0.97, Color(0x57961428), 0.25),
    _Nebula(0.34, 0.16, Color(0x24DC5A78), 0.18),
  ];

  static const List<_Star> _stars = [
    _Star(0.18, 0.09, 1.4, 0.95),
    _Star(0.64, 0.15, 1.0, 0.70),
    _Star(0.86, 0.30, 1.2, 0.80),
    _Star(0.34, 0.27, 1.0, 0.55),
    _Star(0.08, 0.41, 1.4, 0.85),
    _Star(0.72, 0.47, 1.0, 0.60),
    _Star(0.46, 0.58, 1.2, 0.75),
    _Star(0.90, 0.63, 1.0, 0.50),
    _Star(0.22, 0.74, 1.3, 0.80),
    _Star(0.58, 0.82, 1.0, 0.55),
    _Star(0.80, 0.90, 1.2, 0.70),
    _Star(0.38, 0.95, 1.0, 0.50),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    final rect = Offset.zero & size;

    canvas.drawRect(rect, Paint()..color = const Color(0xFF000000));

    for (final n in _nebulae) {
      final center = Offset(n.cx * size.width, n.cy * size.height);
      // CSS default is farthest-corner: the 100% stop lands on whichever
      // corner is furthest from the centre, and n.stop is a fraction of that.
      final radius = _farthestCorner(center, size) * n.stop;
      if (radius <= 0) continue;
      canvas.drawCircle(
        center,
        radius,
        Paint()
          ..shader = RadialGradient(
            colors: [n.color, n.color.withValues(alpha: 0)],
          ).createShader(Rect.fromCircle(center: center, radius: radius)),
      );
    }

    final star = Paint();
    for (final s in _stars) {
      star.color = Colors.white.withValues(alpha: s.a);
      canvas.drawCircle(
        Offset(s.x * size.width, s.y * size.height),
        s.r,
        star,
      );
    }
  }

  double _farthestCorner(Offset c, Size size) {
    final dx = math.max(c.dx, size.width - c.dx);
    final dy = math.max(c.dy, size.height - c.dy);
    return math.sqrt(dx * dx + dy * dy);
  }

  /// Fixed composition, no animation.
  @override
  bool shouldRepaint(covariant _DeepFieldPainter oldDelegate) => false;
}
