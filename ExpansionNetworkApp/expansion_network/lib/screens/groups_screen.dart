import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';
import '../widgets/page_header.dart';

/// Port of [UI Basis/src/app/pages/Groups.tsx]
class GroupsScreen extends StatelessWidget {
  const GroupsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final groups = [
      _Group(1, 'Tech Entrepreneurs', 156, 45, 'Industry', true),
      _Group(2, 'Class of 2024', 89, 23, 'Cohort', true),
      _Group(3, 'Marketing Professionals', 134, 67, 'Industry', false),
      _Group(4, 'Bay Area Alumni', 78, 34, 'Location', false),
    ];

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          const SliverToBoxAdapter(
            child: PageHeader(
              title: 'Groups',
              subtitle: 'Connect with like-minded members',
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            sliver: SliverToBoxAdapter(
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Search groups...',
                  prefixIcon: const Icon(Icons.search, color: AppColors.mutedForeground),
                  filled: true,
                  fillColor: AppColors.inputBackground,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final g = groups[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: InkWell(
                      onTap: () => context.push('/groups/${g.id}'),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
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
                                      Text(g.name, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 16)),
                                      const SizedBox(height: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: AppColors.primary.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          g.category,
                                          style: const TextStyle(fontSize: 11, color: AppColors.primary),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (g.joined)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text('Joined', style: TextStyle(fontSize: 11, color: AppColors.onPrimary)),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                const Icon(Icons.people_outline, size: 16, color: AppColors.mutedForeground),
                                Text(' ${g.members}', style: const TextStyle(color: AppColors.mutedForeground)),
                                const SizedBox(width: 16),
                                const Icon(Icons.chat_bubble_outline, size: 16, color: AppColors.mutedForeground),
                                Text(' ${g.messages} today', style: const TextStyle(color: AppColors.mutedForeground)),
                              ],
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: g.joined
                                  ? OutlinedButton(onPressed: () => context.push('/groups/${g.id}'), child: const Text('View Group'))
                                  : FilledButton(
                                      onPressed: () {},
                                      style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                                      child: const Text('Join Group'),
                                    ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
                childCount: groups.length,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Group {
  const _Group(this.id, this.name, this.members, this.messages, this.category, this.joined);

  final int id;
  final String name;
  final int members;
  final int messages;
  final String category;
  final bool joined;
}
