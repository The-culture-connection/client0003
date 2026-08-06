import 'package:flutter/material.dart';

import '../../theme/cosmic_widgets.dart';

/// The auth screens' pill pair, from option **2c**: an outlined SIGN IN beside
/// a lit SIGN UP.
///
/// Both wear the **zone accent** rather than a fixed red — the bloom comes from
/// [GlowPill.bloom] against `ColorScheme.primary`, the same light source as
/// every other lit control in the app, so a pill here and a pill in the
/// conference are the same button in different keys.
class GlowPillButton extends StatelessWidget {
  const GlowPillButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.filled = false,
    this.busy = false,
    this.expand = false,
  });

  final String label;
  final VoidCallback? onPressed;

  /// Lit rather than outlined — 2c's SIGN UP against its SIGN IN.
  final bool filled;

  final bool busy;

  /// Stretch to the parent's width, for a form submit.
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !busy;
    final accent = Theme.of(context).colorScheme.primary;

    final button = Material(
      color: Colors.transparent,
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: enabled ? onPressed : null,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 14),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: Cosmic.pillRadius,
            border: Border.all(
              color: enabled
                  ? (filled ? const Color(0x80FFFFFF) : const Color(0x73FFFFFF))
                  : const Color(0x33FFFFFF),
            ),
            // Outlined pills stay a flat scrim; only the lit one blooms.
            gradient: filled ? GlowPill.bloom(accent, enabled: enabled) : null,
            color: filled ? null : const Color(0x1A000000),
          ),
          child: busy
              ? SizedBox(
                  height: 18,
                  width: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: accent,
                  ),
                )
              : Text(
                  label.toUpperCase(),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: Cosmic.fontFamily,
                    color: enabled ? Colors.white : Cosmic.textFaint,
                    fontSize: 11,
                    height: 1,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.76,
                  ),
                ),
        ),
      ),
    );

    return expand ? SizedBox(width: double.infinity, child: button) : button;
  }
}
