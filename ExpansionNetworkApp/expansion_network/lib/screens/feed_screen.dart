import 'package:cached_network_image/cached_network_image.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/community_event.dart';
import '../models/feed_post.dart';
import '../services/events_repository.dart';
import '../services/feed_posts_repository.dart';
import '../theme/app_theme.dart';
import '../utils/relative_time.dart';
import '../router/feed_post_navigation.dart';
import '../widgets/page_header.dart';
import '../widgets/user_profile_modal.dart';

enum _FeedTab { all, events, feed }

/// Community feed: [events] collection + [feed_posts] with likes/replies.
class FeedScreen extends StatefulWidget {
  const FeedScreen({super.key});

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  _FeedTab _tab = _FeedTab.all;
  final _eventsRepo = EventsRepository();
  final _postsRepo = FeedPostsRepository();

  void _onFabPressed(BuildContext context) {
    switch (_tab) {
      case _FeedTab.feed:
        context.push('/feed/post/create');
        break;
      case _FeedTab.events:
        context.push('/events/create');
        break;
      case _FeedTab.all:
        showModalBottomSheet<void>(
          context: context,
          showDragHandle: true,
          builder: (ctx) => SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: const Icon(Icons.post_add_outlined, color: AppColors.primary),
                  title: const Text('New post'),
                  subtitle: const Text('Category, title, and details'),
                  onTap: () {
                    Navigator.pop(ctx);
                    context.push('/feed/post/create');
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.event_outlined, color: AppColors.primary),
                  title: const Text('New event'),
                  onTap: () {
                    Navigator.pop(ctx);
                    context.push('/events/create');
                  },
                ),
              ],
            ),
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;

    return Scaffold(
      floatingActionButton: (_tab == _FeedTab.all || _tab == _FeedTab.events || _tab == _FeedTab.feed)
          ? Padding(
              padding: const EdgeInsets.only(bottom: 72),
              child: FloatingActionButton(
                onPressed: () => _onFabPressed(context),
                child: Icon(_tab == _FeedTab.feed ? Icons.post_add : Icons.add),
              ),
            )
          : null,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: PageHeader(
              title: 'Feed',
              subtitle: 'Stay connected with the community',
              bottom: _TabBar(
                tab: _tab,
                onChanged: (t) => setState(() => _tab = t),
              ),
            ),
          ),
          if (_tab == _FeedTab.all)
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
              sliver: SliverToBoxAdapter(
                child: StreamBuilder<List<CommunityEvent>>(
                  stream: _eventsRepo.watchEvents(),
                  builder: (context, evSnap) {
                    return StreamBuilder<List<FeedPost>>(
                      stream: _postsRepo.watchPosts(),
                      builder: (context, postSnap) {
                        if (evSnap.hasError || postSnap.hasError) {
                          return Padding(
                            padding: const EdgeInsets.all(24),
                            child: Text(
                              'Could not load feed.\n${evSnap.error ?? postSnap.error}',
                              style: const TextStyle(color: AppColors.mutedForeground),
                            ),
                          );
                        }
                        if (!evSnap.hasData || !postSnap.hasData) {
                          return const Padding(
                            padding: EdgeInsets.all(48),
                            child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                          );
                        }
                        final events = evSnap.data!;
                        final posts = postSnap.data!;
                        final registeredCount =
                            uid == null ? 0 : events.where((e) => e.isRegistered(uid)).length;
                        return _AllTabGrid(
                          posts: posts,
                          events: events,
                          registeredCount: registeredCount,
                          uid: uid,
                          onOpenEvent: (id) => context.push('/events/$id'),
                          onOpenPost: (id) => pushFeedPostDetail(context, id),
                          onSeeEvents: () => setState(() => _tab = _FeedTab.events),
                          onSeePosts: () => setState(() => _tab = _FeedTab.feed),
                        );
                      },
                    );
                  },
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
              sliver: SliverToBoxAdapter(
                child: StreamBuilder<List<CommunityEvent>>(
                  stream: _eventsRepo.watchEvents(),
                  builder: (context, evSnap) {
                    return StreamBuilder<List<FeedPost>>(
                      stream: _postsRepo.watchPosts(),
                      builder: (context, postSnap) {
                        if (evSnap.hasError || postSnap.hasError) {
                          return Padding(
                            padding: const EdgeInsets.all(24),
                            child: Text(
                              '${evSnap.error ?? postSnap.error}',
                              style: const TextStyle(color: AppColors.mutedForeground),
                            ),
                          );
                        }
                        if (!evSnap.hasData || !postSnap.hasData) {
                          return const Padding(
                            padding: EdgeInsets.all(48),
                            child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                          );
                        }
                        final events = evSnap.data!;
                        final posts = postSnap.data!;
                        final items = _tab == _FeedTab.events ? events : posts;
                        if (items.isEmpty) {
                          return Padding(
                            padding: const EdgeInsets.all(32),
                            child: Text(
                              _tab == _FeedTab.events ? 'No upcoming events yet.' : 'No posts yet.',
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: AppColors.mutedForeground),
                            ),
                          );
                        }
                        if (_tab == _FeedTab.events) {
                          return Column(
                            children: [
                              for (final e in events)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 16),
                                  child: _EventListTile(
                                    event: e,
                                    uid: uid,
                                    onTap: () => context.push('/events/${e.id}'),
                                  ),
                                ),
                            ],
                          );
                        }
                        return Column(
                          children: [
                            for (final p in posts)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 16),
                                child: _PostListTile(
                                  post: p,
                                  onTap: () => pushFeedPostDetail(context, p.id),
                                ),
                              ),
                          ],
                        );
                      },
                    );
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _TabBar extends StatelessWidget {
  const _TabBar({required this.tab, required this.onChanged});

  final _FeedTab tab;
  final ValueChanged<_FeedTab> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _TabChip(label: 'All', selected: tab == _FeedTab.all, onTap: () => onChanged(_FeedTab.all)),
        const SizedBox(width: 8),
        _TabChip(label: 'Events', selected: tab == _FeedTab.events, onTap: () => onChanged(_FeedTab.events)),
        const SizedBox(width: 8),
        _TabChip(label: 'Posts', selected: tab == _FeedTab.feed, onTap: () => onChanged(_FeedTab.feed)),
      ],
    );
  }
}

