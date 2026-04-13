import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';

/// Legacy route: event approve/decline is **not** available in the Expansion app.
/// Staff use **Digital Curriculum** to review `events_mobile` submissions.
class AdminEventsScreen extends StatelessWidget {
  const AdminEventsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back),
                    onPressed: () => context.pop(),
                  ),
                  Expanded(
                    child: Text(
                      'Event submissions',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => context.push('/admin/reports'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.onPrimary,
                ),
                child: const Text('Open user reports (staff)'),
              ),
              const SizedBox(height: 20),
              const Text(
                'Member-submitted events are reviewed in Digital Curriculum, not in this app.',
                style: TextStyle(fontSize: 15, height: 1.45, color: AppColors.foreground),
              ),
              const SizedBox(height: 12),
              const Text(
                'On your Profile tab, under “Events you submitted,” you can see whether each submission is under review, live on the feed, or not published.',
                style: TextStyle(fontSize: 14, height: 1.45, color: AppColors.mutedForeground),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
