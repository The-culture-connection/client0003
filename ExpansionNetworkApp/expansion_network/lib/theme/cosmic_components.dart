import 'dart:ui' as ui;

import 'package:flutter/material.dart';

// Pulls in the tokens too — cosmic_widgets re-exports them.
import 'cosmic_widgets.dart';

/// One import gives a screen the whole language: tokens, surfaces, components.
export 'cosmic_widgets.dart';

/// Composed components ported from Claude Design turn 2 — options **2a**
/// (Conference lobby), **2b** (Profile) and **2d** (Home dashboard).
///
/// `cosmic_widgets.dart` holds the raw surfaces (glass panel, torn horizon,
/// pill). This file holds the pieces the mockups *repeat across screens*.
/// Anything appearing in more than one option is built once here, so a value
/// only ever has to be corrected in one place.

/// Screen chrome: an optional back affordance, the title, and an optional
/// italic accent action.
///
/// 2a uses it as `← Mortarverse … Leave conference`; 2b as `Profile … Sign
/// out`. Same bar, different title weight.
class CosmicScreenHeader extends StatelessWidget {
  const CosmicScreenHeader({
    super.key,
    required this.title,
    this.onBack,
    this.actionLabel,
    this.onAction,
    this.large = false,
    this.trailing,
  });

  final String title;
  final VoidCallback? onBack;
  final String? actionLabel;
  final VoidCallback? onAction;

  /// 2b's heavier 19px treatment for a top-level screen, versus 2a's 13px
  /// "where you came from" label.
  final bool large;

