import 'package:cached_network_image/cached_network_image.dart';
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
import '../utils/safe_launch_url.dart';
import '../widgets/feed_post_card.dart';
import '../models/mortar_info_post.dart';
import '../services/mortar_info_repository.dart';
import '../widgets/mortar_info_feed_tile.dart' show mortarInfoRelativeTime;

/// Square storefront for Mortar merch (opens in browser / in-app web view).
const _kMortarShopUrl = 'https://brick-walnut-hills.square.site/s/shop';

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
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.onPrimary,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    icon: const Icon(Icons.storefront_outlined),
                    label: const Text('Mortar shop'),
                    onPressed: () async {
                      final u = Uri.parse(_kMortarShopUrl);
                      await safeLaunchExternalUrl(
                        u,
                        messengerContext: context,
                        userFailureMessage: 'Could not open Mortar shop',
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  const _MortarInfoHomeCard(),
                  const SizedBox(height: 12),
                  const _HomeLatestJobSkillRow(),
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

class _MortarInfoHomeCard extends StatelessWidget {
  const _MortarInfoHomeCard();

  @override
  Widget build(BuildContext context) {
    final repo = MortarInfoRepository();
    final scheme = Theme.of(context).colorScheme;
    return _CardShell(
      title: 'Mortar info',
      child: StreamBuilder<List<MortarInfoPost>>(
        stream: repo.watchPublishedPosts(limit: 1),
        builder: (context, snap) {
          if (snap.hasError) {
            return Text(
              'Could not load updates.\n${_shortError(snap.error)}',
              style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
            );
          }
          if (snap.connectionState == ConnectionState.waiting && !snap.hasData) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Center(
                child: SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                ),
              ),
            );
          }
          final posts = snap.data ?? [];
          if (posts.isEmpty) {
            return InkWell(
              onTap: () => context.push('/mortar-feed'),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: scheme.outline.withValues(alpha: 0.35)),
                  color: AppColors.secondary,
                ),
                child: Row(
                  children: [
                    Icon(Icons.auto_awesome, size: 28, color: AppColors.primary.withValues(alpha: 0.9)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Your Mortar HQ',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                              color: scheme.onSurface,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'News, newsletters, and media from the team will land here. Tap when updates arrive.',
                            style: TextStyle(
                              fontSize: 12,
                              height: 1.35,
                              color: scheme.onSurface.withValues(alpha: 0.65),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          final latest = posts.first;
          final headline = latest.title.trim().isNotEmpty ? latest.title.trim() : _bodyPreview(latest.body, 72);
          final dek = latest.title.trim().isNotEmpty ? _bodyPreview(latest.body, 120) : _bodyPreview(latest.body, 140);
          final isNew = _mortarPostIsNew(latest.createdAt);
          final thumb = _firstImageUrl(latest);

          return Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => context.push('/mortar-feed'),
              borderRadius: BorderRadius.circular(12),
              child: Ink(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  gradient: LinearGradient(
                    colors: [
                      AppColors.primary.withValues(alpha: 0.22),
                      AppColors.secondary,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.45)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _MortarInfoThumb(url: thumb, hasVideo: latest.media.any((m) => m.isVideo)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                if (isNew)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary,
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: const Text(
                                      'NEW',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.6,
                                        color: AppColors.onPrimary,
                                      ),
                                    ),
                                  ),
                                if (isNew) const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    mortarInfoRelativeTime(latest.createdAt),
                                    textAlign: TextAlign.end,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: scheme.onSurface.withValues(alpha: 0.55),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              headline,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                                height: 1.25,
                                color: scheme.onSurface,
                              ),
                            ),
                            if (dek.trim().isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(
                                dek,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 12,
                                  height: 1.35,
                                  color: scheme.onSurface.withValues(alpha: 0.72),
                                ),
                              ),
                            ],
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 6,
                              children: [
                                if (latest.hasNewsletterLink)
                                  _MortarMetaChip(
                                    icon: Icons.link,
                                    label: 'Newsletter',
                                    scheme: scheme,
                                  ),
                                if (latest.media.isNotEmpty)
                                  _MortarMetaChip(
                                    icon: Icons.perm_media_outlined,
                                    label: latest.media.length == 1
                                        ? (latest.media.first.isVideo ? 'Video' : 'Photo')
                                        : '${latest.media.length} media',
                                    scheme: scheme,
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

bool _mortarPostIsNew(DateTime? createdAt) {
  if (createdAt == null) return false;
  return DateTime.now().difference(createdAt) < const Duration(hours: 48);
}

String? _firstImageUrl(MortarInfoPost p) {
  for (final m in p.media) {
    if (!m.isVideo) return m.url;
  }
  return null;
}

class _MortarMetaChip extends StatelessWidget {
  const _MortarMetaChip({
    required this.icon,
    required this.label,
    required this.scheme,
  });

  final IconData icon;
  final String label;
  final ColorScheme scheme;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: scheme.surface.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: scheme.outline.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: AppColors.primary),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: scheme.onSurface.withValues(alpha: 0.85),
            ),
          ),
        ],
      ),
    );
  }
}

class _MortarInfoThumb extends StatelessWidget {
  const _MortarInfoThumb({required this.url, required this.hasVideo});

  final String? url;
  final bool hasVideo;

  @override
  Widget build(BuildContext context) {
    const size = 88.0;
    final borderRadius = BorderRadius.circular(10);
    if (url != null && url!.isNotEmpty) {
      return ClipRRect(
        borderRadius: borderRadius,
        child: SizedBox(
          width: size,
          height: size,
          child: Stack(
            fit: StackFit.expand,
            children: [
              CachedNetworkImage(
                imageUrl: url!,
                fit: BoxFit.cover,
                placeholder: (_, __) => const ColoredBox(
                  color: AppColors.secondary,
                  child: Center(
                    child: SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                    ),
                  ),
                ),
                errorWidget: (_, __, ___) => const _MortarThumbPlaceholder(),
              ),
              if (hasVideo)
                Align(
                  alignment: Alignment.center,
                  child: Icon(
                    Icons.play_circle_fill,
                    size: 36,
                    color: Colors.white.withValues(alpha: 0.92),
                  ),
                ),
            ],
          ),
        ),
      );
    }
    return const SizedBox(
      width: size,
      height: size,
      child: _MortarThumbPlaceholder(),
    );
  }
}

class _MortarThumbPlaceholder extends StatelessWidget {
  const _MortarThumbPlaceholder();

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppColors.primary.withValues(alpha: 0.35),
              AppColors.secondary,
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: const Center(
          child: Icon(Icons.campaign_outlined, size: 36, color: AppColors.onPrimary),
        ),
      ),
    );
  }
}

class _HomeLatestJobSkillRow extends StatelessWidget {
  const _HomeLatestJobSkillRow();

  @override
  Widget build(BuildContext context) {
    final exploreRepo = ExploreListingsRepository();
    return _CardShell(
      title: 'Latest',
      actionLabel: 'Explore',
      onAction: () => context.go('/explore'),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
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
            Expanded(
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
  });

  final String title;
  final Widget child;
  final VoidCallback? onAction;
  final String? actionLabel;

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
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}
