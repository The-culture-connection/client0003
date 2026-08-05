import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/grunge_texture.dart';

/// A [Card] with the scorched grunge fill behind its contents.
///
/// Drop-in for `Card(child: ...)`: it keeps the zero-radius geometry and hair
/// border from `cardTheme`, but swaps the flat 3.5% glass fill for
/// [GrungeSurface]. Grain runs at reduced intensity — at card scale, full
/// strength reads as sensor noise rather than material — and the torn-lip
/// dust is off, since a card's top edge is cut, not ripped.
class MortarCard extends StatelessWidget {
  const MortarCard({
    super.key,
    required this.child,
    this.seed = 11,
    this.intensity = 0.55,
    this.margin,
    this.shape,
    this.clipBehavior = Clip.antiAlias,
  });

  final Widget child;

  /// Vary across a list so stacked cards don't share one grain pattern.
  final int seed;

  final double intensity;
  final EdgeInsetsGeometry? margin;

  /// Falls back to `cardTheme`'s zero-radius bordered shape when null.
  final ShapeBorder? shape;

  final Clip clipBehavior;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: margin,
      shape: shape,
      // The texture is the fill; leaving the theme colour on would haze it.
      color: Colors.transparent,
      // Without clipping, grain would square off the card's bordered corners.
      clipBehavior: clipBehavior,
      child: GrungeSurface(
        seed: seed,
        intensity: intensity,
        topDust: false,
        child: child,
      ),
    );
  }
}

/// The same scorched fill for the app's many hand-rolled `Container` panels
/// that predate [MortarCard]. Use where a surface needs the material but not
/// [Card]'s margin and elevation semantics.
class MortarPanel extends StatelessWidget {
  const MortarPanel({
    super.key,
    required this.child,
    this.seed = 11,
    this.intensity = 0.55,
    this.padding,
    this.borderRadius = BorderRadius.zero,
    this.bordered = true,
  });

  final Widget child;
  final int seed;
  final double intensity;
  final EdgeInsetsGeometry? padding;
  final BorderRadius borderRadius;
  final bool bordered;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        border: bordered ? Border.all(color: AppColors.border) : null,
      ),
      child: ClipRRect(
        borderRadius: borderRadius,
        child: GrungeSurface(
          seed: seed,
          intensity: intensity,
          topDust: false,
          child: padding == null
              ? child
              : Padding(padding: padding!, child: child),
        ),
      ),
    );
  }
}