  /// Extra controls between the title and the action.
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(Cosmic.gutter, 18, Cosmic.gutter, 0),
      child: Row(
        children: [
          if (onBack != null)
            GestureDetector(
              onTap: onBack,
              behavior: HitTestBehavior.opaque,
              child: const Padding(
                padding: EdgeInsets.only(right: 10),
                child: Icon(
                  Icons.arrow_back,
                  size: 17,
                  color: Color(0xBFFFFFFF),
                ),
              ),
            ),
          Expanded(
            child: Text(
              title,
              overflow: TextOverflow.ellipsis,
              style: large
                  ? Cosmic.headline.copyWith(
                      fontSize: 19,
                      height: 1,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.14,
                    )
                  : const TextStyle(
                      fontFamily: Cosmic.fontFamily,
                      fontSize: 13,
                      height: 1,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.65,
                      color: Cosmic.textPrimary,
                    ),
            ),
          ),
          if (trailing != null) ...[
            trailing!,
            const SizedBox(width: 14),
          ],
          if (actionLabel != null)
            GestureDetector(
              onTap: onAction,
              behavior: HitTestBehavior.opaque,
              child: Text(
                actionLabel!,
                style: Cosmic.caption.copyWith(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w400,
                  color: Cosmic.textAccent,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// The destination row from 2a: a rounded-square icon tile, a tracked-out
/// title over an italic subtitle, and a chevron.
///
/// This is the list primitive for the whole app — anywhere a row navigates
/// somewhere, it should be one of these.
class CosmicNavRow extends StatelessWidget {
  const CosmicNavRow({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.accent = Cosmic.accentExpansion,
    this.onTap,
    this.trailing,
  });

  final String title;
  final String? subtitle;
  final IconData? icon;
  final Color accent;
  final VoidCallback? onTap;

  /// Replaces the chevron when a row needs its own control.
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final shape = Cosmic.chipRadius;
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
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            child: Row(
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: accent.withValues(alpha: 0.4)),
                  ),
                  child: icon == null
                      ? null
                      : Icon(
                          icon,
                          size: 15,
                          color: accent.withValues(alpha: 0.9),
                        ),
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title.toUpperCase(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: Cosmic.fontFamily,
                          fontSize: 11.5,
                          height: 1,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 1.15,
                          color: Cosmic.textPrimary,
                        ),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 5),
                        Text(
                          subtitle!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Cosmic.caption.copyWith(height: 1),
                        ),
                      ],
                    ],
                  ),
                ),
                trailing ??
                    const Icon(
                      Icons.chevron_right_rounded,
                      size: 16,
                      color: Cosmic.textFaint,
                    ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 2a's segmented control: a pill track with the active segment filled in the
/// zone accent and dark ink.
class CosmicSegmented extends StatelessWidget {
  const CosmicSegmented({
    super.key,
    required this.segments,
    required this.index,
    required this.onChanged,
    this.accent = Cosmic.accentExpansion,
    this.segmentKeys,
  });

  final List<String> segments;
  final int index;
  final ValueChanged<int> onChanged;
  final Color accent;

  /// Per-segment keys, for walkthroughs that spotlight one tab. Must be the
  /// same length as [segments] when supplied. The key lands on the laid-out
  /// segment box rather than the [Expanded], which is what a spotlight needs
  /// to measure.
  final List<Key?>? segmentKeys;

  @override
  Widget build(BuildContext context) {
    final onAccent = accent.computeLuminance() > 0.5
        ? const Color(0xFF14100A)
        : Colors.white;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(Cosmic.radiusPill),
        border: Border.all(color: const Color(0x29FFFFFF)),
        color: const Color(0x08FFFFFF),
      ),
      child: Row(
        children: [
          for (var i = 0; i < segments.length; i++)
            Expanded(
              child: GestureDetector(
                onTap: () => onChanged(i),
                behavior: HitTestBehavior.opaque,
                child: AnimatedContainer(
                  key: segmentKeys != null && i < segmentKeys!.length
                      ? segmentKeys![i]
                      : null,
                  duration: const Duration(milliseconds: 180),
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(Cosmic.radiusPill),
                    color: i == index ? accent : Colors.transparent,
                  ),
                  child: Text(
                    segments[i].toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: Cosmic.fontFamily,
                      fontSize: 10,
                      height: 1,
                      fontWeight:
                          i == index ? FontWeight.w600 : FontWeight.w500,
                      letterSpacing: 1.6,
                      color: i == index ? onAccent : const Color(0x99FFFFFF),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// 2a's event hero: a glass banner with an accent bloom and orbit ring bleeding
/// off the top-right, a torn edge along the bottom, the name in display type,
/// and a status capsule.
class CosmicHeroBanner extends StatelessWidget {
  const CosmicHeroBanner({
    super.key,
    required this.title,
    this.subtitle,
    this.status,
    this.accent = Cosmic.accentConference,
    this.height = 132,
  });

  final String title;
  final String? subtitle;

  /// e.g. "ENDED", "LIVE". Omitted when there is nothing to say.
  final String? status;
  final Color accent;
  final double height;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(Cosmic.radiusPanel),
      child: Container(
        height: height,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(Cosmic.radiusPanel),
          border: Border.all(color: const Color(0x38FFFFFF)),
          gradient: Cosmic.panelFill,
        ),
        child: Stack(
          children: [
            Positioned(
              right: -60,
              top: -70,
              child: Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      accent.withValues(alpha: 0.3),
                      accent.withValues(alpha: 0),
                    ],
                    stops: const [0, 0.62],
                  ),
                ),
              ),
            ),
            Positioned(
              right: -40,
              top: -46,
              child: Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: accent.withValues(alpha: 0.24)),
                ),
              ),
            ),
            const Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: TornHorizon(height: 10, opacity: 0.45),
            ),
            Positioned(
              left: Cosmic.gutter,
              bottom: 24,
              right: 96,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title.toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: Cosmic.fontFamily,
                      fontSize: 26,
                      height: 1,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.56,
                      color: Cosmic.textPrimary,
                      shadows: [
                        Shadow(color: Color(0x66FF505A), blurRadius: 22),
                      ],
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      subtitle!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Cosmic.caption.copyWith(
                        fontSize: 11.5,
                        height: 1,
                        color: const Color(0x99FFFFFF),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (status != null)
              Positioned(
                right: 16,
                bottom: 20,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(Cosmic.radiusPill),
                    border: Border.all(color: const Color(0x59FFFFFF)),
                    color: const Color(0x66000000),
                  ),
                  child: Text(
                    status!.toUpperCase(),
                    style: Cosmic.statusLabel.copyWith(
                      letterSpacing: 1.62,
                      color: const Color(0xBFFFFFFF),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// 2a's check-in strip: a ring, a tracked accent label, and a solid pill CTA.
class CosmicActionRow extends StatelessWidget {
  const CosmicActionRow({
    super.key,
    required this.label,
    required this.ctaLabel,
    required this.onTap,
    this.accent = Cosmic.accentConference,
    this.enabled = true,
  });

  final String label;
  final String ctaLabel;
  final VoidCallback onTap;
  final Color accent;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final onAccent = accent.computeLuminance() > 0.5
        ? const Color(0xFF14100A)
        : Colors.white;
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Cosmic.chipBorder),
        gradient: Cosmic.chipFill,
      ),
      child: Row(
        children: [
          Container(
            width: 26,
            height: 26,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: accent.withValues(alpha: 0.55)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label.toUpperCase(),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontFamily: Cosmic.fontFamily,
                fontSize: 11,
                height: 1,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.76,
                color: accent,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: enabled ? onTap : null,
              customBorder: const StadiumBorder(),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(Cosmic.radiusPill),
                  color: enabled ? accent : accent.withValues(alpha: 0.22),
                ),
                child: Text(
                  ctaLabel.toUpperCase(),
                  style: TextStyle(
                    fontFamily: Cosmic.fontFamily,
                    fontSize: 10.5,
                    height: 1,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.26,
                    color: enabled ? onAccent : const Color(0x80FFFFFF),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 2b's identity disc: a gradient circle carrying the member's initials, or
/// their photo when there is one.
class CosmicAvatar extends StatelessWidget {
  const CosmicAvatar({
    super.key,
    required this.initials,
    this.size = 96,
    this.accent = Cosmic.accentExpansion,
    this.imageUrl,
  });

  final String initials;
  final double size;
  final Color accent;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final hasImage = imageUrl != null && imageUrl!.trim().isNotEmpty;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0x33FFFFFF)),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            accent,
            Color.lerp(accent, Colors.black, 0.45) ?? accent,
          ],
        ),
        image: hasImage
            ? DecorationImage(
                image: NetworkImage(imageUrl!),
                fit: BoxFit.cover,
              )
            : null,
      ),
      child: hasImage
          ? null
          : Center(
              child: Text(
                initials.toUpperCase(),
                style: TextStyle(
                  fontFamily: Cosmic.fontFamily,
                  fontSize: size * 0.23,
                  height: 1,
                  fontWeight: FontWeight.w600,
                  letterSpacing: size * 0.01,
                  color: Colors.white,
                  shadows: const [
                    Shadow(
                      color: Color(0xB3000000),
                      blurRadius: 6,
                      offset: Offset(0, 1),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

/// 2b's label/value block — a fixed label column against free-flowing values.
class CosmicDataGrid extends StatelessWidget {
  const CosmicDataGrid({
    super.key,
    required this.rows,
    this.labelWidth = 88,
  });

  /// Ordered label → value pairs. Rows with an empty value are dropped rather
  /// than rendered as a blank line.
  final List<(String, String)> rows;
  final double labelWidth;

  @override
  Widget build(BuildContext context) {
    final shown = rows.where((r) => r.$2.trim().isNotEmpty).toList();
    if (shown.isEmpty) return const SizedBox.shrink();

    const label = TextStyle(
      fontFamily: Cosmic.fontFamily,
      fontSize: 11.5,
      height: 1.3,
      fontWeight: FontWeight.w300,
      color: Color(0x6BFFFFFF),
    );
    const value = TextStyle(
      fontFamily: Cosmic.fontFamily,
      fontSize: 11.5,
      height: 1.3,
      fontWeight: FontWeight.w300,
      color: Cosmic.textPrimary,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < shown.length; i++) ...[
          if (i > 0) const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: labelWidth,
                child: Text(shown[i].$1, style: label),
              ),
              Expanded(child: Text(shown[i].$2, style: value)),
            ],
          ),
        ],
      ],
    );
  }
}

/// 2b's step card: an italic tracked "STEP n OF m" over a title, an edit
/// affordance, and free-form content beneath.
class CosmicStepCard extends StatelessWidget {
  const CosmicStepCard({
    super.key,
    required this.title,
    required this.child,
    this.eyebrow,
    this.onEdit,
  });

  final String title;
  final Widget child;
  final String? eyebrow;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 26),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Cosmic.chipBorder),
        gradient: Cosmic.chipFill,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (eyebrow != null) ...[
                      Text(
                        eyebrow!.toUpperCase(),
                        style: Cosmic.eyebrow.copyWith(
                          fontSize: 9.5,
                          letterSpacing: 1.9,
                          color: Cosmic.textFaint,
                        ),
                      ),
                      const SizedBox(height: 9),
                    ],
                    Text(
                      title,
                      style: Cosmic.headline.copyWith(fontSize: 16, height: 1),
                    ),
                  ],
                ),
              ),
              if (onEdit != null)
                GestureDetector(
                  onTap: onEdit,
                  behavior: HitTestBehavior.opaque,
                  child: const Padding(
                    padding: EdgeInsets.only(left: 12),
                    child: Icon(
                      Icons.edit_outlined,
                      size: 18,
                      color: Cosmic.textAccent,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 20),
          child,
        ],
      ),
    );
  }
}

