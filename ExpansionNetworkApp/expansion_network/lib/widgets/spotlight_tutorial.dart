import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/cosmic.dart';

/// A step in a [SpotlightTutorial]: which widget to highlight and what to say.
class SpotlightStep {
  const SpotlightStep({
    required this.targetKey,
    required this.title,
    required this.body,
    this.shape = SpotlightShape.rrect,
  });

  final GlobalKey targetKey;
  final String title;
  final String body;

  /// Rounded rect suits cards, rows and tiles; circle suits round icons.
  final SpotlightShape shape;
}

enum SpotlightShape { circle, rrect }

/// Handle to a running tutorial, for programmatic dismissal (e.g. the caller
/// navigates away mid-tour).
class SpotlightTutorialController {
  OverlayEntry? _entry;

  bool get isShowing => _entry != null;

  /// Tears the overlay down without firing `onDone`/`onSkip` — for callers
  /// abandoning the tour from outside (where firing callbacks would recurse).
  void dismiss() => _detach();

  void _detach() {
    _entry?.remove();
    _entry = null;
  }
}

/// A walkthrough that keeps the screen static and *moves a highlight* from
/// target to target — no zooming or scaling of the page underneath.
///
/// The whole screen is dimmed except for a rounded cutout around the current
/// step's widget; between steps the cutout's position and size tween with an
/// eased animation, so the spotlight visibly travels rather than the view
/// jumping. Beta feedback (Naimah) asked for exactly this in place of the old
/// zoom-in/zoom-out coach marks.
///
/// Used by the conference walkthrough (`conference/widgets/conference_tour.dart`)
/// and the Mortarverse chooser's home-screen tutorial.
abstract final class SpotlightTutorial {
  /// Presents the tutorial in the root overlay. Steps whose target widget is
  /// not laid out are skipped. [onSkip] fires (before [onDone]) only when the
  /// user bails out via the Skip button.
  static SpotlightTutorialController show(
    BuildContext context, {
    required List<SpotlightStep> steps,
    Color accent = Cosmic.accentExpansion,
    Color onAccent = Colors.white,
    VoidCallback? onDone,
    VoidCallback? onSkip,
  }) {
    final controller = SpotlightTutorialController();
    final entry = OverlayEntry(
      builder: (_) => _SpotlightOverlay(
        controller: controller,
        steps: steps,
        accent: accent,
        onAccent: onAccent,
        onDone: onDone,
        onSkip: onSkip,
      ),
    );
    controller._entry = entry;
    Overlay.of(context, rootOverlay: true).insert(entry);
    return controller;
  }
}

class _SpotlightOverlay extends StatefulWidget {
  const _SpotlightOverlay({
    required this.controller,
    required this.steps,
    required this.accent,
    required this.onAccent,
    required this.onDone,
    required this.onSkip,
  });

  final SpotlightTutorialController controller;
  final List<SpotlightStep> steps;
  final Color accent;
  final Color onAccent;
  final VoidCallback? onDone;
  final VoidCallback? onSkip;

  @override
  State<_SpotlightOverlay> createState() => _SpotlightOverlayState();
}

