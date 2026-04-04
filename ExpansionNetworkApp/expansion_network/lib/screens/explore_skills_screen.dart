import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/explore_skill_listing.dart';
import '../services/explore_listings_repository.dart';
import '../theme/app_theme.dart';
import '../utils/relative_time.dart';
import '../widgets/page_header.dart';
import '../widgets/poster_profile_avatar.dart';
import '../widgets/user_profile_modal.dart';

/// Skills-only list (sub-page of Explore).
class ExploreSkillsScreen extends StatelessWidget {
  const ExploreSkillsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final repo = ExploreListingsRepository();

    return Scaffold(
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 24),
        child: FloatingActionButton.extended(
          onPressed: () => context.push('/explore/skills/create'),
          icon: const Icon(Icons.add),
          label: const Text('Offer skill'),
        ),
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: PageHeader(
              title: 'Skills',
              subtitle: 'What members are offering',
              trailing: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => context.pop(),
              ),
            ),
          ),
          StreamBuilder<List<ExploreSkillListing>>(
            stream: repo.watchSkillListings(),
            builder: (context, snap) {
              if (snap.hasError) {
                return SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text('${snap.error}', style: const TextStyle(color: AppColors.mutedForeground)),
                  ),
                );
              }
              final list = snap.data ?? [];
              if (list.isEmpty && snap.connectionState == ConnectionState.waiting) {
                return const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                );
              }
              if (list.isEmpty) {
                return const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: Text(
                      'No skill listings yet.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.mutedForeground),
                    ),
                  ),
                );
              }
              return SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, i) {
                      final s = list[i];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _SkillCard(listing: s),
                      );
                    },
                    childCount: list.length,
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _SkillCard extends StatelessWidget {
  const _SkillCard({required this.listing});

  final ExploreSkillListing listing;

  @override
  Widget build(BuildContext context) {
    return Container(
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
              PosterProfileAvatar(userId: listing.authorId, displayNameHint: listing.authorName, radius: 22),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.psychology_outlined, color: AppColors.primary, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(listing.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                    const SizedBox(height: 4),
                    Text(
                      [
                        if (listing.industry != null && listing.industry!.isNotEmpty) listing.industry!,
                        if (listing.location != null && listing.location!.isNotEmpty) listing.location!,
                      ].join(' · '),
                      style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                    ),
                    if (listing.summary != null && listing.summary!.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        listing.summary!,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        if (listing.authorName != null)
                          GestureDetector(
                            onTap: listing.authorId.isEmpty
                                ? null
                                : () => showUserProfileModal(context, userId: listing.authorId),
                            child: Text(
                              listing.authorName!,
                              style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w500),
                            ),
                          ),
                        if (listing.createdAt != null) ...[
                          const Text(' · ', style: TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                          Text(
                            formatRelativeTime(listing.createdAt!),
                            style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: listing.authorId.isEmpty
                    ? null
                    : () => context.push(
                          '/messages/direct/${listing.authorId}?attach=skill&id=${listing.id}',
                        ),
                icon: const Icon(Icons.chat_bubble_outline, size: 18),
                label: const Text('Message'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
