import 'dart:math';

import 'package:flutter/material.dart';

/// Translucent glass panel with a torn-paper top edge, finished with the
/// mockups' white ragged fiber highlight along the tear.
class TornPanel extends StatelessWidget {
  const TornPanel({super.key, required this.child, this.seed = 11});

  final Widget child;

  /// Vary per screen so torn edges don't look stamped from one template.
  final int seed;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      foregroundPainter: _TearHighlightPainter(seed),
      child: ClipPath(
        clipper: _TornEdgeClipper(seed),
        child: Container(
          color: Colors.white.withValues(alpha: 0.05),
          child: child,
        ),
      ),
    );
  }
}

/// Shared jagged-path generator so the clip and its highlight always agree.
Path tornEdgePath(Size size, int seed) {
  final rng = Random(seed);
  final path = Path()..moveTo(0, 14);
  var x = 0.0;
  while (x < size.width) {
    x += 14 + rng.nextDouble() * 26;
    final y = 2 + rng.nextDouble() * 16;
    path.lineTo(min(x, size.width), y);
  }
  return path;
}

class _TornEdgeClipper extends CustomClipper<Path> {
  _TornEdgeClipper(this.seed);

  final int seed;

  @override
  Path getClip(Size size) {
    final path = tornEdgePath(size, seed)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    return path;
  }

  @override
  bool shouldReclip(covariant _TornEdgeClipper oldClipper) =>
      oldClipper.seed != seed;
}

/// Paints the ripped-paper fiber highlight: a bright rough white line over a
/// wider soft one, tracing the same jagged edge as the clip.
class _TearHighlightPainter extends CustomPainter {
  _TearHighlightPainter(this.seed);

  final int seed;

  @override
  void paint(Canvas canvas, Size size) {
    final edge = tornEdgePath(size, seed);
    canvas.drawPath(
      edge,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 5
        ..strokeJoin = StrokeJoin.round
        ..color = Colors.white.withValues(alpha: 0.22),
    );
    canvas.drawPath(
      edge,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.8
        ..strokeJoin = StrokeJoin.round
        ..color = Colors.white.withValues(alpha: 0.85),
    );
  }

  @override
  bool shouldRepaint(covariant _TearHighlightPainter oldDelegate) =>
      oldDelegate.seed != seed;
}