class _SpotlightOverlayState extends State<_SpotlightOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 420),
  );

  int _index = 0;

  /// Cutout the spotlight is travelling from / to, in overlay coordinates.
  RRect? _from;
  RRect? _to;

  bool _visible = false;
  bool _finished = false;

  static const Curve _curve = Curves.easeInOutCubic;

  @override
  void initState() {
    super.initState();
    _ctrl.addListener(() => setState(() {}));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() => _visible = true);
      _goTo(0);
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  /// Cutout currently on screen — the eased lerp between [_from] and [_to].
  RRect? get _animatedCutout {
    final to = _to;
    if (to == null) return null;
    final from = _from;
    if (from == null) return to;
    return RRect.lerp(from, to, _curve.transform(_ctrl.value)) ?? to;
  }

  RRect? _cutoutFor(SpotlightStep step) {
    final ctx = step.targetKey.currentContext;
    if (ctx == null) return null;
    final box = ctx.findRenderObject();
    if (box is! RenderBox || !box.attached || !box.hasSize) return null;
    var rect = (box.localToGlobal(Offset.zero) & box.size).inflate(8);
    switch (step.shape) {
      case SpotlightShape.circle:
        final side = math.max(rect.width, rect.height);
        rect = Rect.fromCenter(center: rect.center, width: side, height: side);
        return RRect.fromRectAndRadius(rect, Radius.circular(side / 2));
      case SpotlightShape.rrect:
        return RRect.fromRectAndRadius(rect, const Radius.circular(18));
    }
  }

  /// Moves the spotlight to step [start], skipping steps whose target is not
  /// laid out. Past the end → finish.
  Future<void> _goTo(int start) async {
    var i = start;
    while (i < widget.steps.length &&
        widget.steps[i].targetKey.currentContext == null) {
      i++;
    }
    if (i >= widget.steps.length) {
      _finish(skipped: false);
      return;
    }
    final step = widget.steps[i];
    final ctx = step.targetKey.currentContext;
    if (ctx != null) {
      // Bring an off-screen target into view; a no-op outside scrollables.
      try {
        await Scrollable.ensureVisible(
          ctx,
          alignment: 0.5,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
        );
      } catch (_) {}
    }
    if (!mounted) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final target = _cutoutFor(step);
      if (target == null) {
        _goTo(i + 1);
        return;
      }
      setState(() {
        _index = i;
        // Departing mid-flight starts the next leg from wherever the
        // spotlight currently is. The very first leg blooms out of the
        // target's own centre.
        _from = _animatedCutout ??
            RRect.fromRectAndRadius(
              Rect.fromCenter(center: target.center, width: 0, height: 0),
              Radius.zero,
            );
        _to = target;
      });
      _ctrl.forward(from: 0);
    });
  }

  void _next() {
    if (_finished) return;
    if (_index + 1 >= widget.steps.length) {
      _finish(skipped: false);
    } else {
      _goTo(_index + 1);
    }
  }

  void _finish({required bool skipped}) {
    if (_finished) return;
    _finished = true;
    if (mounted) setState(() => _visible = false);
    Future<void>.delayed(const Duration(milliseconds: 190), () {
      widget.controller._detach();
      if (skipped) widget.onSkip?.call();
      widget.onDone?.call();
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: _visible ? 1 : 0,
      duration: const Duration(milliseconds: 180),
      child: Stack(
        children: [
          // Dim everything but the cutout; a tap anywhere advances, which is
          // also what keeps the page underneath from receiving taps mid-tour.
          Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _next,
              child: CustomPaint(
                painter: _SpotlightScrimPainter(
                  cutout: _animatedCutout,
                  accent: widget.accent,
                ),
              ),
            ),
          ),
          if (_to != null) _buildCard(context),
        ],
      ),
    );
  }

  Widget _buildCard(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final padding = MediaQuery.paddingOf(context);
    final target = _to!.outerRect;
    final step = widget.steps[_index];
    final isLast = _index >= widget.steps.length - 1 ||
        widget.steps
            .skip(_index + 1)
            .every((s) => s.targetKey.currentContext == null);

    // Caption goes on whichever side of the highlight has more room, so it
    // never covers the thing being pointed at.
    final below = (size.height - target.bottom) >= target.top;

    final card = Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xF00A0508),
        borderRadius: Cosmic.chipRadius,
        border: Border.all(color: Cosmic.panelBorder),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            step.title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
              color: Cosmic.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            step.body,
            style: const TextStyle(
              fontSize: 14,
              color: Cosmic.textBody,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${_index + 1} of ${widget.steps.length}',
                style: const TextStyle(fontSize: 12, color: Cosmic.textMuted),
              ),
              Row(
                children: [
                  TextButton(
                    onPressed: () => _finish(skipped: true),
                    child: const Text(
                      'Skip',
                      style: TextStyle(color: Cosmic.textMuted),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _next,
                    style: FilledButton.styleFrom(
                      backgroundColor: widget.accent,
                      foregroundColor: widget.onAccent,
                    ),
                    child: Text(isLast ? 'Got it' : 'Next'),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );

    // The spotlight glides; the caption crossfades to its new place so it
    // never has to animate across the highlight it belongs to.
    final content = AnimatedSwitcher(
      duration: const Duration(milliseconds: 220),
      child: KeyedSubtree(key: ValueKey<int>(_index), child: card),
    );

    if (below) {
      return Positioned(
        left: 20,
        right: 20,
        top: math.min(target.bottom + 14, size.height - 240),
        child: content,
      );
    }
    return Positioned(
      left: 20,
      right: 20,
      bottom: math.max(size.height - target.top + 14, padding.bottom + 14),
      child: content,
    );
  }
}

class _SpotlightScrimPainter extends CustomPainter {
  _SpotlightScrimPainter({required this.cutout, required this.accent});

  final RRect? cutout;
  final Color accent;

  // Shared across frames — the scrim repaints every animation tick, so the
  // Paints are allocated once rather than per frame.
  static final Paint _scrim = Paint()..color = const Color(0xD9000000);
  static final Paint _glow = Paint()
    ..style = PaintingStyle.stroke
    ..strokeWidth = 10
    ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12);
  static final Paint _ring = Paint()
    ..style = PaintingStyle.stroke
    ..strokeWidth = 1.6;

  @override
  void paint(Canvas canvas, Size size) {
    final full = Offset.zero & size;
    final hole = cutout;
    if (hole == null) {
      canvas.drawRect(full, _scrim);
      return;
    }
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(full),
        Path()..addRRect(hole),
      ),
      _scrim,
    );
    _glow.color = accent.withValues(alpha: 0.35);
    canvas.drawRRect(hole, _glow);
    _ring.color = accent.withValues(alpha: 0.9);
    canvas.drawRRect(hole, _ring);
  }

  @override
  bool shouldRepaint(covariant _SpotlightScrimPainter oldDelegate) =>
      oldDelegate.cutout != cutout || oldDelegate.accent != accent;
}