/// One destination in [CosmicBottomNav].
class CosmicNavItem {
  const CosmicNavItem({required this.label, required this.icon});

  final String label;
  final IconData icon;
}

/// The floating pill nav shared by 2a, 2b and 2d: a blurred capsule sitting
/// clear of the bottom edge, active item in the zone accent.
class CosmicBottomNav extends StatelessWidget {
  const CosmicBottomNav({
    super.key,
    required this.items,
    required this.index,
    required this.onSelect,
    this.accent = Cosmic.accentExpansion,
    this.itemKeys,
  });

  final List<CosmicNavItem> items;
  final int index;
  final ValueChanged<int> onSelect;
  final Color accent;

  /// Per-item keys for coach-mark spotlights. Unlike Material's
  /// [NavigationBar], which renders a separate selected and unselected icon,
  /// each destination here is a single widget — so one key per item is enough.
  final List<Key?>? itemKeys;

  /// Vertical space the bar occupies above the bottom edge. Screens that set
  /// [Scaffold.extendBody] must pad their scroll content by this much or the
  /// last row sits under the capsule.
  static double clearance(BuildContext context) =>
      24 + 10 + 20 + 6 + 9 + 10 + MediaQuery.paddingOf(context).bottom;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        14,
        0,
        14,
        24 + MediaQuery.paddingOf(context).bottom,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(Cosmic.radiusPanel),
        child: BackdropFilter(
          filter: ui.ImageFilter.blur(sigmaX: 6, sigmaY: 6),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(Cosmic.radiusPanel),
              border: Border.all(color: const Color(0x24FFFFFF)),
              color: const Color(0xB8080406),
            ),
            child: Row(
              children: [
                for (var i = 0; i < items.length; i++)
                  Expanded(
                    child: GestureDetector(
                      onTap: () => onSelect(i),
                      behavior: HitTestBehavior.opaque,
                      child: Column(
                        key: itemKeys != null && i < itemKeys!.length
                            ? itemKeys![i]
                            : null,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            items[i].icon,
                            size: 20,
                            color: i == index
                                ? accent
                                : const Color(0x66FFFFFF),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            items[i].label.toUpperCase(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontFamily: Cosmic.fontFamily,
                              fontSize: 9,
                              height: 1,
                              fontWeight: i == index
                                  ? FontWeight.w600
                                  : FontWeight.w500,
                              letterSpacing: 1.26,
                              color: i == index
                                  ? accent
                                  : const Color(0x80FFFFFF),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
