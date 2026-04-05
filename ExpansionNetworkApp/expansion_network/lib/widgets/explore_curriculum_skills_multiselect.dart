import 'package:flutter/material.dart';

import '../data/curriculum_onboarding_data.dart';
import '../theme/app_theme.dart';
import 'curriculum_skill_category_card.dart';

/// Onboarding-style expandable categories + checkboxes for Explore job/skill posts.
class ExploreCurriculumSkillsMultiselect extends StatelessWidget {
  const ExploreCurriculumSkillsMultiselect({
    super.key,
    required this.sectionTitle,
    required this.sectionHint,
    required this.selectedSkills,
    required this.expandedCategoryTitle,
    required this.onCategoryHeaderTap,
    required this.onSkillToggle,
    this.maxSkills = 30,
  });

  final String sectionTitle;
  final String sectionHint;
  final Set<String> selectedSkills;
  final String? expandedCategoryTitle;
  final void Function(String categoryTitle) onCategoryHeaderTap;
  final void Function(String skill) onSkillToggle;
  final int maxSkills;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          sectionTitle,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 6),
        Text(
          sectionHint,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground, height: 1.35),
        ),
        const SizedBox(height: 4),
        Text(
          'Selected: ${selectedSkills.length} of up to $maxSkills',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground),
        ),
        const SizedBox(height: 12),
        for (final cat in kCurriculumSkillCategories)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: CurriculumSkillCategoryCard(
              category: cat,
              expanded: expandedCategoryTitle == cat.title,
              selectedSkills: selectedSkills,
              onHeaderTap: () => onCategoryHeaderTap(cat.title),
              onSkillToggle: onSkillToggle,
            ),
          ),
      ],
    );
  }
}
