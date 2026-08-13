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
import '../widgets/expansion_compose_fab.dart';
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
      // Testers could only ever start a chat from somebody's card elsewhere in
      // the app — from the inbox itself there was no way to begin one.
      floatingActionButton: me == null
          ? null
          : ExpansionComposeFab(
              heroTag: 'compose-messages',
              onPressed: () => context.push('/messages/new'),
            ),
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 24, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Messages',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Direct conversations. Start a new one with the + button, '
                      'or message someone from their card anywhere in the app.',
                      style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
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
                    return SliverFillRemaining(
                      hasScrollBody: false,
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.forum_outlined,
                                  size: 40, color: AppColors.mutedForeground),
                              const SizedBox(height: 14),
                              const Text(
                                'No conversations yet',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Search for someone in the network and say hello.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: AppColors.mutedForeground, height: 1.4),
                              ),
                              const SizedBox(height: 18),
                              FilledButton.icon(
                                onPressed: () => context.push('/messages/new'),
                                icon: const Icon(Icons.edit_outlined, size: 18),
                                label: const Text('New message'),
                              ),
                            ],
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
