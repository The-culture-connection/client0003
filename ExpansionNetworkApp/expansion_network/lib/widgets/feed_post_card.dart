import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/feed_post.dart';
import '../profile/profile_utils.dart';
import '../services/feed_posts_repository.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../utils/relative_time.dart';
import 'poster_profile_avatar.dart';
import 'user_profile_modal.dart';

/// Feed-style post: author header (avatar + name open profile), body, optional image, like only (no reply/share UI).
class FeedPostCard extends StatelessWidget {
  const FeedPostCard({
    super.key,
    required this.post,
    this.compact = false,
    this.showImage = true,
    this.onOpenPost,
  });

  final FeedPost post;
  final bool compact;
  /// When false, [post.imageUrl] is ignored (e.g. home “Recent Activity” preview).
  final bool showImage;
  final VoidCallback? onOpenPost;

  void _openProfile(BuildContext context) {
    if (post.authorId.isEmpty) return;
    showUserProfileModal(context, userId: post.authorId);
  }

  @override
  Widget build(BuildContext context) {
    final me = FirebaseAuth.instance.currentUser?.uid;
    final isAuthor = me != null && me == post.authorId;
    final repo = FeedPostsRepository();
    final users = UserProfileRepository();

    final padding = compact ? const EdgeInsets.symmetric(vertical: 10) : const EdgeInsets.all(16);
    final onPostTap = onOpenPost ?? () => context.push('/feed/post/${post.id}');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPostTap,
        borderRadius: BorderRadius.circular(compact ? 0 : 12),
        child: Padding(
          padding: padding,
          child: SizedBox(
            width: double.infinity,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (post.authorId.isEmpty)
                    PosterProfileAvatar(
                      userId: post.authorId,
                      displayNameHint: post.authorName,
                      radius: compact ? 16 : 20,
                    )
                  else
                    StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
                      stream: users.watchUserDoc(post.authorId),
                      builder: (context, snap) {
                        final data = snap.data?.data();
                        final photo = data != null ? profileString(data['photo_url']) : null;
                        return PosterProfileAvatar(
                          userId: post.authorId,
                          displayNameHint: post.authorName,
                          photoUrl: photo,
                          radius: compact ? 16 : 20,
                        );
                      },
                    ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: InkWell(
                      onTap: post.authorId.isEmpty ? null : () => _openProfile(context),
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.only(right: 4, bottom: 4),
                        child: post.authorId.isEmpty
                            ? Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    post.authorName,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: compact ? 13 : 15,
                                      color: AppColors.foreground,
                                    ),
                                  ),
                                ],
                              )
                            : StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
                                stream: users.watchUserDoc(post.authorId),
                                builder: (context, snap) {
                                  final data = snap.data?.data();
                                  final name = data != null ? profileDisplayName(data) : post.authorName;
                                  final subtitle = data != null ? profileCohortSubtitle(data) : null;
                                  return Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        name,
                                        style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: compact ? 13 : 15,
                                          color: AppColors.foreground,
                                        ),
                                      ),
                                      if (subtitle != null) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          subtitle,
                                          style: TextStyle(
                                            fontSize: compact ? 11 : 12,
                                            color: AppColors.mutedForeground,
                                          ),
                                        ),
                                      ],
                                    ],
                                  );
                                },
                              ),
                      ),
                    ),
                  ),
                ],
              ),
              if (compact)
                Padding(
                  padding: const EdgeInsets.only(left: 52, top: 2),
                  child: Text(
                    formatRelativeTime(post.createdAt),
                    style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                  ),
                ),
              if (post.postDetails.trim().isNotEmpty) ...[
                SizedBox(height: compact ? 4 : 8),
                Text(
                  post.postDetails,
                  style: TextStyle(
                    fontSize: compact ? 12 : 14,
                    height: 1.4,
                    color: AppColors.foreground,
                  ),
                  softWrap: true,
                ),
              ],
              if (showImage && post.imageUrl != null && post.imageUrl!.trim().isNotEmpty) ...[
                SizedBox(height: compact ? 8 : 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: AspectRatio(
                    aspectRatio: compact ? 16 / 10 : 4 / 3,
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
                          child: Text('Could not load image', style: TextStyle(color: AppColors.mutedForeground)),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
              if (!compact) ...[
                SizedBox(height: (post.postDetails.trim().isNotEmpty ||
                        (showImage && post.imageUrl != null && post.imageUrl!.trim().isNotEmpty))
                    ? 10
                    : 6),
                Text(
                  formatRelativeTime(post.createdAt),
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.mutedForeground,
                  ),
                ),
              ],
              SizedBox(height: compact ? 6 : 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  StreamBuilder<bool>(
                    stream: repo.watchPostLikedByMe(post.id),
                    builder: (context, likedSnap) {
                      final liked = likedSnap.data ?? false;
                      return StreamBuilder<int>(
                        stream: repo.watchPostLikeCount(post.id),
                        builder: (context, countSnap) {
                          final n = countSnap.data ?? 0;
                          return InkWell(
                            onTap: me == null
                                ? null
                                : () async {
                                    try {
                                      await repo.togglePostLike(post.id);
                                    } catch (e) {
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                                      }
                                    }
                                  },
                            borderRadius: BorderRadius.circular(8),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    liked ? Icons.favorite : Icons.favorite_border,
                                    size: compact ? 18 : 20,
                                    color: liked ? AppColors.primary : AppColors.mutedForeground,
                                    fill: liked ? 1.0 : 0.0,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    '$n',
                                    style: TextStyle(
                                      fontSize: compact ? 12 : 13,
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
                  const Spacer(),
                  if (isAuthor)
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                      icon: Icon(Icons.delete_outline, size: compact ? 18 : 20, color: AppColors.mutedForeground),
                      onPressed: () async {
                        final ok = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('Delete post?'),
                            content: const Text('This cannot be undone.'),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                              FilledButton(
                                onPressed: () => Navigator.pop(ctx, true),
                                child: const Text('Delete'),
                              ),
                            ],
                          ),
                        );
                        if (ok == true && context.mounted) {
                          try {
                            await repo.deletePost(post.id);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Post deleted')),
                              );
                            }
                          } catch (e) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                            }
                          }
                        }
                      },
                    ),
                ],
              ),
            ],
          ),
          ),
        ),
      ),
    );
  }
}
