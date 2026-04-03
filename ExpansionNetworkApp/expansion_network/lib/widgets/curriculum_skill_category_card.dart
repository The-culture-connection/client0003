import 'package:flutter/material.dart';

import '../data/curriculum_onboarding_data.dart';
import '../theme/app_theme.dart';

/// Expandable category + checkboxes (same UX as onboarding).
class CurriculumSkillCategoryCard extends StatelessWidget {
  const CurriculumSkillCategoryCard({
    super.key,
    required this.category,
    required this.expanded,
    required this.selectedSkills,
    required this.onHeaderTap,
    required this.onSkillToggle,
  });

  final CurriculumSkillCategory category;
  final bool expanded;
  final Set<String> selectedSkills;
  final VoidCallback onHeaderTap;
  final void Function(String skill) onSkillToggle;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.secondary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            InkWell(
              onTap: onHeaderTap,
              borderRadius: BorderRadius.circular(8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          category.title,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          category.description,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppColors.mutedForeground,
                                height: 1.35,
                              ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(left: 8, top: 2),
                    child: Text(
                      expanded ? '−' : '+',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: AppColors.mutedForeground,
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                  ),
                ],
              ),
            ),
            if (expanded) ...[
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.only(left: 12),
                decoration: const BoxDecoration(
                  border: Border(
                    left: BorderSide(color: AppColors.border, width: 2),
                  ),
                ),
                child: Column(
                  children: category.skills.map((skill) {
                    return CheckboxListTile(
                      value: selectedSkills.contains(skill),
                      onChanged: (_) => onSkillToggle(skill),
                      title: Text(skill, style: const TextStyle(fontSize: 14, height: 1.35)),
                      dense: true,
                      controlAffinity: ListTileControlAffinity.leading,
                      contentPadding: EdgeInsets.zero,
                    );
                  }).toList(),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
