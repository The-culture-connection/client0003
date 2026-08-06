import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tutorial_coach_mark/tutorial_coach_mark.dart';

import '../theme/app_theme.dart';
import '../theme/cosmic_content.dart';

// Callers pick a spotlight shape per step; re-exported so screens don't need a
// direct dependency on the coach-mark package.
export 'package:tutorial_coach_mark/tutorial_coach_mark.dart' show ShapeLightFocus;

/// A single stop in the alumni onboarding coach-mark tour: a spotlight on a
/// bottom-navigation icon with a short caption explaining what lives there.
class TourStep {
  const TourStep({
    required this.key,
    required this.title,
    required this.body,
    this.shape = ShapeLightFocus.Circle,
  });

  final GlobalKey key;
  final String title;
  final String body;

  /// Circle suits icons; use [ShapeLightFocus.RRect] for cards, rows and tabs
  /// so the spotlight doesn't balloon into a huge disc around a wide target.
  final ShapeLightFocus shape;
}

/// Places the caption on whichever side of the target has room.
///
/// A fixed `ContentAlign.top` pushes the card off-screen for targets near the
/// top of the display — and once it is off-screen its Next button stops
/// receiving taps, which reads to the user as a frozen tour.
ContentAlign _alignFor(GlobalKey key) {
  final ctx = key.currentContext;
  if (ctx == null) return ContentAlign.bottom;
  final box = ctx.findRenderObject();
  if (box is! RenderBox || !box.hasSize) return ContentAlign.bottom;
  final screenH = MediaQuery.of(ctx).size.height;
  final top = box.localToGlobal(Offset.zero).dy;
  final bottom = top + box.size.height;
  // Prefer the side with more free space, so tall targets still get a caption.
  return top > (screenH - bottom) ? ContentAlign.top : ContentAlign.bottom;
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

/// Builds a spotlight walkthrough over the given [steps]. The caller shows it
/// with `.show(context: context)` once the target widgets are laid out.
///
/// [accent] tints the Next button so the Conference tour can run gold while the
/// Expansion tour stays red; [onSkip] fires only when the user bails out, which
/// the Conference tour uses to abandon its remaining chapters.
TutorialCoachMark buildExpansionTour({
  required List<TourStep> steps,
  VoidCallback? onDone,
  VoidCallback? onSkip,
  Color accent = AppColors.primary,
  Color onAccent = AppColors.onPrimary,
}) {
  final targets = <TargetFocus>[];
  for (var i = 0; i < steps.length; i++) {
    final step = steps[i];
    final isLast = i == steps.length - 1;
    targets.add(
      TargetFocus(
        identify: 'expansion_tour_$i',
        keyTarget: step.key,
        shape: step.shape,
        radius: 12,
        contents: [
          TargetContent(
            align: _alignFor(step.key),
            builder: (context, controller) => _TourCard(
              step: step,
              index: i,
              total: steps.length,
              isLast: isLast,
              accent: accent,
              onAccent: onAccent,
              onNext: controller.next,
              onSkip: controller.skip,
            ),
          ),
        ],
      ),
    );
  }

  return TutorialCoachMark(
    targets: targets,
    colorShadow: Colors.black,
    opacityShadow: 0.85,
    hideSkip: true, // the card renders its own Skip / Next controls
    onFinish: () {
      onDone?.call();
    },
    onSkip: () {
      onSkip?.call();
      onDone?.call();
      return true;
    },
  );
}

class _TourCard extends StatelessWidget {
  const _TourCard({
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