class _TabChip extends StatelessWidget {
  const _TabChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      style: FilledButton.styleFrom(
        backgroundColor: selected ? AppColors.primary : AppColors.secondary,
        foregroundColor: selected ? AppColors.onPrimary : AppColors.mutedForeground,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      onPressed: onTap,
      child: Text(label),
    );
  }
}

class _AllTabGrid extends StatelessWidget {
  const _AllTabGrid({
    required this.posts,
    required this.events,
    required this.registeredCount,
    required this.uid,
    required this.onOpenEvent,
    required this.onOpenPost,
    required this.onSeeEvents,
    required this.onSeePosts,
  });

  final List<FeedPost> posts;
  final List<CommunityEvent> events;
  final int registeredCount;
  final String? uid;
  final void Function(String eventId) onOpenEvent;
  final void Function(String postId) onOpenPost;
  final VoidCallback onSeeEvents;
  final VoidCallback onSeePosts;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _EventsColumn(
                  events: events.take(4).toList(),
                  uid: uid,
                  onOpenEvent: onOpenEvent,
                  onSeeAll: onSeeEvents,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _PostsColumn(
                  posts: posts.take(4).toList(),
                  onOpenPost: onOpenPost,
                  onSeeAll: onSeePosts,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: LinearGradient(
              colors: [AppColors.primary, AppColors.primary.withValues(alpha: 0.85)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: _StatCell(value: '${events.length}', label: 'Events', color: AppColors.onPrimary),
              ),
              Expanded(
                child: _StatCell(value: '${posts.length}', label: 'Posts', color: AppColors.onPrimary),
              ),
              Expanded(
                child: _StatCell(value: '$registeredCount', label: 'Registered', color: AppColors.onPrimary),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _StatCell extends StatelessWidget {
  const _StatCell({required this.value, required this.label, required this.color});

  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: color,
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: color.withValues(alpha: 0.9),
              ),
        ),
      ],
    );
  }
}

class _EventsColumn extends StatelessWidget {
  const _EventsColumn({
    required this.events,
    required this.uid,
    required this.onOpenEvent,
    required this.onSeeAll,
  });

  final List<CommunityEvent> events;
  final String? uid;
  final void Function(String eventId) onOpenEvent;
  final VoidCallback onSeeAll;

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
              const Expanded(
                child: Text('Upcoming Events', style: TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
              ),
              IconButton(
                icon: const Icon(Icons.arrow_forward, size: 18, color: AppColors.primary),
                onPressed: onSeeAll,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (events.isEmpty)
            const Text(
              'No events yet.',
              style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
            )
          else
            for (final e in events) ...[
              InkWell(
                onTap: () => onOpenEvent(e.id),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(8),
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.calendar_today, size: 12, color: AppColors.primary),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              e.title,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        '${formatEventDate(e.date)} · ${e.time}',
                        style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                      ),
                      Row(
                        children: [
                          const Icon(Icons.place_outlined, size: 12, color: AppColors.mutedForeground),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              e.location,
                              style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      if (uid != null && e.isRegistered(uid!))
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text('Registered', style: TextStyle(fontSize: 10, color: AppColors.onPrimary)),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
        ],
      ),
    );
  }
}

class _PostsColumn extends StatelessWidget {
  const _PostsColumn({
    required this.posts,
    required this.onOpenPost,
    required this.onSeeAll,
  });

