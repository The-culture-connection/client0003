import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../profile/profile_utils.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import 'profile_section_card.dart';
import 'profile_user_blocks.dart';

/// Read-only profile sheet matching the Profile tab layout (no edit actions).
Future<void> showUserProfileModal(
  BuildContext context, {
  required String userId,
}) async {
  if (userId.isEmpty) return;
  await showModalBottomSheet<void>(
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
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) {
          return _UserProfileModalBody(
            userId: userId,
            scrollController: scrollController,
          );
        },
      );
    },
  );
}

class _UserProfileModalBody extends StatelessWidget {
  const _UserProfileModalBody({
    required this.userId,
    required this.scrollController,
  });

  final String userId;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context) {
    final repo = UserProfileRepository();

    return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      stream: repo.watchUserDoc(userId),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Padding(
            padding: const EdgeInsets.all(24),
            child: Text('Could not load profile.\n${snapshot.error}', style: const TextStyle(color: AppColors.mutedForeground)),
          );
        }
        if (!snapshot.hasData) {
          return const Padding(
            padding: EdgeInsets.all(48),
            child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
          );
        }
        final doc = snapshot.data!;
        if (!doc.exists || doc.data() == null) {
          return const Padding(
            padding: EdgeInsets.all(24),
            child: Text('No profile for this member yet.', style: TextStyle(color: AppColors.mutedForeground)),
          );
        }

        final data = doc.data()!;
        final name = profileDisplayName(data);
        final subtitle = profileCohortSubtitle(data);
        final email = profileString(data['email']) ?? '';
        final photoUrl = profileString(data['photo_url']);
        final initials = profileInitials(data);

        final goals = profileStringList(data['business_goals']);
        final confident = profileStringList(data['confident_skills']);
        final desired = profileStringList(data['desired_skills']);
        final industry = profileString(data['industry']);

        return StreamBuilder<User?>(
          stream: FirebaseAuth.instance.authStateChanges(),
          initialData: FirebaseAuth.instance.currentUser,
          builder: (context, authSnap) {
            final me = authSnap.data?.uid;
            final showEmail = me != null && me == userId;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                      Expanded(
                        child: Text(
                          'Profile',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
                if (me != null && userId.isNotEmpty && userId != me)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton.icon(
                        onPressed: () {
                          Navigator.of(context).pop();
                          context.push('/messages/direct/$userId');
                        },
                        icon: const Icon(Icons.chat_bubble_outline, size: 18),
                        label: const Text('Message'),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: AppColors.onPrimary,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        ),
                      ),
                    ),
                  ),
                const Divider(height: 1, color: AppColors.border),
                Expanded(
                  child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                    children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ProfileAvatar(photoUrl: photoUrl, initials: initials),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w500)),
                            if (subtitle != null) ...[
                              const SizedBox(height: 4),
                              Text(subtitle, style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: profileRoleAndBadgeChips(data),
                  ),
                  const Divider(height: 32, color: AppColors.border),
                  ProfileSectionCard(
                    step: 1,
                    title: 'Identity & location',
                    child: ProfileIdentitySection(data: data, email: email, showEmail: showEmail),
                  ),
                  const SizedBox(height: 16),
                  ProfileSectionCard(
                    step: 2,
                    title: 'Business goals',
                    child: goals.isEmpty
                        ? const Text(
                            'No goals selected yet.',
                            style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                          )
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              for (final g in goals)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 6),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('• ', style: TextStyle(color: AppColors.mutedForeground)),
                                      Expanded(
                                        child: Text(g, style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground, height: 1.35)),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                  ),
                  const SizedBox(height: 16),
                  ProfileSectionCard(
                    step: 3,
                    title: 'Skills you’re confident in',
                    child: confident.isEmpty
                        ? const Text('None selected.', style: TextStyle(fontSize: 13, color: AppColors.mutedForeground))
                        : Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              for (final s in confident)
                                Chip(
                                  label: Text(s, style: const TextStyle(fontSize: 13)),
                                  backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                                  side: BorderSide.none,
                                  padding: const EdgeInsets.symmetric(horizontal: 4),
                                ),
                            ],
                          ),
                  ),
                  const SizedBox(height: 16),
                  ProfileSectionCard(
                    step: 4,
                    title: 'Skills you want to acquire',
                    child: desired.isEmpty
                        ? const Text('None selected.', style: TextStyle(fontSize: 13, color: AppColors.mutedForeground))
                        : Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              for (final s in desired)
                                Chip(
                                  label: Text(s, style: const TextStyle(fontSize: 13)),
                                  backgroundColor: AppColors.secondary,
                                  side: const BorderSide(color: AppColors.border),
                                  padding: const EdgeInsets.symmetric(horizontal: 4),
                                ),
                            ],
                          ),
                  ),
                  const SizedBox(height: 16),
                  ProfileSectionCard(
                    step: 5,
                    title: 'Industry',
                    child: Text(
                      industry ?? '—',
                      style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                    ),
                  ),
                  const SizedBox(height: 16),
                  ProfileSectionCard(
                    step: 6,
                    title: 'Ideal work structure',
                    child: profileWorkStructureRows(data),
                  ),
                  const SizedBox(height: 16),
                  ProfileSectionCard(
                    step: 7,
                    title: 'Profile links',
                    child: ProfileLinksSection(data: data),
                  ),
                  const SizedBox(height: 16),
                  ProfileAchievementsCard(data: data),
                  const SizedBox(height: 16),
                  const ProfileCertificatesPlaceholderCard(),
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
}
