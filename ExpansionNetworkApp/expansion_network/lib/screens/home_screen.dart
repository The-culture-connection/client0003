import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/explore_job.dart';
import '../models/explore_skill_listing.dart';
import '../models/group_thread_firestore.dart';
import '../models/feed_post.dart';
import '../services/explore_listings_repository.dart';
import '../services/feed_posts_repository.dart';
import '../services/group_thread_repository.dart';
import '../theme/app_theme.dart';
import '../utils/content_action_guard.dart';
import '../widgets/feed_post_card.dart';
import '../models/mortar_info_post.dart';
import '../services/mortar_info_repository.dart';

/// Port of [UI Basis/src/app/pages/Home.tsx] — group activity from `groups_mobile`, no feed posts.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          if (await blockContentActionIfSuspended(context)) return;
          if (context.mounted) context.push('/feed/post/create');
        },
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.onPrimary,
        child: const Icon(Icons.add),
      ),
      body: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    height: 160,
                    child: _WelcomeCard(
                      onMatching: () => context.push('/matching'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const _HomeLatestMortarJobSkillRow(),
                  const SizedBox(height: 12),
                  const _RecentActivityCard(),
                  const SizedBox(height: 12),
                  const _MyCommunitiesMessagesCard(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MyCommunitiesMessagesCard extends StatelessWidget {
  const _MyCommunitiesMessagesCard();

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    final repo = GroupThreadRepository();

    return StreamBuilder<List<FsGroup>>(
      stream: repo.watchGroups(),
      builder: (context, snap) {
        if (snap.hasError) {
          return _CardShell(
            title: 'Your communities',
            child: Text(
              'Could not load groups.\n${snap.error}',
              style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
            ),
          );
        }
        final all = snap.data ?? [];
        if (uid == null) {
          return const _CardShell(
            title: 'Your communities',
            child: Text(
              'Sign in to see communities you belong to.',
              style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
            ),
          );
        }
        final mine = all.where((g) => g.isMember(uid)).toList();
        mine.sort((a, b) {
          final ta = a.lastActivityAt;
          final tb = b.lastActivityAt;
          if (ta != null && tb != null) return tb.compareTo(ta);
          if (ta != null) return -1;
          if (tb != null) return 1;
          return b.memberCount.compareTo(a.memberCount);
        });
        final preview = mine.take(6).toList();

        return _CardShell(
          title: 'Your communities',
          actionLabel: 'Groups',
          onAction: () => context.go('/groups'),
          child: mine.isEmpty
              ? const Text(
                  'Join a community on the Groups tab to see updates here.',
                  style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                )
              : Column(
                  children: [
                    for (final g in preview)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: InkWell(
                          onTap: () => context.push('/groups/${g.id}'),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppColors.background,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.forum_outlined, size: 14, color: AppColors.primary),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        g.name,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 13,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  (g.lastActivitySnippet != null && g.lastActivitySnippet!.isNotEmpty)
                                      ? g.lastActivitySnippet!
                                      : '${g.threadCount ?? 0} threads · ${g.memberCount} members',
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
        );
      },
    );
  }
}

class _RecentActivityCard extends StatelessWidget {
  const _RecentActivityCard();

  @override
  Widget build(BuildContext context) {
    final repo = FeedPostsRepository();

    return StreamBuilder<List<FeedPost>>(
      stream: repo.watchPosts(limit: 2),
      builder: (context, snap) {
        if (snap.hasError) {
          return _CardShell(
            title: 'Recent Activity',
            actionLabel: 'View All',
            onAction: () => context.push('/posts'),
            child: Text(
              'Could not load posts.\n${snap.error}',
              style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
            ),
          );
        }
        if (!snap.hasData) {
          return _CardShell(
            title: 'Recent Activity',
            actionLabel: 'View All',
            onAction: () => context.push('/posts'),
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Center(
                child: SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                ),
              ),
            ),
          );
        }
        final posts = snap.data!;
        return _CardShell(
          title: 'Recent Activity',
          actionLabel: 'View All',
          onAction: () => context.push('/posts'),
          child: posts.isEmpty
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'No posts yet. Tap + to share an update with a photo or note.',
                      style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () async {
                        if (await blockContentActionIfSuspended(context)) return;
                        if (context.mounted) context.push('/feed/post/create');
                      },
                      child: const Text('Create post'),
                    ),
                  ],
                )
              : Column(
                  children: [
                    for (var i = 0; i < posts.length; i++) ...[
                      if (i > 0) const Divider(height: 1, color: AppColors.border),
                      FeedPostCard(
                        post: posts[i],
                        compact: true,
                        showImage: false,
                        onOpenPost: () => context.push('/feed/post/${posts[i].id}'),
                      ),
                    ],
                  ],
                ),
        );
      },
    );
  }
}