  final List<FeedPost> posts;
  final void Function(String postId) onOpenPost;
  final VoidCallback onSeeAll;

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
              const Expanded(
                child: Text('Recent Posts', style: TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
              ),
              IconButton(
                icon: const Icon(Icons.arrow_forward, size: 18, color: AppColors.primary),
                onPressed: onSeeAll,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (posts.isEmpty)
            const Text(
              'No posts yet.',
              style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
            )
          else
            for (final p in posts) ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    InkWell(
                      onTap: () => onOpenPost(p.id),
                      borderRadius: BorderRadius.circular(8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            p.postCategory,
                            style: const TextStyle(fontSize: 10, color: AppColors.primary, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            p.postTitle,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    GestureDetector(
                      onTap: p.authorId.isEmpty ? null : () => showUserProfileModal(context, userId: p.authorId),
                      behavior: HitTestBehavior.opaque,
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 12,
                            backgroundColor: AppColors.primary,
                            child: Text(
                              _initials(p.authorName),
                              style: const TextStyle(fontSize: 9, color: AppColors.onPrimary, fontWeight: FontWeight.w600),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  p.authorName,
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.primary),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  formatRelativeTime(p.createdAt),
                                  style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 6),
                    InkWell(
                      onTap: () => onOpenPost(p.id),
                      borderRadius: BorderRadius.circular(8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            p.postDetails,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                          ),
                          const SizedBox(height: 6),
                          _PostMetaRow(postId: p.id),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
        ],
      ),
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }
}

class _PostMetaRow extends StatelessWidget {
  const _PostMetaRow({required this.postId});

  final String postId;

  @override
  Widget build(BuildContext context) {
    final repo = FeedPostsRepository();
    return Row(
      children: [
        StreamBuilder<int>(
          stream: repo.watchPostLikeCount(postId),
          builder: (context, snap) {
            final n = snap.data ?? 0;
            return Row(
              children: [
                const Icon(Icons.favorite_border, size: 12, color: AppColors.mutedForeground),
                Text(' $n', style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
              ],
            );
          },
        ),
        const SizedBox(width: 12),
        StreamBuilder<int>(
          stream: repo.watchReplyCount(postId),
          builder: (context, snap) {
            final n = snap.data ?? 0;
            return Row(
              children: [
                const Icon(Icons.chat_bubble_outline, size: 12, color: AppColors.mutedForeground),
                Text(' $n', style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _PostListTile extends StatelessWidget {
  const _PostListTile({required this.post, required this.onTap});

  final FeedPost post;
  final VoidCallback onTap;

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
              GestureDetector(
                onTap: post.authorId.isEmpty ? null : () => showUserProfileModal(context, userId: post.authorId),
                child: CircleAvatar(
                  backgroundColor: AppColors.primary,
                  child: Text(
                    _initials(post.authorName),
                    style: const TextStyle(color: AppColors.onPrimary, fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    InkWell(
                      onTap: onTap,
                      borderRadius: BorderRadius.circular(8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.secondary,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Text(
                              post.postCategory,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            post.postTitle,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    GestureDetector(
                      onTap: post.authorId.isEmpty ? null : () => showUserProfileModal(context, userId: post.authorId),
                      behavior: HitTestBehavior.opaque,
                      child: Text(
                        '${post.authorName} · ${formatRelativeTime(post.createdAt)}',
                        style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  post.postDetails,
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 14, height: 1.35),
                ),
                const Divider(height: 24),
                _PostMetaRow(postId: post.id),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }
}

class _EventListTile extends StatelessWidget {
  const _EventListTile({required this.event, required this.uid, required this.onTap});

  final CommunityEvent event;
  final String? uid;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final registered = uid != null && event.isRegistered(uid!);
    return InkWell(
      onTap: onTap,
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
            if (event.imageUrl != null && event.imageUrl!.isNotEmpty)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: CachedNetworkImage(
                    imageUrl: event.imageUrl!,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: AppColors.secondary),
                    errorWidget: (_, __, ___) => const SizedBox.shrink(),
                  ),
                ),
              ),
            if (event.imageUrl != null && event.imageUrl!.isNotEmpty) const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: Text(event.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16))),
                if (registered)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('Registered', style: TextStyle(fontSize: 11, color: AppColors.onPrimary)),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            _iconRow(Icons.calendar_today, formatEventDate(event.date)),
            _iconRow(Icons.schedule, event.time),
            _iconRow(Icons.place_outlined, event.location),
            _iconRow(Icons.category_outlined, event.eventType),
            _iconRow(Icons.people_outline, '${event.registeredCount} registered'),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onTap,
                child: const Text('View details'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _iconRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.mutedForeground),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground))),
        ],
      ),
    );
  }
}
