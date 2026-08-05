import 'dart:math';

import 'package:flutter/material.dart';

/// A destination rendered as a shiny CD/record "planet" — the Mortarverse
/// concept: each place in the network is a floating disc with an iridescent
/// sheen, groove rings, a colored label, a spindle hole, and a glowing aura
/// in its own color. Slow spin + gentle float; aura pulses.
class PlanetDisc extends StatefulWidget {
  const PlanetDisc({
    super.key,
    required this.color,
    this.size = 96,
    this.enabled = true,
  });

  /// The planet's personality color (label + aura).
  final Color color;
  final double size;

  /// Disabled planets stop pulsing and dim.
  final bool enabled;

  @override
  State<PlanetDisc> createState() => _PlanetDiscState();
}

class _PlanetDiscState extends State<PlanetDisc>
    with TickerProviderStateMixin {
  late final AnimationController _spin;
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _spin = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 40),
    )..repeat();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2600),
    );
    if (widget.enabled) _pulse.repeat(reverse: true);
  }

  @override
  void didUpdateWidget(covariant PlanetDisc oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.enabled && !_pulse.isAnimating) {
      _pulse.repeat(reverse: true);
    } else if (!widget.enabled && _pulse.isAnimating) {
      _pulse.stop();
    }
  }

  @override
  void dispose() {
    _spin.dispose();
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.size;
    return AnimatedBuilder(
      animation: Listenable.merge([_spin, _pulse]),
      builder: (context, _) {
        final auraAlpha = widget.enabled ? 0.30 + 0.22 * _pulse.value : 0.10;
        return Container(
          width: s,
          height: s,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: widget.color.withValues(alpha: auraAlpha),
                blurRadius: s * 0.36,
                spreadRadius: s * 0.02,
              ),
            ],
          ),
          child: Transform.rotate(
            angle: _spin.value * 2 * pi,
            child: CustomPaint(
              painter: _DiscPainter(widget.color),
            ),
          ),
        );
      },
    );
  }
}

class _DiscPainter extends CustomPainter {
  _DiscPainter(this.labelColor);

  final Color labelColor;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final r = size.width / 2;

    // Disc body.
    canvas.drawCircle(center, r, Paint()..color = const Color(0xFF101010));

    // Iridescent CD sheen (sweep of translucent spectral wedges).
    final sheen = Paint()
      ..shader = SweepGradient(
        colors: [
          Colors.white.withValues(alpha: 0.0),
          const Color(0xFFFFB4DC).withValues(alpha: 0.35),
          const Color(0xFF8CDCFF).withValues(alpha: 0.30),
          Colors.white.withValues(alpha: 0.04),
          const Color(0xFFFFE696).withValues(alpha: 0.28),
          const Color(0xFFAA96FF).withValues(alpha: 0.30),
          Colors.white.withValues(alpha: 0.0),
        ],
        stops: const [0.0, 0.14, 0.28, 0.45, 0.66, 0.84, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: r));
    canvas.drawCircle(center, r, sheen);

    // Groove rings.
    final groove = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.6
      ..color = Colors.white.withValues(alpha: 0.10);
    for (var ring = r * 0.42; ring < r * 0.96; ring += r * 0.09) {
      canvas.drawCircle(center, ring, groove);
    }

    // Outer rim.
    canvas.drawCircle(
      center,
      r - 0.5,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = Colors.white.withValues(alpha: 0.28),
    );

    // Label.
    canvas.drawCircle(center, r * 0.34, Paint()..color = labelColor);
    canvas.drawCircle(
      center,
      r * 0.34,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.4
        ..color = Colors.white.withValues(alpha: 0.30),
    );

    // Spindle hole.
    canvas.drawCircle(center, r * 0.10, Paint()..color = const Color(0xFF050505));
    canvas.drawCircle(
      center,
      r * 0.10,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = Colors.white.withValues(alpha: 0.35),
    );
  }

  @override
  bool shouldRepaint(covariant _DiscPainter oldDelegate) =>
      oldDelegate.labelColor != labelColor;
}