class _HomeLatestMortarJobSkillRow extends StatelessWidget {
  const _HomeLatestMortarJobSkillRow();

  @override
  Widget build(BuildContext context) {
    final exploreRepo = ExploreListingsRepository();
    final mortarRepo = MortarInfoRepository();
    final cardWidth = () {
      final w = MediaQuery.sizeOf(context).width - 32;
      return w * 0.78;
    }();
    return _CardShell(
      title: 'Latest',
      actionLabel: 'Explore',
      onAction: () => context.go('/explore'),
      secondaryActionLabel: 'Events',
      onSecondaryAction: () => context.push('/events'),
      child: SizedBox(
        height: 168,
        child: ListView(
          scrollDirection: Axis.horizontal,
          clipBehavior: Clip.none,
          children: [
            SizedBox(
              width: cardWidth,
              child: StreamBuilder<List<MortarInfoPost>>(
                stream: mortarRepo.watchPublishedPosts(limit: 5),
                builder: (context, snap) {
                  if (snap.hasError) {
                    return _LatestListingPane(
                      icon: Icons.campaign_outlined,
                      label: 'Mortar',
                      primary: 'Couldn’t load',
                      secondary: _shortError(snap.error),
                      busy: false,
                      onTap: () {},
                    );
                  }
                  final list = snap.data ?? [];
                  final p = list.isNotEmpty ? list.first : null;
                  final primary = p == null
                      ? 'No updates yet'
                      : (p.title.trim().isNotEmpty ? p.title.trim() : _bodyPreview(p.body, 72));
                  final secondary = p == null
                      ? 'Official news will appear here.'
                      : _mortarPostSecondary(p);
                  return _LatestListingPane(
                    icon: Icons.campaign_outlined,
                    label: 'Mortar',
                    primary: primary,
                    secondary: secondary,
                    busy: snap.connectionState == ConnectionState.waiting && !snap.hasData,
                    onTap: p != null ? () => context.push('/mortar-info/${p.id}') : () {},
                  );
                },
              ),
            ),
            const SizedBox(width: 12),
            SizedBox(
              width: cardWidth,
              child: StreamBuilder<List<ExploreJob>>(
                stream: exploreRepo.watchJobs(),
                builder: (context, snap) {
                  if (snap.hasError) {
                    return _LatestListingPane(
                      icon: Icons.work_outline,
                      label: 'Job',
                      primary: 'Couldn’t load',
                      secondary: '${snap.error}',
                      busy: false,
                      onTap: () => context.go('/explore?filter=jobs'),
                    );
                  }
                  final list = snap.data ?? [];
                  final j = list.isNotEmpty ? list.first : null;
                  final sub = j == null
                      ? 'Open Explore to post a job.'
                      : [
                          if (j.skillsSeeking.isNotEmpty) j.skillsSeeking.join(' · '),
                          if (j.industry != null && j.industry!.isNotEmpty) j.industry!,
                          if (j.location != null && j.location!.isNotEmpty) j.location!,
                        ].join(' · ');
                  return _LatestListingPane(
                    icon: Icons.work_outline,
                    label: 'Job',
                    primary: j?.title ?? 'No jobs yet',
                    secondary: sub,
                    busy: snap.connectionState == ConnectionState.waiting && !snap.hasData,
                    onTap: () => context.go('/explore?filter=jobs'),
                  );
                },
              ),
            ),
            const SizedBox(width: 12),
            SizedBox(
              width: cardWidth,
              child: StreamBuilder<List<ExploreSkillListing>>(
                stream: exploreRepo.watchSkillListings(),
                builder: (context, snap) {
                  if (snap.hasError) {
                    return _LatestListingPane(
                      icon: Icons.psychology_outlined,
                      label: 'Skill',
                      primary: 'Couldn’t load',
                      secondary: '${snap.error}',
                      busy: false,
                      onTap: () => context.go('/explore?filter=skills'),
                    );
                  }
                  final list = snap.data ?? [];
                  final s = list.isNotEmpty ? list.first : null;
                  final sub = s == null
                      ? 'Open Explore to offer a skill.'
                      : [
                          if (s.skillsOffering.isNotEmpty) s.skillsOffering.join(' · '),
                          if (s.industry != null && s.industry!.isNotEmpty) s.industry!,
                          if (s.location != null && s.location!.isNotEmpty) s.location!,
                        ].join(' · ');
                  return _LatestListingPane(
                    icon: Icons.psychology_outlined,
                    label: 'Skill',
                    primary: s?.title ?? 'No skills yet',
                    secondary: sub,
                    busy: snap.connectionState == ConnectionState.waiting && !snap.hasData,
                    onTap: () => context.go('/explore?filter=skills'),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _shortError(Object? e) {
  final s = e?.toString() ?? '';
  if (s.length <= 120) return s;
  return '${s.substring(0, 117)}…';
}

String _bodyPreview(String body, int maxChars) {
  final t = body.trim();
  if (t.isEmpty) return 'Tap to read';
  if (t.length <= maxChars) return t;
  return '${t.substring(0, maxChars).trim()}…';
}

String _mortarPostSecondary(MortarInfoPost p) {
  final parts = <String>[];
  if (p.body.trim().isNotEmpty && p.title.trim().isNotEmpty) {
    parts.add(_bodyPreview(p.body, 80));
  } else if (p.body.trim().isNotEmpty && p.title.trim().isEmpty) {
    parts.add(_bodyPreview(p.body, 100));
  }
  if (p.hasNewsletterLink) parts.add('Newsletter link');
  if (p.media.isNotEmpty) parts.add('${p.media.length} attachment${p.media.length == 1 ? '' : 's'}');
  if (parts.isEmpty) return 'Official Mortar update · tap to read';
  return parts.take(2).join(' · ');
}

class _LatestListingPane extends StatelessWidget {
  const _LatestListingPane({
    required this.icon,
    required this.label,
    required this.primary,
    required this.secondary,
    required this.onTap,
    this.busy = false,
  });

  final IconData icon;
  final String label;
  final String primary;
  final String secondary;
  final VoidCallback onTap;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return busy
        ? const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Center(
              child: SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
              ),
            ),
          )
        : InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(icon, size: 14, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Text(
                        label,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    primary,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (secondary.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      secondary,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 10, color: AppColors.mutedForeground),
                    ),
                  ],
                ],
              ),
            ),
          );
  }
}

class _WelcomeCard extends StatelessWidget {
  const _WelcomeCard({required this.onMatching});

  final VoidCallback onMatching;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: LinearGradient(
          colors: [
            AppColors.primary,
            AppColors.primary.withValues(alpha: 0.85),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welcome Back!',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: AppColors.onPrimary,
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Discover new opportunities',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.onPrimary.withValues(alpha: 0.9),
                          ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.auto_awesome, color: AppColors.onPrimary.withValues(alpha: 0.95), size: 32),
            ],
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white.withValues(alpha: 0.2),
                foregroundColor: AppColors.onPrimary,
              ),
              onPressed: onMatching,
              child: const Text('Run Smart Matching'),
            ),
          ),
        ],
      ),
    );
  }
}

