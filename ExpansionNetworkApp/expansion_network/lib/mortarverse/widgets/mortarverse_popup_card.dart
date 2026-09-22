import 'package:flutter/material.dart';

import '../../commons/theme/commons_colors.dart';
import '../../conference/theme/conference_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/cosmic_widgets.dart';
import '../mortarverse_popup.dart';

/// The slide-up notice on the Mortarverse screen.
///
/// Deliberately **not** a dialog. There is a `showGeneralDialog` precedent in
/// the app (the badge celebration), but it draws a barrier and takes the whole
/// screen hostage — the opposite of what is wanted here. This sits at the
/// bottom of the chooser's own `Stack`, leaves the street scrollable behind it,
/// and can be flicked away.
///
/// Built from [GlassPanel] and [GlowPill], the same pieces as
/// `MortarverseFocusCard`, so it reads as part of the screen rather than as
/// something bolted on.
class MortarversePopupCard extends StatefulWidget {
  const MortarversePopupCard({
    super.key,
    required this.candidate,
    required this.onOpen,
    required this.onDismiss,
  });

  final MortarversePopupCandidate candidate;

  /// Tapped the card or its CTA — navigate, and treat it as seen.
  final VoidCallback onOpen;

  /// Dismissed by the close button or a downward flick.
  final VoidCallback onDismiss;

  @override
  State<MortarversePopupCard> createState() => _MortarversePopupCardState();
}

class _MortarversePopupCardState extends State<MortarversePopupCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 280),
  );

  late final Animation<Offset> _offset = Tween<Offset>(
    begin: const Offset(0, 0.35),
    end: Offset.zero,
  ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));

  late final Animation<double> _fade =
      CurvedAnimation(parent: _controller, curve: Curves.easeOut);

  /// Accumulated downward drag, so a flick can carry the card off screen.
  double _dragY = 0;

  @override
  void initState() {
    super.initState();
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Plays the entrance backwards, then reports the dismissal.
  ///
  /// Awaited rather than fired alongside the callback: removing the widget
  /// first would cut the animation off mid-flight.
  Future<void> _dismiss() async {
    if (!mounted) return;
    await _controller.reverse();
    if (!mounted) return;
    widget.onDismiss();
  }

  Color get _accent => switch (widget.candidate.kind) {
        // Matches MortarverseAction.messages, so the same subject keeps the
        // same colour wherever it appears on this screen.
        MortarversePopupKind.message => AppColors.primary,
        MortarversePopupKind.event => CommonsColors.accent,
        MortarversePopupKind.announcement => ConferenceColors.gold,
      };

  @override
  Widget build(BuildContext context) {
    final c = widget.candidate;
    final accent = _accent;
    // Respect the OS "reduce motion" setting: the card still appears, it just
    // does not travel.
    final reduceMotion = MediaQuery.disableAnimationsOf(context);

    final card = Padding(
      padding: EdgeInsets.fromLTRB(
        16,
        0,
        16,
        16 + MediaQuery.viewPaddingOf(context).bottom,
      ),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onOpen,
        onVerticalDragUpdate: (d) {
          // Downward only — an upward drag belongs to the list behind.
          _dragY = (_dragY + d.delta.dy).clamp(0, 400);
        },
        onVerticalDragEnd: (d) {
          final flicked = (d.primaryVelocity ?? 0) > 250 || _dragY > 64;
          _dragY = 0;
          if (flicked) _dismiss();
        },
        child: GlassPanel(
          padding: const EdgeInsets.fromLTRB(20, 18, 14, 18),
          bloomAt: const Alignment(1.6, -1.8),
          bloomColor: accent,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: accent,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: accent.withValues(alpha: 0.6),
                                blurRadius: 8,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            c.eyebrow,
                            style: Cosmic.eyebrow.copyWith(color: accent),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      c.headline,
                      style: Cosmic.headline.copyWith(fontSize: 19, height: 1.2),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (c.body.trim().isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        c.body,
                        style: Cosmic.body,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 14),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: GlowPill(
                        label: c.ctaLabel,
                        accent: accent,
                        onTap: widget.onOpen,
                      ),
                    ),
                  ],
                ),
              ),
              // Its own tap target, above the card's, so dismissing never
              // navigates by accident.
              Semantics(
                button: true,
                label: 'Dismiss',
                child: IconButton(
                  icon: const Icon(Icons.close_rounded, size: 18),
                  color: Cosmic.textFaint,
                  visualDensity: VisualDensity.compact,
                  tooltip: 'Dismiss',
                  onPressed: _dismiss,
                ),
              ),
            ],
          ),
        ),
      ),
    );

    // The whole card is one announcement to a screen reader, and the drag
    // gesture is not discoverable, so the dismiss action is published here too.
    final semantic = Semantics(
      container: true,
      liveRegion: true,
      label: '${c.eyebrow}. ${c.headline}. ${c.body}',
      onDismiss: _dismiss,
      child: card,
    );

    if (reduceMotion) return semantic;

    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(position: _offset, child: semantic),
    );
  }
}
