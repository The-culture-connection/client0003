import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/mock_data.dart';
import '../theme/app_theme.dart';
import '../widgets/network_circle_avatar.dart';

/// Port of [UI Basis/src/app/pages/GroupDetail.tsx]
class GroupDetailScreen extends StatefulWidget {
  const GroupDetailScreen({required this.groupId, super.key});

  final String groupId;

  @override
  State<GroupDetailScreen> createState() => _GroupDetailScreenState();
}

class _GroupDetailScreenState extends State<GroupDetailScreen> {
  bool _joined = false;

  @override
  Widget build(BuildContext context) {
    final groupMatches = mockGroups.where((g) => g.id == widget.groupId).toList();
    final group = groupMatches.isEmpty ? null : groupMatches.first;
    if (group == null) {
      return const Scaffold(body: Center(child: Text('Group not found')));
    }

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            backgroundColor: AppColors.background,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => context.pop(),
            ),
            title: const Text('Group'),
          ),
          SliverToBoxAdapter(
            child: Stack(
              children: [
                SizedBox(
                  height: 192,
                  width: double.infinity,
                  child: CachedNetworkImage(
                    imageUrl: group.image,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: AppColors.secondary),
                    errorWidget: (_, __, ___) => Container(color: AppColors.secondary),
                  ),
                ),
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [Colors.black.withValues(alpha: 0.6), Colors.transparent],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(24, -32, 24, 24),
            sliver: SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                  boxShadow: const [BoxShadow(color: Colors.black54, blurRadius: 12)],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(group.name, style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 8),
                    Text(group.description, style: const TextStyle(color: AppColors.mutedForeground, height: 1.4)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(Icons.people_outline, size: 16, color: AppColors.mutedForeground),
                        const SizedBox(width: 8),
                        Text('${group.members} members', style: const TextStyle(color: AppColors.mutedForeground)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: FilledButton(
                            onPressed: () => setState(() => _joined = !_joined),
                            style: FilledButton.styleFrom(
                              backgroundColor: _joined ? AppColors.secondary : AppColors.primary,
                              foregroundColor: AppColors.foreground,
                            ),
                            child: Text(_joined ? 'Joined ✓' : 'Join Group'),
                          ),
                        ),
                        if (_joined) ...[
                          const SizedBox(width: 8),
                          OutlinedButton(
                            onPressed: () {},
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.foreground,
                              side: const BorderSide(color: AppColors.border),
                            ),
                            child: const Icon(Icons.notifications_outlined),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 24),
              child: Text('Members', style: TextStyle(fontWeight: FontWeight.w500, fontSize: 16)),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  for (var i = 0; i < 8; i++)
                    Align(
                      widthFactor: 0.7,
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppColors.secondary,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.background, width: 2),
                        ),
                      ),
                    ),
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: AppColors.primary,
                    child: Text(
                      '+${group.members - 8}',
                      style: const TextStyle(fontSize: 10, color: AppColors.onPrimary),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 24),
              child: Text('Recent Posts', style: TextStyle(fontWeight: FontWeight.w500, fontSize: 16)),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final p = mockPosts[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _PostCard(post: p),
                  );
                },
                childCount: mockPosts.length,
              ),
            ),
          ),
        ],
      ),
    ),
    );
  }
}

class _PostCard extends StatelessWidget {
  const _PostCard({required this.post});

  final MockPost post;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              NetworkCircleAvatar(imageUrl: post.author.avatar, radius: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(post.author.name, style: const TextStyle(fontWeight: FontWeight.w500)),
                    Text(post.author.title, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                    Text(post.timestamp, style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                  ],
                ),
              ),
              IconButton(
                onPressed: () {},
                icon: const Icon(Icons.more_vert, color: AppColors.mutedForeground),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(post.content),
          if (post.image != null) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: CachedNetworkImage(
                imageUrl: post.image!,
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
          ],
          const Divider(height: 24),
          Row(
            children: [
              IconButton(onPressed: () {}, icon: const Icon(Icons.favorite_border, color: AppColors.mutedForeground)),
              Text('${post.likes}', style: const TextStyle(color: AppColors.mutedForeground)),
              const SizedBox(width: 16),
              IconButton(onPressed: () {}, icon: const Icon(Icons.chat_bubble_outline, color: AppColors.mutedForeground)),
              Text('${post.comments}', style: const TextStyle(color: AppColors.mutedForeground)),
              const Spacer(),
              IconButton(onPressed: () {}, icon: const Icon(Icons.share_outlined, color: AppColors.mutedForeground)),
            ],
          ),
        ],
      ),
    );
  }
}
