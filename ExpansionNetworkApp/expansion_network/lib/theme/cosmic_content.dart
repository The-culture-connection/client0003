import 'package:flutter/material.dart';

import 'cosmic_components.dart';

/// Form, list and content components ported from Claude Design turn 2 —
/// options **2e** (Registration), **2f** (Messages) and **2g** (Posts).
///
/// Together with `cosmic_components.dart` this covers every archetype the app
/// has: forms, conversation lists, feed cards, modal headers.
export 'cosmic_components.dart';

/// A text field in the cosmic language.
///
/// 2e shows two states: empty (hairline border, italic-grey placeholder) and
/// filled (accent border with the label floated up into a notch in the border).
///
/// The notch is done with Flutter's own [OutlineInputBorder] gap rather than
/// the mockup's trick of painting a solid-coloured chip over the stroke — the
/// mockup can assume a flat page colour, but here the nebula shows through, so
/// a solid chip would leave a visible rectangle.
class CosmicField extends StatelessWidget {
  const CosmicField({
    super.key,
    required this.label,
    this.controller,
    this.hint,
    this.accent = Cosmic.accentExpansion,
    this.keyboardType,
    this.obscureText = false,
    this.maxLines = 1,
    this.minLines,
    this.validator,
    this.onChanged,
    this.enabled = true,
    this.textCapitalization = TextCapitalization.none,
    this.suffix,
  });

  /// Floats into the border once the field has focus or content.
  final String label;

  final TextEditingController? controller;

  /// Shown only while the field is empty and unfocused.
  final String? hint;

  final Color accent;
  final TextInputType? keyboardType;
  final bool obscureText;
  final int maxLines;
  final int? minLines;
  final String? Function(String?)? validator;
  final ValueChanged<String>? onChanged;
  final bool enabled;
  final TextCapitalization textCapitalization;
  final Widget? suffix;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      maxLines: obscureText ? 1 : maxLines,
      minLines: minLines,
      validator: validator,
      onChanged: onChanged,
      enabled: enabled,
      textCapitalization: textCapitalization,
      style: const TextStyle(
        fontFamily: Cosmic.fontFamily,
        fontSize: 12.5,
        height: 1.35,
        fontWeight: FontWeight.w400,
        color: Cosmic.textPrimary,
      ),
      cursorColor: accent,
      // Everything visual comes from `inputDecorationTheme` in cosmicTheme —
      // fill, padding, the italic floating label, all six border states. Only
      // the per-field overrides live here, so a screen using a bare
      // TextFormField and one using CosmicField cannot look different.
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        suffixIcon: suffix,
        // The accent is per-zone on the theme; an explicit one still wins.
        focusedBorder: cosmicFieldBorder(accent.withValues(alpha: 0.6), 1.4),
      ),
    );
  }
}

/// 2e's form section rule — tracked-out uppercase in the zone accent.
class CosmicFieldLabel extends StatelessWidget {
  const CosmicFieldLabel({
    super.key,
    required this.label,
    this.accent = Cosmic.accentExpansion,
  });

  final String label;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Text(
      label.toUpperCase(),
      style: TextStyle(
        fontFamily: Cosmic.fontFamily,
        fontSize: 10,
        height: 1,
        fontWeight: FontWeight.w600,
        letterSpacing: 2.4,
        color: accent,
      ),
    );
  }
}

/// The header on a screen presented as a task rather than a destination — a
/// dismiss affordance and a title over a hairline rule.
///
/// 2e uses ✕ with a tracked-out title (a flow you cancel); 2g uses ← with a
/// sentence-case title (a place you came from).
class CosmicModalHeader extends StatelessWidget {
  const CosmicModalHeader({
    super.key,
    required this.title,
    required this.onDismiss,
    this.dismissIcon = Icons.close_rounded,
    this.tracked = true,
    this.trailing,
  });

  final String title;
  final VoidCallback onDismiss;
  final IconData dismissIcon;

