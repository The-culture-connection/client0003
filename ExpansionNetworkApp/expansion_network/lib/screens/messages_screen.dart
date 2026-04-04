import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../services/dm_repository.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/user_profile_modal.dart';

/// Lists 1:1 threads from `dm_threads`.
class MessagesScreen extends StatelessWidget {
  const MessagesScreen({super.key});

  String? _otherParticipant(List<dynamic>? ids, String me) {
    if (ids == null || ids.length != 2) return null;
    final a = ids[0];
    final b = ids[1];
    if (a is! String || b is! String) return null;
    if (a == me) return b;
    if (b == me) return a;
    return null;
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
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Messages',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Direct conversations. Open Explore to message someone from a job or skill card.',
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
                        final other = _otherParticipant(ids, me);
                        final preview = data?['last_preview'] as String? ?? '';
                        if (other == null) return const SizedBox.shrink();
                        return Material(
                          color: AppColors.background,
                          child: InkWell(
                            onTap: () => context.push('/messages/direct/$other'),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  InkWell(
                                    onTap: () => showUserProfileModal(context, userId: other),
                                    customBorder: const CircleBorder(),
                                    child: CircleAvatar(
                                      backgroundColor: AppColors.primary,
                                      child: Text(
                                        other.isNotEmpty ? other.substring(0, 1).toUpperCase() : '?',
                                        style: const TextStyle(color: AppColors.onPrimary, fontSize: 14, fontWeight: FontWeight.w600),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: FutureBuilder<String>(
                                      future: users.getDisplayNameForUser(other),
                                      builder: (context, nameSnap) {
                                        return Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              nameSnap.data ?? 'Member',
                                              style: const TextStyle(fontWeight: FontWeight.w500),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              preview,
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                                            ),
                                          ],
                                        );
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            ),
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
