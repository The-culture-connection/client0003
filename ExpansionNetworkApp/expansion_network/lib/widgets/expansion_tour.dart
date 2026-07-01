import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tutorial_coach_mark/tutorial_coach_mark.dart';

import '../theme/app_theme.dart';

/// A single stop in the alumni onboarding coach-mark tour: a spotlight on a
/// bottom-navigation icon with a short caption explaining what lives there.
class TourStep {
  const TourStep({required this.key, required this.title, required this.body});

  final GlobalKey key;
  final String title;
  final String body;
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
TutorialCoachMark buildExpansionTour({
  required List<TourStep> steps,
  VoidCallback? onDone,
}) {
  final targets = <TargetFocus>[];
  for (var i = 0; i < steps.length; i++) {
    final step = steps[i];
    final isLast = i == steps.length - 1;
    targets.add(
      TargetFocus(
        identify: 'expansion_tour_$i',
        keyTarget: step.key,
        shape: ShapeLightFocus.Circle,
        radius: 8,
        contents: [
          TargetContent(
            align: ContentAlign.top,
            builder: (context, controller) => _TourCard(
              step: step,
              index: i,
              total: steps.length,
              isLast: isLast,
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
    required this.onNext,
    required this.onSkip,
  });

  final TourStep step;
  final int index;
  final int total;
  final bool isLast;
  final VoidCallback onNext;
  final VoidCallback onSkip;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
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
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.onPrimary,
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