class _CardShell extends StatelessWidget {
  const _CardShell({
    required this.title,
    required this.child,
    this.onAction,
    this.actionLabel,
    this.onSecondaryAction,
    this.secondaryActionLabel,
  });

  final String title;
  final Widget child;
  final VoidCallback? onAction;
  final String? actionLabel;
  final VoidCallback? onSecondaryAction;
  final String? secondaryActionLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                ),
              ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (onSecondaryAction != null && secondaryActionLabel != null)
                      TextButton(
                        onPressed: onSecondaryAction,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              secondaryActionLabel!,
                              style: const TextStyle(fontSize: 12, color: AppColors.primary),
                            ),
                            const SizedBox(width: 2),
                            const Icon(Icons.arrow_forward, size: 14, color: AppColors.primary),
                          ],
                        ),
                      ),
                    if (onAction != null)
                      TextButton(
                        onPressed: onAction,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (actionLabel != null)
                              Text(
                                actionLabel!,
                                style: const TextStyle(fontSize: 12, color: AppColors.primary),
                              ),
                            if (actionLabel == null)
                              const Icon(Icons.arrow_forward, size: 16, color: AppColors.primary),
                            if (actionLabel != null)
                              const Icon(Icons.arrow_forward, size: 14, color: AppColors.primary),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}
