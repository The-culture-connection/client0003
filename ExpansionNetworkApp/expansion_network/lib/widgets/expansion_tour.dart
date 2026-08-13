import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../theme/app_theme.dart';
import '../theme/cosmic_content.dart';

/// Spotlight outline for a step. Circle suits icons; [TourShape.rrect] suits
/// cards, rows and tabs, where a circle would balloon into a huge disc.
enum TourShape { circle, rrect }

/// A single stop in a coach-mark tour: a spotlight on a widget plus a short
/// caption explaining what lives there.
class TourStep {
  const TourStep({
    required this.key,
    required this.title,
    required this.body,
    this.shape = TourShape.circle,
  });

  final GlobalKey key;
  final String title;
  final String body;
  final TourShape shape;
}

/// Persisted flag so the tour only auto-runs once per install after sign-up.
const String _seenTourKey = 'expansion_tour_seen';

Future<bool> hasSeenExpansionTour() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool(_seenTourKey) ?? false;
}

Future<void> markExpansionTourSeen() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setBool(_seenTourKey, true);
}

/// Builds a spotlight walkthrough over [steps]. The caller shows it with
/// `.show(context: context)` once the target widgets are laid out.
///
/// [accent] tints the Next button so the Conference tour can run gold while the
/// Expansion tour stays red; [onSkip] fires only when the user bails out, which
/// the Conference tour uses to abandon its remaining chapters.
ExpansionTour buildExpansionTour({
  required List<TourStep> steps,
  VoidCallback? onDone,
  VoidCallback? onSkip,
  Color accent = AppColors.primary,
  Color onAccent = AppColors.onPrimary,
}) {
  return ExpansionTour(
    steps: steps,
    onDone: onDone,
    onSkip: onSkip,
    accent: accent,
    onAccent: onAccent,
  );
}

/// Drives a coach-mark overlay in which the spotlight **slides** from one
/// target to the next.
///
/// Written in place of `tutorial_coach_mark` because that package has only one
/// transition: it reverses the focus animation to nothing, jumps to the next
/// target, and expands again. Beta feedback named that directly — "it would be
/// nice if the tutorial just moved a highlight around instead of the zooming in
/// and out" — and the package exposes no way to turn it off (`pulseEnable`
/// only stops the idle throb, not the collapse between steps).
///
/// Here the hole is a single [RRect] tweened with [RRect.lerp], so it travels
/// and reshapes in one continuous move; the caption rides along and crossfades
/// its text at the midpoint.
class ExpansionTour {
  ExpansionTour({
    required this.steps,
    this.onDone,
    this.onSkip,
    this.accent = AppColors.primary,
    this.onAccent = AppColors.onPrimary,
  });

  final List<TourStep> steps;
  final VoidCallback? onDone;
  final VoidCallback? onSkip;
  final Color accent;
  final Color onAccent;

  OverlayEntry? _entry;
  final GlobalKey<_TourOverlayState> _overlayKey = GlobalKey<_TourOverlayState>();

  bool get isShowing => _entry != null;

  void show({required BuildContext context}) {
    if (_entry != null || steps.isEmpty) return;
    final overlay = Overlay.of(context, rootOverlay: true);
    final entry = OverlayEntry(
      builder: (_) => _TourOverlay(
        key: _overlayKey,
        steps: steps,
        accent: accent,
        onAccent: onAccent,
        onSkip: () {
          onSkip?.call();
          _remove();
          onDone?.call();
        },
        onFinish: () {
          _remove();
          onDone?.call();
        },
      ),
    );
    _entry = entry;
    overlay.insert(entry);
  }

  /// Tears the overlay down without firing [onDone] — used when the owner
  /// abandons the tour (e.g. the user navigated away mid-chapter).
  void finish() => _remove();

  void _remove() {
    _entry?.remove();
    _entry = null;
  }
}

class _TourOverlay extends StatefulWidget {
  const _TourOverlay({
    super.key,
    required this.steps,
    required this.accent,
    required this.onAccent,
    required this.onSkip,
    required this.onFinish,
  });

  final List<TourStep> steps;
  final Color accent;
  final Color onAccent;
  final VoidCallback onSkip;
  final VoidCallback onFinish;

  @override
  State<_TourOverlay> createState() => _TourOverlayState();
}

class _TourOverlayState extends State<_TourOverlay> with TickerProviderStateMixin {
  /// Breathing room painted around the target.
  static const double _padding = 10;

  late final AnimationController _move;
  late final AnimationController _scrim;
  late final Animation<double> _moveCurve;

  int _index = 0;

  /// Which step's caption is on screen. Swapped at the midpoint of a move so
  /// the text changes while the highlight is between the two targets.
  int _captionIndex = 0;

  RRect? _from;
  RRect? _to;

