import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// The Mortarverse mockup button: a pill with a soft red glow halo and
/// uppercase tracked label. `filled` = brick fill w/ white text (primary,
/// like the mockups' SIGN UP); otherwise a dark translucent pill whose glow
/// carries the emphasis (like the mockups' SIGN IN).
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
  final bool filled;
  final bool busy;

  /// Stretch to the parent's width (for form submits).
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final glow = AppColors.primary.withValues(alpha: onPressed == null ? 0.18 : 0.55);
    final button = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        boxShadow: [BoxShadow(color: glow, blurRadius: 28, spreadRadius: 1)],
      ),
      child: Material(
        color: filled ? AppColors.primary : Colors.black.withValues(alpha: 0.55),
        shape: StadiumBorder(
          side: filled
              ? BorderSide.none
              : BorderSide(color: AppColors.primary.withValues(alpha: 0.55)),
        ),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: busy ? null : onPressed,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 13),
            child: busy
                ? const Center(
                    child: SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.onPrimary,
                      ),
                    ),
                  )
                : Text(
                    label.toUpperCase(),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 2.2,
                    ),
                  ),
          ),
        ),
      ),
    );
    return expand ? SizedBox(width: double.infinity, child: button) : button;
  }
}
