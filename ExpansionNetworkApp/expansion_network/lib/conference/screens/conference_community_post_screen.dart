import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../conference_analytics.dart';
import '../current_conference_holder.dart';
import '../models/community_post.dart';
import '../services/conference_community_service.dart';
import '../theme/conference_colors.dart';
import '../widgets/community_widgets.dart';
import '../widgets/conference_background.dart';
import '../../theme/cosmic_content.dart';

/// Expanded view of one Community Hub message: the message, its replies, and a
/// reply composer pinned to the bottom.
class ConferenceCommunityPostScreen extends StatefulWidget {
  const ConferenceCommunityPostScreen({super.key, required this.postId});

  final String postId;

  @override
  State<ConferenceCommunityPostScreen> createState() =>
      _ConferenceCommunityPostScreenState();
}

class _ConferenceCommunityPostScreenState
    extends State<ConferenceCommunityPostScreen> {
  final ConferenceCommunityService _service = ConferenceCommunityService();
  final TextEditingController _reply = TextEditingController();
  final FocusNode _replyFocus = FocusNode();

  bool _sending = false;

  String? get _conferenceId => CurrentConferenceHolder.instance.conferenceId;
  String? get _myUid => FirebaseAuth.instance.currentUser?.uid;

  @override
  void dispose() {
    _reply.dispose();
    _replyFocus.dispose();
    super.dispose();
  }

  void _toast(String message) {
    ScaffoldMessenger.maybeOf(context)
      ?..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _send() async {
    final conferenceId = _conferenceId;
    if (conferenceId == null || _sending) return;
    if (_reply.text.trim().isEmpty) return;

    setState(() => _sending = true);
    try {
      final length = _reply.text.trim().length;
      await _service.addReply(
        conferenceId: conferenceId,
        postId: widget.postId,
        body: _reply.text,
      );
      logConferenceEvent(() => ConferenceAnalytics.communityReplyCreated(
            postId: widget.postId,
            bodyLength: length,
          ));
      if (!mounted) return;
      _reply.clear();
      _replyFocus.unfocus();
    } catch (e) {
      if (!mounted) return;
      _toast(e is StateError ? e.message : 'Could not reply. $e');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _deletePost(CommunityPost post) async {
    final conferenceId = _conferenceId;
    if (conferenceId == null) return;
    final confirmed = await confirmCommunityAction(
      context,
      title: 'Delete message?',
      body: 'This removes your message and all replies to it.',
    );
    if (!confirmed || !mounted) return;
    try {
      await _service.deletePost(conferenceId: conferenceId, postId: post.id);
      logConferenceEvent(() => ConferenceAnalytics.communityContentDeleted(
            targetType: 'post',
            targetId: post.id,
          ));
      // The post stream then emits null and this screen pops itself.
    } catch (e) {
      if (!mounted) return;
      _toast(e is StateError ? e.message : 'Could not delete. $e');
    }
  }

  Future<void> _deleteReply(CommunityReply reply) async {
    final conferenceId = _conferenceId;
    if (conferenceId == null) return;
    final confirmed = await confirmCommunityAction(
      context,
      title: 'Delete reply?',
      body: 'This removes your reply.',
    );
    if (!confirmed || !mounted) return;
    try {
      await _service.deleteReply(
        conferenceId: conferenceId,
        postId: widget.postId,
        replyId: reply.id,
      );
      logConferenceEvent(() => ConferenceAnalytics.communityContentDeleted(
            targetType: 'reply',
            targetId: reply.id,
          ));
    } catch (e) {
      if (!mounted) return;
      _toast(e is StateError ? e.message : 'Could not delete. $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final conferenceId = _conferenceId;

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text('Message'),
      ),
      extendBodyBehindAppBar: true,
      body: ConferenceGridBackground(
        child: SafeArea(
          child: conferenceId == null
              ? const Center(
                  child: Text(
                    'No conference is open right now.',
                    style: TextStyle(color: ConferenceColors.mutedForeground),
                  ),
                )
              : StreamBuilder<CommunityPost?>(
                  stream: _service.watchPost(conferenceId, widget.postId),
                  builder: (context, snapshot) {
                    if (snapshot.hasError) {
                      return Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(
                            'Could not load this message.\n${snapshot.error}',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: ConferenceColors.mutedForeground,
                            ),
                          ),
                        ),
                      );
                    }
                    if (!snapshot.hasData && snapshot.connectionState != ConnectionState.active) {
                      return const Center(
                        child: CircularProgressIndicator(color: ConferenceColors.gold),
                      );
                    }
                    final post = snapshot.data;
                    if (post == null) {
                      return const _Gone();
                    }
                    return Column(
                      children: [
                        Expanded(
                          child: ListView(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                            children: [
                              _PostHeader(
                                post: post,
                                mine: _myUid == post.authorId,
                                onDelete: () => _deletePost(post),
                                onReport: () => reportCommunityContent(
                                  context,
                                  authorId: post.authorId,
                                  quoted: post.body,
                                ),
                              ),
                              const SizedBox(height: 20),
                              _RepliesHeading(count: post.replyCount),
                              const SizedBox(height: 8),
                              _RepliesList(
                                conferenceId: conferenceId,
                                postId: widget.postId,
                                service: _service,
                                myUid: _myUid,
                                onDelete: _deleteReply,
                              ),
                            ],
                          ),
                        ),
                        _buildComposer(),
                      ],
                    );
                  },
                ),
        ),
      ),
    );
  }

  Widget _buildComposer() {
    return Container(
      padding: EdgeInsets.fromLTRB(
        12,
        10,
        12,
        10 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      decoration: const BoxDecoration(
        color: Colors.black,
        border: Border(top: BorderSide(color: ConferenceColors.cardBorder)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: _reply,
              focusNode: _replyFocus,
              minLines: 1,
              maxLines: 5,
              maxLength: ConferenceCommunityService.maxBodyLength,
              textCapitalization: TextCapitalization.sentences,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                counterText: '',
                hintText: 'Write a reply…',
                hintStyle: const TextStyle(color: ConferenceColors.mutedForeground),
                filled: true,
                fillColor: ConferenceColors.card,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: _pill(),
                enabledBorder: _pill(),
                focusedBorder: _pill(focused: true),
              ),
              onSubmitted: (_) => _send(),
            ),
          ),
          const SizedBox(width: 8),
          _sending
              ? const Padding(
                  padding: EdgeInsets.all(12),
                  child: SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      color: ConferenceColors.gold,
                      strokeWidth: 2,
                    ),
                  ),
                )
              : IconButton.filled(
                  onPressed: _send,
                  icon: const Icon(Icons.send_rounded),
                  tooltip: 'Reply',
                  style: IconButton.styleFrom(
                    backgroundColor: ConferenceColors.gold,
                    foregroundColor: Colors.black,
                  ),
                ),
        ],
      ),
    );
  }

  OutlineInputBorder _pill({bool focused = false}) => OutlineInputBorder(
        borderRadius: Cosmic.chipRadius,
        borderSide: BorderSide(
          color: focused ? ConferenceColors.gold : ConferenceColors.cardBorder,
        ),
      );
}

