import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import 'cosmic.dart';

/// The widget half of the Mortarverse design language from Claude Design
/// `Mortarverse Home.dc.html`, option **1a — "Deep field"**: frosted glass
/// panels floating on the nebula, a ripped-paper horizon, and pill actions lit
/// from below.
///
/// The tokens these are built from live in `lib/theme/cosmic.dart` and are
/// re-exported here so existing imports keep working. There is deliberately
/// one definition — a second copy would drift the moment a value changed.
///
export 'cosmic.dart';

/// A frosted panel: hairline border, near-transparent gradient fill, and a
/// real backdrop blur so the nebula reads through it.
///
/// [bloomAt] optionally places the design's red mass inside the panel —
/// a 220px circle bleeding off one corner, clipped by the panel's own radius.
class GlassPanel extends StatelessWidget {
  const GlassPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(22, 22, 22, 20),
    this.radius = 22,
    this.borderColor = Cosmic.panelBorder,
    this.fill = Cosmic.panelFill,
    this.bloomAt,
    this.bloomColor = Cosmic.accentExpansion,
    this.bloomSize = 220,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color borderColor;
  final Gradient fill;

  /// Where the bloom's centre sits relative to the panel. Null draws none.
  final Alignment? bloomAt;
  final Color bloomColor;
  final double bloomSize;

  @override
  Widget build(BuildContext context) {
    final shape = BorderRadius.circular(radius);
    return ClipRRect(
      borderRadius: shape,
      child: BackdropFilter(
        // `backdrop-filter: blur(3px)`.
        filter: ui.ImageFilter.blur(sigmaX: 3, sigmaY: 3),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: shape,
            border: Border.all(color: borderColor),
            gradient: fill,
          ),
          child: Stack(
            children: [
              if (bloomAt != null)
                Positioned.fill(
                  child: IgnorePointer(
                    child: Align(
                      alignment: bloomAt!,
                      child: SizedBox(
                        width: bloomSize,
                        height: bloomSize,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: [
                                bloomColor.withValues(alpha: 0.75),
                                bloomColor.withValues(alpha: 0),
                              ],
                              stops: const [0, 0.66],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              Padding(padding: padding, child: child),
            ],
          ),
        ),
      ),
    );
  }
}

/// The ripped-paper horizon: a 12px torn strip fading from white to a dusty
/// pink, cut by the option's jagged `clip-path` polygon.
class TornHorizon extends StatelessWidget {
  const TornHorizon({super.key, this.height = 12, this.opacity = 0.5});

  final double height;
  final double opacity;

  /// The option's clip-path vertices, as (x%, y%) of the strip.
  static const List<Offset> _teeth = [
    Offset(0.00, 0.46), Offset(0.05, 0.30), Offset(0.11, 0.55),
    Offset(0.17, 0.26), Offset(0.24, 0.52), Offset(0.31, 0.22),
    Offset(0.38, 0.50), Offset(0.45, 0.28), Offset(0.52, 0.58),
    Offset(0.59, 0.30), Offset(0.66, 0.54), Offset(0.73, 0.24),
    Offset(0.80, 0.52), Offset(0.87, 0.30), Offset(0.94, 0.56),
    Offset(1.00, 0.34),
  ];

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Opacity(
        opacity: opacity,
        child: SizedBox(
          height: height,
          width: double.infinity,
          child: CustomPaint(painter: const _TornPainter(_teeth)),
        ),
      ),
    );
  }
}

class _TornPainter extends CustomPainter {
  const _TornPainter(this.teeth);

  final List<Offset> teeth;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    final path = Path()..moveTo(0, teeth.first.dy * size.height);
    for (final t in teeth.skip(1)) {
      path.lineTo(t.dx * size.width, t.dy * size.height);
    }
    path
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    canvas.drawPath(
      path,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xE6FFFFFF), Color(0x26FFB4BE)],
        ).createShader(Offset.zero & size),
    );
  }

  @override
  bool shouldRepaint(covariant _TornPainter oldDelegate) => false;
}

/// The primary action across the whole app: an uppercase pill lit from below
/// by a radial bloom, ringed in a bright hairline.
///
/// The bloom takes the **zone accent** rather than a fixed red — it reads from
/// `ColorScheme.primary`, which `cosmicTheme` sets per zone. So the same
/// widget blooms brick red in the Expansion app and gold under
/// `/conference/*`, with no call site having to know which it is. Pass
/// [accent] only to override that.
class GlowPill extends StatelessWidget {
  const GlowPill({
    super.key,
    required this.label,
    this.onTap,
    this.accent,
    this.expand = false,
    this.dense = false,
    this.large = false,
  });

  final String label;
  final VoidCallback? onTap;

  /// Overrides the zone accent. Leave null in almost all cases.
  final Color? accent;

  /// Stretch to the parent's width, for a panel's primary action.
  final bool expand;

  /// Tighter padding for a pill sitting inside a dense row.
  final bool dense;

  /// Bigger tap target + type for a hero action (e.g. the Mortarverse focus
  /// card's transition button). Wins over [dense].
  final bool large;

  /// The lit bloom, shared with the other lit controls so a pill, a squircle
  /// button and a FAB are the same light source at different sizes.
  static RadialGradient bloom(Color accent, {bool enabled = true}) =>
      RadialGradient(
        // `radial-gradient(circle at 50% 130%, …)` — the light sits below the
        // control, so the underside is hottest.
        center: const Alignment(0, 1.6),
        radius: 1.1,
        colors: [
          accent.withValues(alpha: enabled ? 0.85 : 0.22),
          accent.withValues(alpha: enabled ? 0.12 : 0.04),
        ],
        stops: const [0, 0.7],
      );

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    final hue = accent ?? Theme.of(context).colorScheme.primary;

    final pill = Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        customBorder: const StadiumBorder(),
        child: Container(
          padding: large
              ? const EdgeInsets.symmetric(horizontal: 28, vertical: 15)
              : dense
                  ? const EdgeInsets.symmetric(horizontal: 16, vertical: 9)
                  : const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
          alignment: expand ? Alignment.center : null,
          decoration: BoxDecoration(
            borderRadius: Cosmic.pillRadius,
            border: Border.all(
              color: enabled ? const Color(0x80FFFFFF) : const Color(0x33FFFFFF),
            ),
            gradient: GlowPill.bloom(hue, enabled: enabled),
          ),
          child: Text(
            label.toUpperCase(),
            textAlign: TextAlign.center,
            style: TextStyle(
              color: enabled ? Colors.white : Cosmic.textFaint,
              fontSize: large ? 13.5 : 12,
              fontWeight: FontWeight.w500,
              letterSpacing: 0.96,
              height: 1,
            ),
          ),
        ),
      ),
    );

    return expand ? SizedBox(width: double.infinity, child: pill) : pill;
  }
}

/// The carousel position rule: a lit bar for the current item, stubs for the
/// rest.
class CosmicDots extends StatelessWidget {
  const CosmicDots({super.key, required this.count, required this.index});

  final int count;
  final int index;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 0; i < count; i++) ...[
          if (i > 0) const SizedBox(width: 6),
          AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            width: i == index ? 16 : 5,
            height: 3,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(2),
              color: i == index ? Cosmic.alert : const Color(0x47FFFFFF),
            ),
          ),
        ],
      ],
    );
  }
}
