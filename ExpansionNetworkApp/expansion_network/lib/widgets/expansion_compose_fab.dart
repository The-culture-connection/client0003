import 'package:flutter/material.dart';

import '../theme/cosmic_widgets.dart';

/// The networking hall's shared compose ("+") button — the home screen's
/// lit-ring design (transparent circle, glow bloom, thin white ring), used
/// identically on every hall tab so the plus always looks and sits the same.
///
/// Positioning: the hall's tab screens extend under the floating
/// [CosmicBottomNav] pill (`extendBody: true`), and the draggable
/// beta-feedback button hovers near the bottom-right — so the button is
/// lifted clear of both. `viewPadding` is used (not `padding`) because it
/// reports the raw device inset even inside consumed SafeAreas.
class ExpansionComposeFab extends StatelessWidget {
  const ExpansionComposeFab({
    super.key,
    required this.onPressed,
    required this.heroTag,
  });

  final VoidCallback onPressed;

  /// Unique per screen — the shell keeps every tab alive in an IndexedStack,
  /// so duplicate hero tags would collide during route transitions.
  final Object heroTag;

  @override
  Widget build(BuildContext context) {
    // Above the pill nav AND the beta-feedback bug button, whose edge-snapped
    // resting spot is the slot directly over the nav's right end.
    final lift = 152 + MediaQuery.viewPaddingOf(context).bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: lift),
      child: FloatingActionButton(
        heroTag: heroTag,
        onPressed: onPressed,
        // The lit-ring compose button: a glowing ring rather than a solid
        // Material circle — same light source as the other lit controls.
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        elevation: 0,
        highlightElevation: 0,
        shape: const CircleBorder(
          side: BorderSide(color: Color(0x80FFFFFF)),
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: GlowPill.bloom(Theme.of(context).colorScheme.primary),
          ),
          child: const SizedBox(
            width: 56,
            height: 56,
            child: Icon(Icons.add, size: 26, color: Colors.white),
          ),
        ),
      ),
    );
  }
}