  /// 2e's tracked-out caps versus 2g's plain sentence case.
  final bool tracked;

  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0x1FFFFFFF))),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Cosmic.gutter, 20, Cosmic.gutter, 18),
        child: Row(
          children: [
            GestureDetector(
              onTap: onDismiss,
              behavior: HitTestBehavior.opaque,
              child: Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Icon(dismissIcon, size: 19, color: const Color(0xCCFFFFFF)),
              ),
            ),
            Expanded(
              child: Text(
                tracked ? title.toUpperCase() : title,
                overflow: TextOverflow.ellipsis,
                style: tracked
                    ? const TextStyle(
                        fontFamily: Cosmic.fontFamily,
                        fontSize: 14,
                        height: 1,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 2.8,
                        color: Cosmic.textPrimary,
                      )
                    : const TextStyle(
                        fontFamily: Cosmic.fontFamily,
                        fontSize: 19,
                        height: 1,
                        fontWeight: FontWeight.w600,
                        color: Cosmic.textPrimary,
                      ),
              ),
            ),
            if (trailing != null) trailing!,
          ],
        ),
      ),
    );
  }
}

/// 2e's explainer card: an icon tile beside a tracked title and body copy,
/// tinted in the zone accent. Use to set up a form or explain a gate.
class CosmicInfoBanner extends StatelessWidget {
  const CosmicInfoBanner({
    super.key,
    required this.title,
    required this.body,
    this.icon,
    this.accent = Cosmic.accentExpansion,
  });

