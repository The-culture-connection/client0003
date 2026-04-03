import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class PageHeader extends StatelessWidget {
  const PageHeader({
    required this.title,
    this.subtitle,
    this.trailing,
    this.bottom,
    super.key,
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Widget? bottom;

  @override
  Widget build(BuildContext context) {
    // Shell already applies top SafeArea; keep modest padding under status bar / notch.
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(
        color: AppColors.background,
        border: Border(bottom: BorderSide(color: AppColors.border)),
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
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: AppColors.foreground,
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        subtitle!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.mutedForeground,
                            ),
                      ),
                    ],
                  ],
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          if (bottom != null) ...[
            const SizedBox(height: 12),
            bottom!,
          ],
        ],
      ),
    );
  }
}
