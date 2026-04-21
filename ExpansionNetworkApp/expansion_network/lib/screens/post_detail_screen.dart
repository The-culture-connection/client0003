import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../analytics/expansion_analytics.dart';
import '../models/feed_post.dart';
import '../services/feed_posts_repository.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../utils/relative_time.dart';
import '../widgets/poster_profile_avatar.dart';
import '../widgets/user_profile_modal.dart';

class PostDetailScreen extends StatefulWidget {
  const PostDetailScreen({super.key, required this.postId});

  final String postId;

  @override
  State<PostDetailScreen> createState() => _PostDetailScreenState();
}

class _PostDetailScreenState extends State<PostDetailScreen> {
  final _posts = FeedPostsRepository();
  final _users = UserProfileRepository();
  final _replyBody = TextEditingController();
  bool _loading = true;
  bool _replying = false;
  FeedPost? _post;
  String? _error;

  /// Cache for converting `users/{uid}` into a display name.
  /// Used because some older replies may store `author_name` as an email.
  final _authorNameCache = <String, String>{};
  final _resolvingAuthorIds = <String>{};

  /// `null` = reply to the post; otherwise reply to this reply id.
  String? _replyParentId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(
        ExpansionAnalytics.log(
          'post_detail_started',
          entityId: widget.postId,
          sourceScreen: 'post_detail',
        ),
      );
    });
    _load();
  }

  @override
  void didUpdateWidget(covariant PostDetailScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.postId != widget.postId) {
      // Route param changed; make sure we reload the correct post.
      _replyParentId = null;
      _replying = false;
      _post = null;
      _error = null;
      _loading = true;
      _load();
    }
  }

  @override
  void dispose() {
    _replyBody.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _post = null;
      _replyParentId = null;
      _replying = false;
    });
    try {
      final p = await _posts.getPost(widget.postId);
      if (!mounted) return;
      setState(() {
        _post = p;
        _loading = false;
        if (p == null) _error = 'Post not found.';
      });
      if (p == null) {
        unawaited(
          ExpansionAnalytics.log(
            'post_detail_not_found',
            entityId: widget.postId,
            sourceScreen: 'post_detail',
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = e.toString();
        });
      }
    }
  }

  static bool _looksLikeEmail(String? s) {
    final v = s?.trim() ?? '';
    return v.contains('@') && v.contains('.');
  }

  String _displayAuthorNameForId(String uid, String fallback) {
    final cached = _authorNameCache[uid];
    if (cached == null || cached.isEmpty) return fallback;
    // Prefer resolving only when the stored string looks wrong (email).
    if (_looksLikeEmail(fallback) || fallback.trim().isEmpty) return cached;
    return fallback;
  }

  void _maybeResolveAuthorId({
    required String uid,
    required String storedAuthorName,
  }) {
    if (uid.isEmpty) return;
    if (_authorNameCache.containsKey(uid)) return;
    if (_resolvingAuthorIds.contains(uid)) return;
    if (!_looksLikeEmail(storedAuthorName)) return;

    _resolvingAuthorIds.add(uid);
    _users.getDisplayNameForUser(uid).then((name) {
      if (!mounted) return;
      setState(() {
        _authorNameCache[uid] = name;
        _resolvingAuthorIds.remove(uid);
      });
    }).catchError((_) {
      if (!mounted) return;
      setState(() => _resolvingAuthorIds.remove(uid));
    });
  }

  void _maybeResolveReplyAuthors(List<FeedPostReply> replies) {
    for (final r in replies) {
      if (r.authorId.isEmpty) continue;
      _maybeResolveAuthorId(
        uid: r.authorId,
        storedAuthorName: r.authorName,
      );
    }
  }

  void _setReplyTarget(String? parentReplyId) {
    setState(() => _replyParentId = parentReplyId);
  }

  Future<void> _sendReply() async {
    final text = _replyBody.text.trim();
    if (text.isEmpty) return;
    setState(() => _replying = true);
    try {
      await _posts.addReply(
        widget.postId,
        text,
        parentReplyId: _replyParentId,
      );
      await ExpansionAnalytics.log(
        'post_reply_submitted',
        entityId: widget.postId,
        sourceScreen: 'post_detail',
        extra: <String, Object?>{'parent_reply_id': _replyParentId ?? ''},
      );
      _replyBody.clear();
      _replyParentId = null;
      if (mounted) FocusScope.of(context).unfocus();
      if (mounted) setState(() {});
    } catch (e) {
      unawaited(
        ExpansionAnalytics.log(
          'post_reply_failed',
          entityId: widget.postId,
          sourceScreen: 'post_detail',
          extra: ExpansionAnalytics.errorExtras(e, code: 'add_reply'),
        ),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Reply failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _replying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final post = _post;
    final replyHint = _replyParentId == null
        ? 'Write a reply…'
        : 'Reply to comment…';

    return Scaffold(
      body: Column(
        children: [
          Material(
            color: AppColors.background,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back),
                      onPressed: () => context.pop(),
                    ),
                    Expanded(
                      child: Text(
                        'Post',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _error != null
                    ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!)))
                    : post == null
                        ? const SizedBox.shrink()
                        : Column(
                            children: [
                              Expanded(
                                child: ListView(
                                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                                  children: [
                                    Container(
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
                                              PosterProfileAvatar(
                                                userId: post.authorId,
                                                displayNameHint: post.authorName,
                                                radius: 22,
                                              ),
                                              const SizedBox(width: 10),
                                              Expanded(
                                                child: InkWell(
                                                  onTap: post.authorId.isEmpty
                                                      ? null
                                                      : () => showUserProfileModal(context, userId: post.authorId),
                                                  borderRadius: BorderRadius.circular(8),
                                                  child: Padding(
                                                    padding: const EdgeInsets.symmetric(vertical: 4),
                                                    child: Text(
                                                      '${_displayAuthorNameForId(post.authorId, post.authorName)} · ${formatRelativeTime(post.createdAt)}',
                                                      style: const TextStyle(
                                                        fontSize: 13,
                                                        color: AppColors.primary,
                                                        fontWeight: FontWeight.w500,
                                                      ),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 16),
                                          if (post.postDetails.trim().isNotEmpty)
                                            Text(post.postDetails, style: const TextStyle(fontSize: 15, height: 1.45)),
                                          if (post.imageUrl != null && post.imageUrl!.trim().isNotEmpty) ...[
                                            if (post.postDetails.trim().isNotEmpty) const SizedBox(height: 16),
                                            ClipRRect(
                                              borderRadius: BorderRadius.circular(10),
                                              child: AspectRatio(
                                                aspectRatio: 4 / 3,
                                                child: Image.network(
                                                  post.imageUrl!.trim(),
                                                  fit: BoxFit.cover,
                                                  loadingBuilder: (context, child, progress) {
                                                    if (progress == null) return child;
                                                    return Container(
                                                      color: AppColors.secondary,
                                                      child: const Center(
                                                        child: SizedBox(
                                                          width: 28,
                                                          height: 28,
                                                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                                                        ),
                                                      ),
                                                    );
                                                  },
                                                  errorBuilder: (_, __, ___) => Container(
                                                    color: AppColors.secondary,
                                                    padding: const EdgeInsets.all(16),
                                                    child: const Center(
                                                      child: Text(
                                                        'Could not load image',
                                                        style: TextStyle(color: AppColors.mutedForeground),
                                                      ),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                            ),
                                          ],
                                          const SizedBox(height: 16),
                                          _PostLikeRow(postId: widget.postId),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: 20),
                                    Text(
                                      'Replies',
                                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                                    ),
                                    const SizedBox(height: 8),
                                    StreamBuilder<List<FeedPostReply>>(
                                      stream: _posts.watchReplies(widget.postId),
                                      builder: (context, snap) {
                                        if (!snap.hasData) {
                                          return const Padding(
                                            padding: EdgeInsets.all(24),
                                            child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                                          );
                                        }
                                        final flat = snap.data!;
                                        // Resolve reply authors if stored `author_name` looks like an email.
                                        _maybeResolveReplyAuthors(flat);
                                        if (flat.isEmpty) {
                                          return Padding(
                                            padding: const EdgeInsets.only(bottom: 16),
                                            child: Text(
                                              'No replies yet. Be the first.',
                                              style: TextStyle(color: AppColors.mutedForeground.withValues(alpha: 0.9)),
                                            ),
                                          );
                                        }
                                        final grouped = _groupReplies(flat);
                                        final roots = grouped['__root__'] ?? [];
                                        return Column(
                                          crossAxisAlignment: CrossAxisAlignment.stretch,
                                          children: [
                                            for (final r in roots)
                                              _ReplyBranch(
                                                reply: r,
                                                grouped: grouped,
                                                postId: widget.postId,
                                                depth: 0,
                                                onOpenProfile: (uid) => showUserProfileModal(context, userId: uid),
                                                onReply: (id) => _setReplyTarget(id),
                                                resolveAuthorName: (reply) => _displayAuthorNameForId(reply.authorId, reply.authorName),
                                              ),
                                          ],
                                        );
                                      },
                                    ),
                                  ],
                                ),
                              ),
                              Material(
                                color: AppColors.card,
                                child: SafeArea(
                                  top: false,
                                  child: Padding(
                                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      children: [
                                        if (_replyParentId != null)
                                          Padding(
                                            padding: const EdgeInsets.only(bottom: 8),
                                            child: Row(
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    'Replying to a comment',
                                                    style: TextStyle(fontSize: 12, color: AppColors.mutedForeground.withValues(alpha: 0.95)),
                                                  ),
                                                ),
                                                TextButton(
                                                  onPressed: () => setState(() => _replyParentId = null),
                                                  child: const Text('Cancel'),
                                                ),
                                              ],
                                            ),
                                          ),
                                        Row(
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            Expanded(
                                              child: TextField(
                                                controller: _replyBody,
                                                minLines: 1,
                                                maxLines: 4,
                                                decoration: InputDecoration(
                                                  hintText: replyHint,
                                                  border: const OutlineInputBorder(),
                                                  isDense: true,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            FilledButton(
                                              onPressed: _replying ? null : _sendReply,
                                              style: FilledButton.styleFrom(
                                                padding: const EdgeInsets.all(14),
                                                minimumSize: Size.zero,
                                              ),
                                              child: _replying
                                                  ? const SizedBox(
                                                      width: 20,
                                                      height: 20,
                                                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                                                    )
                                                  : const Icon(Icons.send, size: 22),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
          ),
        ],
      ),
    );
  }
}

/// parent key `__root__` for top-level replies; other keys are parent reply ids.
Map<String, List<FeedPostReply>> _groupReplies(List<FeedPostReply> flat) {
  final m = <String, List<FeedPostReply>>{};
  for (final r in flat) {
    final p = r.parentReplyId;
    final key = (p == null || p.isEmpty) ? '__root__' : p;
    m.putIfAbsent(key, () => []).add(r);
  }
  for (final list in m.values) {
    list.sort((a, b) => (a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0))
        .compareTo(b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0)));
  }
  return m;
}

class _ReplyBranch extends StatelessWidget {
  const _ReplyBranch({
    required this.reply,
    required this.grouped,
    required this.postId,
    required this.depth,
    required this.onOpenProfile,
    required this.onReply,
    required this.resolveAuthorName,
  });

  final FeedPostReply reply;
  final Map<String, List<FeedPostReply>> grouped;
  final String postId;
  final int depth;
  final void Function(String uid) onOpenProfile;
  final void Function(String replyId) onReply;
  final String Function(FeedPostReply reply) resolveAuthorName;

  @override
  Widget build(BuildContext context) {
    final children = grouped[reply.id] ?? [];
    return Padding(
      padding: EdgeInsets.only(left: depth * 14.0, bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _ReplyTile(
            postId: postId,
            reply: reply,
            authorDisplayName: resolveAuthorName(reply),
            onOpenProfile: onOpenProfile,
            onReplyToThis: () => onReply(reply.id),
          ),
          for (final c in children)
            _ReplyBranch(
              reply: c,
              grouped: grouped,
              postId: postId,
              depth: depth + 1,
              onOpenProfile: onOpenProfile,
              onReply: onReply,
              resolveAuthorName: resolveAuthorName,
            ),
        ],
      ),
    );
  }
}

class _PostLikeRow extends StatelessWidget {
  const _PostLikeRow({required this.postId});

  final String postId;

  @override
  Widget build(BuildContext context) {
    final repo = FeedPostsRepository();
    final uid = FirebaseAuth.instance.currentUser?.uid;
    return Row(
      children: [
        StreamBuilder<bool>(
          stream: repo.watchPostLikedByMe(postId),
          builder: (context, likedSnap) {
            final liked = likedSnap.data ?? false;
            return StreamBuilder<int>(
              stream: repo.watchPostLikeCount(postId),
              builder: (context, countSnap) {
                final n = countSnap.data ?? 0;
                return InkWell(
                  onTap: uid == null
                      ? null
                      : () async {
                          try {
                            await repo.togglePostLike(postId);
                            unawaited(
                              ExpansionAnalytics.log(
                                'feed_post_like_toggled',
                                entityId: postId,
                                sourceScreen: 'post_detail',
                                extra: const <String, Object?>{'target': 'post'},
                              ),
                            );
                          } catch (e) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                            }
                          }
                        },
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          liked ? Icons.favorite : Icons.favorite_border,
                          size: 22,
                          color: liked ? AppColors.primary : AppColors.mutedForeground,
                          fill: liked ? 1.0 : 0.0,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '$n',
                          style: const TextStyle(
                            fontSize: 15,
                            color: AppColors.mutedForeground,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      ],
    );
  }
}

class _ReplyTile extends StatelessWidget {
  const _ReplyTile({
    required this.postId,
    required this.reply,
    required this.authorDisplayName,
    required this.onOpenProfile,
    required this.onReplyToThis,
  });

  final String postId;
  final FeedPostReply reply;
  final String authorDisplayName;
  final void Function(String uid) onOpenProfile;
  final VoidCallback onReplyToThis;

  @override
  Widget build(BuildContext context) {
    final repo = FeedPostsRepository();
    final uid = FirebaseAuth.instance.currentUser?.uid;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: reply.authorId.isEmpty ? null : () => onOpenProfile(reply.authorId),
            child: Text(
              '$authorDisplayName · ${formatRelativeTime(reply.createdAt)}',
              style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w500),
            ),
          ),
          const SizedBox(height: 6),
          Text(reply.body, style: const TextStyle(fontSize: 14, height: 1.4)),
          const SizedBox(height: 8),
          Row(
            children: [
              TextButton(
                onPressed: onReplyToThis,
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  foregroundColor: AppColors.primary,
                ),
                child: const Text('Reply'),
              ),
              const SizedBox(width: 8),
              StreamBuilder<bool>(
                stream: repo.watchReplyLikedByMe(postId, reply.id),
                builder: (context, likedSnap) {
                  final liked = likedSnap.data ?? false;
                  return StreamBuilder<int>(
                    stream: repo.watchReplyLikeCount(postId, reply.id),
                    builder: (context, countSnap) {
                      final n = countSnap.data ?? 0;
                      return InkWell(
                        onTap: uid == null
                            ? null
                            : () async {
                                try {
                                  await repo.toggleReplyLike(postId, reply.id);
                                  unawaited(
                                    ExpansionAnalytics.log(
                                      'feed_post_like_toggled',
                                      entityId: postId,
                                      sourceScreen: 'post_detail',
                                      extra: <String, Object?>{'target': 'reply', 'reply_id': reply.id},
                                    ),
                                  );
                                } catch (e) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                                  }
                                }
                              },
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                liked ? Icons.favorite : Icons.favorite_border,
                                size: 18,
                                color: liked ? AppColors.primary : AppColors.mutedForeground,
                                fill: liked ? 1.0 : 0.0,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '$n',
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.mutedForeground,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}
