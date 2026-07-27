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
import '../widgets/conference_scope.dart';

/// Community Hub — an open forum feed for the current conference.
///
/// The feed is read-only: composing happens on `/conference/community/compose`
/// (the `+` button) and replying on the message detail page, so the list itself
/// stays a clean scroll.
class ConferenceCommunityScreen extends StatefulWidget {
  const ConferenceCommunityScreen({super.key});

  @override
  State<ConferenceCommunityScreen> createState() => _ConferenceCommunityScreenState();
}

class _ConferenceCommunityScreenState extends State<ConferenceCommunityScreen> {
  @override
  void initState() {
    super.initState();
    logConferenceEvent(ConferenceAnalytics.communityViewed);
  }

  @override
  Widget build(BuildContext context) {
    final conferenceId = CurrentConferenceHolder.instance.conferenceId;
    final service = ConferenceCommunityService();
    final myUid = FirebaseAuth.instance.currentUser?.uid;

    return Scaffold(
      backgroundColor: Colors.black,
      body: ConferenceGridBackground(
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _Header(conferenceId: conferenceId),
              Expanded(
                child: conferenceId == null
                    ? const _EmptyState(
                        icon: Icons.forum_outlined,
                        title: 'No conference is open',
                        body: 'The Community Hub opens with the next event.',
                      )
                    : _Feed(
                        conferenceId: conferenceId,
                        service: service,
                        myUid: myUid,
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.conferenceId});

  final String? conferenceId;

  @override
  Widget build(BuildContext context) {
    // ConferenceScope is only present when this screen is opened from inside the
    // shell; the attendee count is decoration, so fall back to hiding it.
    int? attendees;
    try {
      attendees = ConferenceScope.of(context).conference?.attendeeCount;
    } catch (_) {
      attendees = null;
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 4, 12, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextButton.icon(
            onPressed: () => context.canPop()
                ? context.pop()
                : context.go('/conference/lobby'),
            icon: const Icon(Icons.arrow_back, size: 18),
            label: const Text('Back to Lobby', style: TextStyle(fontSize: 14)),
            style: TextButton.styleFrom(foregroundColor: Colors.white),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 0, 0),
            child: Row(
              children: [
                const Icon(
                  Icons.chat_bubble_outline_rounded,
                  color: ConferenceColors.gold,
                  size: 22,
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'COMMUNITY HUB',
                    style: TextStyle(
                      color: ConferenceColors.gold,
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.1,
                    ),
                  ),
                ),
                if (conferenceId != null)
                  _ComposeButton(conferenceId: conferenceId!),
              ],
            ),
          ),
          if (attendees != null && attendees > 0)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 0, 0),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Color(0xFF34D399),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '$attendees active member${attendees == 1 ? '' : 's'}',
                    style: const TextStyle(
                      color: ConferenceColors.mutedForeground,
                      fontSize: 13,
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

class _ComposeButton extends StatelessWidget {
  const _ComposeButton({required this.conferenceId});

  final String conferenceId;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: ConferenceColors.gold,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: () => context.push('/conference/community/compose'),
        child: const Padding(
          padding: EdgeInsets.all(8),
          child: Icon(Icons.add, color: Colors.black, size: 24),
        ),
      ),
    );
  }
}

class _Feed extends StatelessWidget {
  const _Feed({
    required this.conferenceId,
    required this.service,
    required this.myUid,
  });

  final String conferenceId;
  final ConferenceCommunityService service;
  final String? myUid;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<CommunityPost>>(
      stream: service.watchPosts(conferenceId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _EmptyState(
            icon: Icons.error_outline,
            title: 'Could not load the hub',
            body: '${snapshot.error}',
          );
        }
        if (!snapshot.hasData) {
          return const Center(
            child: CircularProgressIndicator(color: ConferenceColors.gold),
          );
        }
        final posts = snapshot.data!;
        if (posts.isEmpty) {
          return const _EmptyState(
            icon: Icons.forum_outlined,
            title: 'No messages yet',
            body: 'Tap + to start the conversation.',
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          itemCount: posts.length,
          itemBuilder: (context, i) => _PostCard(
            post: posts[i],
            conferenceId: conferenceId,
            service: service,
            mine: myUid != null && myUid == posts[i].authorId,
          ),
        );
      },
    );
  }
}

class _PostCard extends StatelessWidget {
  const _PostCard({
    required this.post,
    required this.conferenceId,
    required this.service,
    required this.mine,
  });

  final CommunityPost post;
  final String conferenceId;
  final ConferenceCommunityService service;
  final bool mine;

  Future<void> _delete(BuildContext context) async {
    final confirmed = await confirmCommunityAction(
      context,
      title: 'Delete message?',
      body: 'This removes your message and all replies to it.',
    );
    if (!confirmed || !context.mounted) return;
    final messenger = ScaffoldMessenger.maybeOf(context);
    try {
      await service.deletePost(conferenceId: conferenceId, postId: post.id);
      logConferenceEvent(() => ConferenceAnalytics.communityContentDeleted(
            targetType: 'post',
            targetId: post.id,
          ));
    } catch (e) {
      messenger
        ?..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(content: Text(e is StateError ? e.message : 'Could not delete. $e')),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: ConferenceColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ConferenceColors.cardBorder),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          logConferenceEvent(
            () => ConferenceAnalytics.communityPostOpened(postId: post.id),
          );
          context.push('/conference/community/${post.id}');
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CommunityAuthorLine(
                uid: post.authorId,
                name: post.authorName,
                subtitle: post.authorSubtitle,
                createdAt: post.createdAt,
                mine: mine,
                onDelete: () => _delete(context),
                onReport: () {
                  logConferenceEvent(
                    () => ConferenceAnalytics.communityContentReported(
                      targetType: 'post',
                      authorId: post.authorId,
                    ),
                  );
                  reportCommunityContent(
                    context,
                    authorId: post.authorId,
                    quoted: post.body,
                  );
                },
              ),
              const SizedBox(height: 12),
              Text(
                post.body,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14.5,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  CommunityReplyCount(count: post.replyCount),
                  const Spacer(),
                  if (post.tag != null) CommunityTagChip(tag: post.tag!),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 44, color: ConferenceColors.goldAlpha(0.6)),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 17,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              body,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: ConferenceColors.mutedForeground,
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