  @override
  void initState() {
    super.initState();
    _move = AnimationController(vsync: this, duration: const Duration(milliseconds: 480));
    _moveCurve = CurvedAnimation(parent: _move, curve: Curves.easeInOutCubic);
    _scrim = AnimationController(vsync: this, duration: const Duration(milliseconds: 240));

    _move.addListener(() {
      if (_move.value >= 0.5 && _captionIndex != _index) {
        setState(() => _captionIndex = _index);
      }
    });

    // The scrim fades up with the hole already parked on the first target, so
    // the tour opens without a zoom of its own either.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() => _to = _rectFor(widget.steps.first));
      _scrim.forward();
    });
  }

  @override
  void dispose() {
    _move.dispose();
    _scrim.dispose();
    super.dispose();
  }

  /// The step's on-screen bounds, padded, as the rounded rect to cut out.
  /// Returns null when the widget has gone (rotated away, scrolled off).
  RRect? _rectFor(TourStep step) {
    final ctx = step.key.currentContext;
    if (ctx == null) return null;
    final box = ctx.findRenderObject();
    if (box is! RenderBox || !box.hasSize) return null;
    final origin = box.localToGlobal(Offset.zero);
    final rect = (origin & box.size).inflate(_padding);
    if (step.shape == TourShape.circle) {
      // A circle big enough to contain the padded box.
      final r = rect.longestSide / 2;
      return RRect.fromRectAndRadius(
        Rect.fromCircle(center: rect.center, radius: r),
        Radius.circular(r),
      );
    }
    return RRect.fromRectAndRadius(rect, const Radius.circular(14));
  }

  void _next() {
    if (_move.isAnimating) return;
    if (_index >= widget.steps.length - 1) {
      _finish();
      return;
    }
    final target = _rectFor(widget.steps[_index + 1]);
    if (target == null) {
      // Nothing to point at — skip past it rather than stalling on a hole that
      // sits over the wrong thing.
      _index++;
      _captionIndex = _index;
      _next();
      return;
    }
    setState(() {
      _from = _currentRect();
      _to = target;
      _index++;
    });
    _move.forward(from: 0);
  }

  void _finish() {
    _scrim.reverse().whenComplete(() {
      if (mounted) widget.onFinish();
    });
  }

  void _skip() {
    _scrim.reverse().whenComplete(() {
      if (mounted) widget.onSkip();
    });
  }

  RRect? _currentRect() {
    final from = _from;
    final to = _to;
    if (from == null) return to;
    if (to == null) return from;
    return RRect.lerp(from, to, _moveCurve.value);
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    return AnimatedBuilder(
      animation: Listenable.merge([_move, _scrim]),
      builder: (context, _) {
        final hole = _currentRect();
        final step = widget.steps[_captionIndex];
        return Material(
          type: MaterialType.transparency,
          child: Opacity(
            opacity: _scrim.value,
            child: Stack(
              children: [
                // Absorbs taps on the dimmed area so the screen underneath
                // can't be operated mid-tour.
                Positioned.fill(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () {},
                    child: CustomPaint(
                      painter: _SpotlightPainter(hole: hole, accent: widget.accent),
                    ),
                  ),
                ),
                if (hole != null)
                  _captionSlot(
                    size: size,
                    hole: hole,
                    child: _TourCard(
                      // Keyed so the crossfade actually runs between steps.
                      key: ValueKey<int>(_captionIndex),
                      step: step,
                      index: _captionIndex,
                      total: widget.steps.length,
                      isLast: _captionIndex == widget.steps.length - 1,
                      accent: widget.accent,
                      onAccent: widget.onAccent,
                      onNext: _next,
                      onSkip: _skip,
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Puts the caption on whichever side of the spotlight has more room, so a
  /// target near the top or bottom edge never pushes the card (and its Next
  /// button) off screen.
  Widget _captionSlot({
    required Size size,
    required RRect hole,
    required Widget child,
  }) {
    final below = size.height - hole.bottom;
    final placeBelow = below >= hole.top;
    final animated = AnimatedSwitcher(
      duration: const Duration(milliseconds: 180),
      child: child,
    );
    return Positioned(
      left: 0,
      right: 0,
      top: placeBelow ? hole.bottom + 16 : null,
      bottom: placeBelow ? null : size.height - hole.top + 16,
      child: animated,
    );
  }
}

/// Paints the dim scrim with the spotlight cut out of it, plus a thin accent
/// ring so the highlighted edge reads against a dark UI.
class _SpotlightPainter extends CustomPainter {
  const _SpotlightPainter({required this.hole, required this.accent});

  final RRect? hole;
  final Color accent;

  @override
  void paint(Canvas canvas, Size size) {
    final scrim = Paint()..color = Colors.black.withValues(alpha: 0.85);
    final h = hole;
    if (h == null) {
      canvas.drawRect(Offset.zero & size, scrim);
      return;
    }
    final full = Path()..addRect(Offset.zero & size);
    final cut = Path()..addRRect(h);
    canvas.drawPath(Path.combine(PathOperation.difference, full, cut), scrim);
    canvas.drawRRect(
      h,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = accent.withValues(alpha: 0.9),
    );
  }

  @override
  bool shouldRepaint(_SpotlightPainter old) => old.hole != hole || old.accent != accent;
}

class _TourCard extends StatelessWidget {
  const _TourCard({
    super.key,
    required this.step,
    required this.index,
    required this.total,
    required this.isLast,
    required this.accent,
    required this.onAccent,
    required this.onNext,
    required this.onSkip,
  });

  final TourStep step;
  final int index;
  final int total;
  final bool isLast;
  final Color accent;
  final Color onAccent;
  final VoidCallback onNext;
  final VoidCallback onSkip;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: Cosmic.chipRadius,
        border: Border.all(color: AppColors.border),
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
              color: AppColors.foreground,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            step.body,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.mutedForeground,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                '${index + 1} of $total',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.mutedForeground,
                ),
              ),
              Row(
                children: [
                  TextButton(
                    onPressed: onSkip,
                    child: const Text(
                      'Skip',
                      style: TextStyle(color: AppColors.mutedForeground),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: onNext,
                    style: FilledButton.styleFrom(
                      backgroundColor: accent,
                      foregroundColor: onAccent,
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
  }
}
