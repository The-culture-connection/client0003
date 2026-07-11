import 'package:flutter/material.dart';

import '../theme/conference_colors.dart';

/// Shared conference backdrop matching the Figma mockup: a dark base with a
/// soft gold radial glow at the top and a faint 64px grid overlay. Wraps the
/// page content ([child]) in a Stack.
class ConferenceGridBackground extends StatelessWidget {
  const ConferenceGridBackground({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [ConferenceColors.atmosphere, Colors.black, Colors.black],
            ),
          ),
        ),
        // Soft gold radial glow near the top.
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
                  colors: [ConferenceColors.goldAlpha(0.14), Colors.transparent],
                ),
              ),
            ),
          ),
        ),
        Positioned.fill(child: IgnorePointer(child: CustomPaint(painter: _GridPainter()))),
        child,
      ],
    );
  }
}

class _GridPainter extends CustomPainter {
  static const double _step = 64;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = ConferenceColors.goldAlpha(0.03)
      ..strokeWidth = 1;
    for (double x = 0; x <= size.width; x += _step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y <= size.height; y += _step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _GridPainter oldDelegate) => false;
}
