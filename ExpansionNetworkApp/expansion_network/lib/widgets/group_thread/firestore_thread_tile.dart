import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../analytics/expansion_analytics.dart';
import '../../models/group_thread_firestore.dart';
import '../../services/group_thread_repository.dart';
import '../../theme/app_theme.dart';
import '../user_profile_modal.dart';
import 'group_comment_tree.dart';

/// How this tile is shown: compact card in the group feed, or full thread inside a sheet.
enum GroupThreadTileVariant {
  /// Rounded card; tap body/footer to open full thread. Author opens profile.
  listPreview,
  /// Full post body + comments (e.g. bottom sheet).
  fullDetail,
}

/// Opens a draggable sheet with the full thread (body + comments + voting).
Future<void> showGroupThreadDetailSheet(
  BuildContext context, {
  required String groupId,
  required FsGroupThread thread,
  required GroupThreadRepository repo,
}) {
  unawaited(
    ExpansionAnalytics.log(
      'group_thread_opened',
      entityId: thread.id,
      sourceScreen: 'group_thread',
      extra: <String, Object?>{'group_id': groupId},
    ),
  );
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: AppColors.background,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (ctx) {
      return DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.92,
        minChildSize: 0.45,
        maxChildSize: 0.95,
        builder: (context, scrollController) {
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
                child: Row(
                  children: [
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        thread.title?.trim().isNotEmpty == true ? thread.title! : 'Thread',
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: AppColors.foreground),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: AppColors.border),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.only(bottom: 24),
                  children: [
                    FirestoreThreadTile(
                      variant: GroupThreadTileVariant.fullDetail,
                      groupId: groupId,
                      thread: thread,
                      repo: repo,
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      );
    },
  );
}

class FirestoreThreadTile extends StatefulWidget {
  const FirestoreThreadTile({
    super.key,
    required this.groupId,
    required this.thread,
    required this.repo,
    this.variant = GroupThreadTileVariant.listPreview,
  });

  final String groupId;
  final FsGroupThread thread;
  final GroupThreadRepository repo;
  final GroupThreadTileVariant variant;

  @override
  State<FirestoreThreadTile> createState() => _FirestoreThreadTileState();
}

class _FirestoreThreadTileState extends State<FirestoreThreadTile> {
  final _replyDraft = TextEditingController();
  ({String threadId, String? commentId})? _replyTarget;

  static const _destructive = Color(0xFFE57373);

  bool get _fullDetail => widget.variant == GroupThreadTileVariant.fullDetail;

  @override
  void didUpdateWidget(covariant FirestoreThreadTile oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.thread.id != widget.thread.id) {
      _replyTarget = null;
      _replyDraft.clear();
    }
  }

  @override
  void dispose() {
    _replyDraft.dispose();
    super.dispose();
  }

  void _openFullThread() {
    showGroupThreadDetailSheet(
      context,
      groupId: widget.groupId,
      thread: widget.thread,
      repo: widget.repo,
    );
  }

  Future<void> _vote(int direction) async {
    try {
      await widget.repo.setThreadVote(widget.groupId, widget.thread.id, direction);
      unawaited(
        ExpansionAnalytics.log(
          direction >= 0 ? 'group_thread_upvoted' : 'group_thread_downvoted',
          entityId: widget.thread.id,
          sourceScreen: 'group_thread',
          extra: <String, Object?>{'group_id': widget.groupId},
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _voteComment(String commentId, int direction) async {
    try {
      await widget.repo.setCommentVote(widget.groupId, widget.thread.id, commentId, direction);
      unawaited(
        ExpansionAnalytics.log(
          direction >= 0 ? 'group_comment_upvoted' : 'group_comment_downvoted',
          entityId: widget.thread.id,
          sourceScreen: 'group_thread',
          extra: <String, Object?>{'group_id': widget.groupId, 'comment_id': commentId},
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _submitComment({String? parentId}) async {
    final text = _replyDraft.text.trim();
    if (text.isEmpty) return;
    try {
      await widget.repo.createComment(
        groupId: widget.groupId,
        threadId: widget.thread.id,
        body: text,
        parentCommentId: parentId,
      );
      await ExpansionAnalytics.log(
        'group_thread_comment_submitted',
        entityId: widget.thread.id,
        sourceScreen: 'group_thread',
        extra: <String, Object?>{'group_id': widget.groupId},
      );
      if (mounted) {
        setState(() {
          _replyDraft.clear();
          _replyTarget = null;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.thread;
    final previewClamp = !_fullDetail;
    const previewMaxLines = 3;

    Widget voteBlock() {
      return StreamBuilder<int>(
        stream: widget.repo.watchThreadScore(widget.groupId, t.id),
        initialData: 0,
        builder: (context, snap) {
          final score = snap.data ?? 0;
          return StreamBuilder<int?>(
            stream: widget.repo.watchMyThreadVote(widget.groupId, t.id),
            builder: (context, voteSnap) {
              final my = voteSnap.data;
              return _VoteColumn(
                score: score,
                userVote: my,
                onUp: () => _vote(1),
                onDown: () => _vote(-1),
                size: 20,
              );
            },
          );
        },
      );
    }

    Widget authorRow() {
      return GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: t.authorId.isEmpty ? null : () => showUserProfileModal(context, userId: t.authorId),
        child: Row(
          children: [
            CircleAvatar(
              radius: 12,
              backgroundColor: AppColors.primary,
              child: Text(
                t.initials,
                style: const TextStyle(fontSize: 9, color: AppColors.onPrimary),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                t.authorName,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: t.authorId.isEmpty ? AppColors.foreground : AppColors.primary,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (t.authorRole != null && t.authorRole!.isNotEmpty) ...[
              Text(
                ' • ${t.authorRole}',
                style: const TextStyle(fontSize: 10, color: AppColors.mutedForeground),
                overflow: TextOverflow.ellipsis,
              ),
            ],
            Text(' • ${t.timeLabel}', style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
          ],
        ),
      );
    }

    Widget titleAndBody() {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (t.title != null && t.title!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              t.title!,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: AppColors.foreground),
            ),
          ],
          const SizedBox(height: 6),
          Text(
            t.body,
            style: const TextStyle(fontSize: 13, height: 1.4, color: AppColors.foreground),
            maxLines: previewClamp ? previewMaxLines : null,
            overflow: previewClamp ? TextOverflow.ellipsis : null,
          ),
          if (previewClamp &&
              (t.body.length > 120 || t.body.split('\n').length > previewMaxLines)) ...[
            const SizedBox(height: 4),
            Text(
              'Tap card to read full thread',
              style: TextStyle(fontSize: 11, color: AppColors.primary.withValues(alpha: 0.9)),
            ),
          ],
        ],
      );
    }

    Widget footerRow() {
      return Row(
        children: [
          StreamBuilder<List<FsGroupComment>>(
            stream: widget.repo.watchComments(widget.groupId, t.id),
            builder: (context, cs) {
              final n = cs.data?.length ?? 0;
              return Row(
                children: [
                  Icon(Icons.chat_bubble_outline, size: 16, color: AppColors.mutedForeground),
                  const SizedBox(width: 4),
                  Text(
                    '$n ${n == 1 ? 'comment' : 'comments'}',
                    style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                  ),
                ],
              );
            },
          ),
          const SizedBox(width: 16),
          const Icon(Icons.share_outlined, size: 16, color: AppColors.mutedForeground),
          const SizedBox(width: 4),
          const Text('Share', style: TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
        ],
      );
    }

    final contentColumn = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        authorRow(),
        titleAndBody(),
        const SizedBox(height: 8),
        if (_fullDetail)
          footerRow()
        else
          Row(
            children: [
              Expanded(child: footerRow()),
              const Icon(Icons.chevron_right, color: AppColors.mutedForeground, size: 22),
            ],
          ),
        if (_fullDetail) ...[
          const Divider(height: 24, color: AppColors.border),
          _replyComposer(
            hint: 'Write a comment...',
            show: _replyTarget?.threadId == t.id && _replyTarget?.commentId == null,
            onSubmit: () => _submitComment(parentId: null),
          ),
          if (_replyTarget?.threadId != t.id || _replyTarget?.commentId != null)
            TextButton.icon(
              onPressed: () => setState(() {
                _replyTarget = (threadId: t.id, commentId: null);
                _replyDraft.clear();
              }),
              icon: const Icon(Icons.chat_bubble_outline, size: 14, color: AppColors.mutedForeground),
              label: const Text('Add a comment', style: TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
            ),
          StreamBuilder<List<FsGroupComment>>(
            stream: widget.repo.watchComments(widget.groupId, t.id),
            builder: (context, snap) {
              final list = snap.data ?? [];
              if (list.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'No comments yet. Be the first to comment!',
                    style: TextStyle(fontSize: 11, color: AppColors.mutedForeground, fontStyle: FontStyle.italic),
                  ),
                );
              }
              final roots = list.where((c) => c.parentCommentId == null || c.parentCommentId!.isEmpty).toList();
              return Column(
                children: roots
                    .map(
                      (c) => GroupCommentTree(
                        comment: c,
                        all: list,
                        groupId: widget.groupId,
                        threadId: t.id,
                        repo: widget.repo,
                        depth: 0,
                        replyTarget: _replyTarget,
                        replyDraft: _replyDraft,
                        onReply: (cid) => setState(() {
                          _replyTarget = (threadId: t.id, commentId: cid);
                          _replyDraft.clear();
                        }),
                        onCancelReply: () => setState(() => _replyTarget = null),
                        onSubmitReply: (parentId) => _submitComment(parentId: parentId),
                        onVote: _voteComment,
                        destructive: _destructive,
                      ),
                    )
                    .toList(),
              );
            },
          ),
        ],
      ],
    );

    final inner = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        voteBlock(),
        const SizedBox(width: 8),
        Expanded(child: contentColumn),
      ],
    );

    if (_fullDetail) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
        child: inner,
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Material(
        color: AppColors.card,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: _openFullThread,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: inner,
          ),
        ),
      ),
    );
  }

  Widget _replyComposer({required String hint, required bool show, required VoidCallback onSubmit}) {
    if (!show) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _replyDraft,
                style: const TextStyle(fontSize: 13, color: AppColors.foreground),
                decoration: InputDecoration(
                  hintText: hint,
                  isDense: true,
                  filled: true,
                  fillColor: AppColors.secondary,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                ),
                onSubmitted: (_) => onSubmit(),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.send, color: AppColors.primary),
              onPressed: onSubmit,
            ),
          ],
        ),
        TextButton(
          onPressed: () => setState(() => _replyTarget = null),
          child: const Text('Cancel', style: TextStyle(fontSize: 12)),
        ),
      ],
    );
  }
}

class _VoteColumn extends StatelessWidget {
  const _VoteColumn({
    required this.score,
    required this.userVote,
    required this.onUp,
    required this.onDown,
    required this.size,
  });

  final int score;
  final int? userVote;
  final VoidCallback onUp;
  final VoidCallback onDown;
  final double size;

  static const _destructive = Color(0xFFE57373);

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    final disabled = uid == null;
    return Column(
      children: [
        IconButton(
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(minWidth: 32, minHeight: 28),
          icon: Icon(Icons.keyboard_arrow_up, size: size, color: userVote == 1 ? AppColors.primary : AppColors.mutedForeground),
          onPressed: disabled ? null : onUp,
        ),
        Text(
          '$score',
          style: TextStyle(
            fontSize: size > 16 ? 14 : 12,
            fontWeight: FontWeight.bold,
            color: userVote == 1 ? AppColors.primary : userVote == -1 ? _destructive : AppColors.foreground,
          ),
        ),
        IconButton(
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(minWidth: 32, minHeight: 28),
          icon: Icon(Icons.keyboard_arrow_down, size: size, color: userVote == -1 ? _destructive : AppColors.mutedForeground),
          onPressed: disabled ? null : onDown,
        ),
      ],
    );
  }
}