class _PostHeader extends StatelessWidget {
  const _PostHeader({
    required this.post,
    required this.mine,
    required this.onDelete,
    required this.onReport,
  });

  final CommunityPost post;
  final bool mine;
  final VoidCallback onDelete;
  final VoidCallback onReport;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: ConferenceColors.card,
        borderRadius: Cosmic.chipRadius,
        border: Border.all(color: ConferenceColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CommunityAuthorLine(
            uid: post.authorId,
            name: post.authorName,
            subtitle: post.authorSubtitle,
            createdAt: post.createdAt,
            mine: mine,
            onDelete: onDelete,
            onReport: onReport,
          ),
          const SizedBox(height: 14),
          Text(
            post.body,
            style: const TextStyle(color: Colors.white, fontSize: 16, height: 1.5),
          ),
          if (post.tag != null) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                const Spacer(),
                CommunityTagChip(tag: post.tag!),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _RepliesHeading extends StatelessWidget {
  const _RepliesHeading({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          count == 0 ? 'REPLIES' : '$count ${count == 1 ? 'REPLY' : 'REPLIES'}',
          style: const TextStyle(
            color: ConferenceColors.gold,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(width: 12),
        const Expanded(child: Divider(color: ConferenceColors.cardBorder)),
      ],
    );
  }
}

class _RepliesList extends StatelessWidget {
  const _RepliesList({
    required this.conferenceId,
    required this.postId,
    required this.service,
    required this.myUid,
    required this.onDelete,
  });

  final String conferenceId;
  final String postId;
  final ConferenceCommunityService service;
  final String? myUid;
  final ValueChanged<CommunityReply> onDelete;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<CommunityReply>>(
      stream: service.watchReplies(conferenceId, postId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Text(
            'Could not load replies.\n${snapshot.error}',
            style: const TextStyle(
              color: ConferenceColors.mutedForeground,
              fontSize: 12,
            ),
          );
        }
        if (!snapshot.hasData) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  color: ConferenceColors.gold,
                  strokeWidth: 2,
                ),
              ),
            ),
          );
        }
        final replies = snapshot.data!;
        if (replies.isEmpty) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 20),
            child: Center(
              child: Text(
                'No replies yet — be the first.',
                style: TextStyle(
                  color: ConferenceColors.mutedForeground,
                  fontSize: 13,
                ),
              ),
            ),
          );
        }
        return Column(
          children: [
            for (final r in replies)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.04),
                  borderRadius: Cosmic.chipRadius,
                  border: Border.all(color: ConferenceColors.cardBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CommunityAuthorLine(
                      uid: r.authorId,
                      name: r.authorName,
                      subtitle: r.authorSubtitle,
                      createdAt: r.createdAt,
                      mine: myUid != null && myUid == r.authorId,
                      avatarRadius: 15,
                      onDelete: () => onDelete(r),
                      onReport: () => reportCommunityContent(
                        context,
                        authorId: r.authorId,
                        quoted: r.body,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      r.body,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

/// Shown when the message is deleted while someone is reading it.
class _Gone extends StatelessWidget {
  const _Gone();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.speaker_notes_off_outlined,
              size: 44,
              color: ConferenceColors.mutedForeground,
            ),
            const SizedBox(height: 16),
            const Text(
              'This message was deleted',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: () => context.canPop()
                  ? context.pop()
                  : context.go('/conference/community'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: const BorderSide(color: ConferenceColors.cardBorder),
              ),
              child: const Text('Back to the hub'),
            ),
          ],
        ),
      ),
    );
  }
}
