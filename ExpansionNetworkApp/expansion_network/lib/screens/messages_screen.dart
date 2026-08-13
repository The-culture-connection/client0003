import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../analytics/expansion_analytics.dart';
import '../services/dm_repository.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../theme/cosmic_content.dart';
import '../widgets/new_message_sheet.dart';
import '../widgets/user_profile_modal.dart';

String? _dmOtherParticipant(List<dynamic>? ids, String me) {
  if (ids == null || ids.length != 2) return null;
  final a = ids[0];
  final b = ids[1];
  if (a is! String || b is! String) return null;
  if (a == me) return b;
  if (b == me) return a;
  return null;
}

/// Lists 1:1 threads from `dm_threads`.
class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(ExpansionAnalytics.log('messages_inbox_started', sourceScreen: 'messages_inbox'));
    });
  }

  @override
  Widget build(BuildContext context) {
    final me = FirebaseAuth.instance.currentUser?.uid;
    final dm = DmRepository();
    final users = UserProfileRepository();

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 16, 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Messages',
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Direct conversations. Message someone from their card anywhere in the app.',
                            style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                          ),
                        ],
                      ),
                    ),
                    // Matched-but-not-yet-talked people live here (beta ask:
                    // "where do I go to see the people I have matched with?").
                    IconButton(
                      icon: const Icon(Icons.favorite_outline_rounded, color: AppColors.mutedForeground),
                      tooltip: 'Matches',
                      onPressed: () {
                        unawaited(
                          ExpansionAnalytics.log(
                            'messages_matches_opened',
                            sourceScreen: 'messages_inbox',
                          ),
                        );
                        context.push('/matches');
                      },
                    ),
                    // Start a conversation with anyone by name (beta ask:
                    // "there should be a way to start new messages").
                    IconButton(
                      icon: const Icon(Icons.add_comment_outlined, color: AppColors.mutedForeground),
                      tooltip: 'New message',
                      onPressed: () => showNewMessageSheet(context),
                    ),
                  ],
                ),
              ),
            ),
            if (me == null)
              const SliverFillRemaining(
                child: Center(child: Text('Sign in to see messages.')),
              )
            else
              StreamBuilder<List<DocumentSnapshot<Map<String, dynamic>>>>(
                stream: dm.watchMyThreadDocs(),
                builder: (context, snap) {
                  if (snap.hasError) {
                    return SliverFillRemaining(
                      child: Center(child: Text('${snap.error}', textAlign: TextAlign.center)),
                    );
                  }
                  final docs = snap.data ?? [];
                  if (docs.isEmpty && snap.connectionState == ConnectionState.waiting) {
                    return const SliverFillRemaining(
                      child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                    );
                  }
                  if (docs.isEmpty) {
                    return const SliverFillRemaining(
                      child: Center(
                        child: Padding(
                          padding: EdgeInsets.all(24),
                          child: Text(
                            'No conversations yet.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.mutedForeground),
                          ),
                        ),
                      ),
                    );
                  }
                  return SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final d = docs[index];
                        final data = d.data();
                        final ids = data?['participant_ids'] as List<dynamic>?;
                        final other = _dmOtherParticipant(ids, me);
                        final preview = data?['last_preview'] as String? ?? '';
                        if (other == null) return const SizedBox.shrink();
                        // Option 2f's conversation row.
                        return Padding(
                          padding: const EdgeInsets.fromLTRB(
                            Cosmic.gutter,
                            0,
                            Cosmic.gutter,
                            12,
                          ),
                          child: FutureBuilder<String>(
                            future: users.getDisplayNameForUser(other),
                            builder: (context, nameSnap) {
                              final name = nameSnap.data ?? 'Member';
                              return CosmicPersonRow(
                                name: name,
                                preview: preview,
                                // The uid initial is a stable fallback while
                                // the display name is still resolving.
                                initials: (nameSnap.data ?? other).isNotEmpty
                                    ? (nameSnap.data ?? other)[0]
                                    : '?',
                                // The disc keeps its own target: the row opens
                                // the thread, the avatar opens the person.
                                onAvatarTap: () =>
                                    showUserProfileModal(context, userId: other),
                                onTap: () {
                                  unawaited(
                                    ExpansionAnalytics.log(
                                      'messages_thread_opened',
                                      entityId: other,
                                      sourceScreen: 'messages_inbox',
                                      attachmentType: 'dm',
                                    ),
                                  );
                                  context.push('/messages/direct/$other');
                                },
                              );
                            },
                          ),
                        );
                      },
                      childCount: docs.length,
                    ),
                  );
                },
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 80)),
          ],
        ),
      ),
    );
  }
}
