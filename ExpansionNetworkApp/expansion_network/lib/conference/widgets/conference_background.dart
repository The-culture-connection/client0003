import 'package:flutter/material.dart';

import '../theme/conference_brand.dart';
import '../theme/conference_colors.dart';

/// Shared conference backdrop: a dark base with a soft glow at the top and a
/// faint 64px grid overlay. Wraps the page content ([child]) in a Stack.
///
/// With a [brand] that carries colours, the glow and grid take the event's
/// palette instead of the default gold — this is the one place accent colour
/// varies per conference. Controls elsewhere stay [ConferenceColors.gold].
class ConferenceGridBackground extends StatelessWidget {
  const ConferenceGridBackground({
    super.key,
    required this.child,
    this.brand = ConferenceBrand.none,
  });

  final Widget child;
  final ConferenceBrand brand;

  @override
  Widget build(BuildContext context) {
    final branded = brand.hasWash;
    // Neutral base under a branded wash — the default warm brown would muddy a
    // cool palette.
    final base = branded ? const Color(0xFF0B0B0C) : ConferenceColors.atmosphere;

    return Stack(
      children: [
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [base, Colors.black, Colors.black],
            ),
          ),
        ),
        // Soft glow near the top.
        Positioned(
          top: -140,
          left: 0,
          right: 0,
          child: IgnorePointer(
            child: Container(
              height: 340,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.topCenter,
                  radius: 0.9,
                  colors: branded
                      ? [brand.washTop, brand.washMid, Colors.transparent]
                      : [ConferenceColors.goldAlpha(0.14), Colors.transparent],
                  stops: branded ? const [0, 0.55, 1] : null,
                ),
              ),
            ),
          ),
        ),
        Positioned.fill(
          child: IgnorePointer(
            child: CustomPaint(
              painter: _GridPainter(
                branded ? brand.gridLine : ConferenceColors.goldAlpha(0.03),
              ),
            ),
          ),
        ),
        child,
      ],
    );
  }
}

class _GridPainter extends CustomPainter {
  _GridPainter(this.line);

  static const double _step = 64;

  final Color line;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = line
      ..strokeWidth = 1;
    for (double x = 0; x <= size.width; x += _step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y <= size.height; y += _step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _GridPainter oldDelegate) => oldDelegate.line != line;
}