  final String title;
  final String body;
  final IconData? icon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: accent.withValues(alpha: 0.3)),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            accent.withValues(alpha: 0.09),
            const Color(0x03FFFFFF),
          ],
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: accent.withValues(alpha: 0.5)),
            ),
            child: icon == null
                ? null
                : Icon(icon, size: 19, color: accent.withValues(alpha: 0.9)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title.toUpperCase(),
                  style: TextStyle(
                    fontFamily: Cosmic.fontFamily,
                    fontSize: 12.5,
                    height: 1,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.75,
                    color: accent,
                  ),
                ),
                const SizedBox(height: 9),
                Text(
                  body,
                  style: const TextStyle(
                    fontFamily: Cosmic.fontFamily,
                    fontSize: 11.5,
                    height: 1.55,
                    fontWeight: FontWeight.w300,
                    color: Color(0x99FFFFFF),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 2f's conversation row: a 42px identity disc, a name, and a preview line.
class CosmicPersonRow extends StatelessWidget {
  const CosmicPersonRow({
    super.key,
    required this.name,
    this.preview,
    this.initials,
    this.imageUrl,
    this.accent = Cosmic.accentExpansion,
    this.onTap,
    this.onAvatarTap,
    this.trailing,
  });

  final String name;
  final String? preview;

  /// Falls back to the first letter of [name].
  final String? initials;

  final String? imageUrl;
  final Color accent;
  final VoidCallback? onTap;

  /// Tapping the disc alone — typically opens the person's profile, separate
  /// from opening the row's destination.
  final VoidCallback? onAvatarTap;

  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final shape = BorderRadius.circular(18);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: shape,
        border: Border.all(color: const Color(0x2EFFFFFF)),
        gradient: Cosmic.chipFill,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: shape,
        child: InkWell(
          borderRadius: shape,
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                GestureDetector(
                  onTap: onAvatarTap,
                  child: CosmicAvatar(
                    initials: initials ??
                        (name.trim().isEmpty ? '?' : name.trim()[0]),
                    size: 42,
                    accent: accent,
                    imageUrl: imageUrl,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: Cosmic.fontFamily,
                          fontSize: 13.5,
                          height: 1,
                          fontWeight: FontWeight.w500,
                          color: Cosmic.textPrimary,
                        ),
                      ),
                      if (preview != null && preview!.trim().isNotEmpty) ...[
                        const SizedBox(height: 7),
                        Text(
                          preview!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: Cosmic.fontFamily,
                            fontSize: 11.5,
                            height: 1,
                            fontWeight: FontWeight.w300,
                            color: Cosmic.textFaint,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (trailing != null) ...[const SizedBox(width: 10), trailing!],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 2g's feed card: author disc, name over an italic affiliation, the body, and
/// a footer of timestamp and reaction count.
class CosmicPostCard extends StatelessWidget {
  const CosmicPostCard({
    super.key,
    required this.authorName,
    required this.body,
    this.affiliation,
    this.initials,
    this.imageUrl,
    this.timestamp,
    this.reactionCount,
    this.reacted = false,
    this.accent = Cosmic.accentExpansion,
    this.onTap,
    this.onReact,
    this.media,
  });

  final String authorName;
  final String body;

  /// e.g. "Cohort: 28" — italic under the name.
  final String? affiliation;

  final String? initials;
  final String? imageUrl;
  final String? timestamp;
  final int? reactionCount;
  final bool reacted;
  final Color accent;
  final VoidCallback? onTap;
  final VoidCallback? onReact;

  /// Optional attachment rendered between the body and the footer.
  final Widget? media;

  @override
  Widget build(BuildContext context) {
    final shape = BorderRadius.circular(20);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: shape,
        border: Border.all(color: const Color(0x2EFFFFFF)),
        gradient: Cosmic.chipFill,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: shape,
        child: InkWell(
          borderRadius: shape,
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(15),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CosmicAvatar(
                      initials: initials ??
                          (authorName.trim().isEmpty
                              ? '?'
                              : authorName.trim()[0]),
                      size: 38,
                      accent: accent,
                      imageUrl: imageUrl,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            authorName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontFamily: Cosmic.fontFamily,
                              fontSize: 13,
                              height: 1,
                              fontWeight: FontWeight.w600,
                              color: Cosmic.textPrimary,
                            ),
                          ),
                          if (affiliation != null &&
                              affiliation!.trim().isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              affiliation!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Cosmic.caption.copyWith(height: 1),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  body,
                  style: const TextStyle(
                    fontFamily: Cosmic.fontFamily,
                    fontSize: 13,
                    height: 1.45,
                    fontWeight: FontWeight.w400,
                    color: Cosmic.textPrimary,
                  ),
                ),
                if (media != null) ...[
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: Cosmic.chipRadius,
                    child: media!,
                  ),
                ],
                if (timestamp != null || reactionCount != null) ...[
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        timestamp ?? '',
                        style: const TextStyle(
                          fontFamily: Cosmic.fontFamily,
                          fontSize: 10.5,
                          height: 1,
                          fontWeight: FontWeight.w300,
                          color: Color(0x66FFFFFF),
                        ),
                      ),
                      if (reactionCount != null)
                        GestureDetector(
                          onTap: onReact,
                          behavior: HitTestBehavior.opaque,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                reacted
                                    ? Icons.favorite_rounded
                                    : Icons.favorite_border_rounded,
                                size: 13,
                                color: reacted
                                    ? Cosmic.textAccent
                                    : const Color(0x80FFFFFF),
                              ),
                              const SizedBox(width: 7),
                              Text(
                                '$reactionCount',
                                style: TextStyle(
                                  fontFamily: Cosmic.fontFamily,
                                  fontSize: 11,
                                  height: 1,
                                  fontWeight: FontWeight.w300,
                                  color: reacted
                                      ? Cosmic.textAccent
                                      : const Color(0x80FFFFFF),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 2g's compose button: a lit squircle, larger and squarer than the round FAB.
class CosmicSquircleFab extends StatelessWidget {
  const CosmicSquircleFab({
    super.key,
    required this.onTap,
    this.icon = Icons.add,
    this.accent,
    this.tooltip,
  });

  final VoidCallback onTap;
  final IconData icon;

  /// Solid-fill variant (2a's gold card button). Null gives 2g's lit red ring.
  final Color? accent;

  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    final solid = accent != null;
    final onSolid = solid && accent!.computeLuminance() > 0.5
        ? const Color(0xFF14100A)
        : Colors.white;

    final button = Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          width: 54,
          height: 54,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: solid
                ? null
                : Border.all(color: const Color(0x80FFFFFF)),
            color: solid ? accent : null,
            // Same light source as GlowPill, in the zone accent.
            gradient: solid
                ? null
                : GlowPill.bloom(Theme.of(context).colorScheme.primary),
          ),
          child: Icon(icon, size: 25, color: solid ? onSolid : Colors.white),
        ),
      ),
    );

    return tooltip == null ? button : Tooltip(message: tooltip!, child: button);
  }
}

/// The scrim 2e and 2g fade the last row into at the bottom of a scroll.
class CosmicScrollFade extends StatelessWidget {
  const CosmicScrollFade({super.key, this.height = 46});

  final double height;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: SizedBox(
        height: height,
        child: const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0x00000000), Color(0xF2000000)],
            ),
          ),
          child: SizedBox.expand(),
        ),
      ),
    );
  }
}
