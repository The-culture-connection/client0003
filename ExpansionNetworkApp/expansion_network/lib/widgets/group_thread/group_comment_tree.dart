import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../models/group_thread_firestore.dart';
import '../../services/group_thread_repository.dart';
import '../../theme/app_theme.dart';

class GroupCommentTree extends StatelessWidget {
  const GroupCommentTree({
    super.key,
    required this.comment,
    required this.all,
    required this.groupId,
    required this.threadId,
    required this.repo,
    required this.depth,
    required this.replyTarget,
    required this.replyDraft,
    required this.onReply,
    required this.onCancelReply,
    required this.onSubmitReply,
    required this.onVote,
    required this.destructive,
  });

  final FsGroupComment comment;
  final List<FsGroupComment> all;
  final String groupId;
  final String threadId;
  final GroupThreadRepository repo;
  final int depth;
  final ({String threadId, String? commentId})? replyTarget;
  final TextEditingController replyDraft;
  final void Function(String commentId) onReply;
  final VoidCallback onCancelReply;
  final void Function(String parentId) onSubmitReply;
  final void Function(String commentId, int direction) onVote;
  final Color destructive;

  List<FsGroupComment> get _children => all.where((c) => c.parentCommentId == comment.id).toList();

  @override
  Widget build(BuildContext context) {
    final replyingHere = replyTarget?.threadId == threadId && replyTarget?.commentId == comment.id;
    final uid = FirebaseAuth.instance.currentUser?.uid;

    final indent = depth.clamp(0, 8) * 6.0;
    return Container(
      margin: EdgeInsets.only(left: indent),
      decoration: depth > 0
          ? const BoxDecoration(border: Border(left: BorderSide(color: AppColors.border, width: 2)))
          : null,
      padding: EdgeInsets.only(left: depth > 0 ? 10 : 0, bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StreamBuilder<int?>(
            stream: repo.watchMyCommentVote(groupId, threadId, comment.id),
            builder: (context, vs) {
              final my = vs.data;
              final score = comment.score;
              return Column(
                children: [
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 28, minHeight: 26),
                    icon: Icon(Icons.keyboard_arrow_up, size: 16, color: my == 1 ? AppColors.primary : AppColors.mutedForeground),
                    onPressed: uid == null ? null : () => onVote(comment.id, 1),
                  ),
                  Text(
                    '$score',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: my == 1 ? AppColors.primary : my == -1 ? destructive : AppColors.foreground,
                    ),
                  ),
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 28, minHeight: 26),
                    icon: Icon(Icons.keyboard_arrow_down, size: 16, color: my == -1 ? destructive : AppColors.mutedForeground),
                    onPressed: uid == null ? null : () => onVote(comment.id, -1),
                  ),
                ],
              );
            },
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 10,
                      backgroundColor: AppColors.primary,
                      child: Text(comment.initials, style: const TextStyle(fontSize: 8, color: AppColors.onPrimary)),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        comment.authorName,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(' • ${comment.timeLabel}', style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(comment.body, style: const TextStyle(fontSize: 12, height: 1.35, color: AppColors.foreground)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    TextButton.icon(
                      onPressed: uid == null ? null : () => onReply(comment.id),
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        foregroundColor: AppColors.mutedForeground,
                      ),
                      icon: const Icon(Icons.subdirectory_arrow_right, size: 12),
                      label: const Text('Reply', style: TextStyle(fontSize: 11)),
                    ),
                  ],
                ),
                if (replyingHere) ...[
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: replyDraft,
                          style: const TextStyle(fontSize: 12),
                          decoration: InputDecoration(
                            hintText: 'Write a reply...',
                            isDense: true,
                            filled: true,
                            fillColor: AppColors.secondary,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                          ),
                          onSubmitted: (_) => onSubmitReply(comment.id),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.send, size: 18, color: AppColors.primary),
                        onPressed: () => onSubmitReply(comment.id),
                      ),
                    ],
                  ),
                  TextButton(onPressed: onCancelReply, child: const Text('Cancel', style: TextStyle(fontSize: 11))),
                ],
                ..._children.map(
                  (c) => GroupCommentTree(
                    comment: c,
                    all: all,
                    groupId: groupId,
                    threadId: threadId,
                    repo: repo,
                    depth: depth + 1,
                    replyTarget: replyTarget,
                    replyDraft: replyDraft,
                    onReply: onReply,
                    onCancelReply: onCancelReply,
                    onSubmitReply: onSubmitReply,
                    onVote: onVote,
                    destructive: destructive,
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
