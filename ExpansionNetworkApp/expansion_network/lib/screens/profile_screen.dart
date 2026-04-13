import 'package:cached_network_image/cached_network_image.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/community_event.dart';
import '../profile/profile_edit_sections.dart';
import '../profile/profile_utils.dart';
import '../services/events_repository.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../utils/relative_time.dart';
import '../utils/staff_claims.dart';
import '../widgets/profile_section_card.dart';
import '../widgets/profile_user_blocks.dart';

/// Profile tab — `users/{uid}` fields grouped like onboarding (steps 1–7).
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authUser = FirebaseAuth.instance.currentUser;
    if (authUser == null) {
      return const Scaffold(
        body: Center(child: Text('Sign in to view your profile.')),
      );
    }

    final repo = UserProfileRepository();

    return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      stream: repo.watchUserDoc(authUser.uid),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Scaffold(
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Could not load profile.\n${snapshot.error}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.mutedForeground),
                ),
              ),
            ),
          );
        }
        if (!snapshot.hasData) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
          );
        }
        final doc = snapshot.data!;
        if (!doc.exists || doc.data() == null) {
          return Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('No profile document yet.'),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => context.go('/onboarding'),
                    child: const Text('Complete onboarding'),
                  ),
                ],
              ),
            ),
          );
        }

        final data = doc.data()!;
        return _ProfileBody(data: data, authUser: authUser);
      },
    );
  }
}

class _ProfileBody extends StatelessWidget {
  const _ProfileBody({required this.data, required this.authUser});

  final Map<String, dynamic> data;
  final User authUser;

  void _pushEdit(BuildContext context, String section) {
    context.push('/profile/edit?section=$section');
  }

  @override
  Widget build(BuildContext context) {
    final name = profileDisplayName(data);
    final subtitle = profileCohortSubtitle(data);
    final email = profileString(data['email']) ?? authUser.email ?? '';
    final photoUrl = profileString(data['photo_url']);
    final initials = profileInitials(data);

    final goals = profileStringList(data['business_goals']);
    final confident = profileStringList(data['confident_skills']);
    final desired = profileStringList(data['desired_skills']);
    final tribe = profileString(data['tribe']) ?? profileString(data['industry']);
    final businessLogoUrl = profileString(data['business_logo_url']);

    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 8, 0),
              child: Row(
                children: [
                  Text(
                    'Profile',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () async {
                      await FirebaseAuth.instance.signOut();
                      if (context.mounted) context.go('/');
                    },
                    child: const Text('Sign out'),
                  ),
                  IconButton(
                    onPressed: () => context.push('/profile/edit'),
                    icon: const Icon(Icons.edit_outlined, color: AppColors.mutedForeground),
                    tooltip: 'Edit all sections',
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
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
                                  Text(
                                    name,
                                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w500),
                                  ),
                                  if (subtitle != null) ...[
                                    const SizedBox(height: 4),
                                    Text(subtitle, style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
                                  ],
                                  if (businessLogoUrl != null) ...[
                                    const SizedBox(height: 10),
                                    Row(
                                      children: [
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(8),
                                          child: CachedNetworkImage(
                                            imageUrl: businessLogoUrl,
                                            width: 40,
                                            height: 40,
                                            fit: BoxFit.cover,
                                            placeholder: (_, __) => Container(
                                              width: 40,
                                              height: 40,
                                              color: AppColors.secondary,
                                            ),
                                            errorWidget: (_, __, ___) => const SizedBox.shrink(),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        const Text(
                                          'Business logo',
                                          style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                                        ),
                                      ],
                                    ),
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
                        if (_featuredBadgeLine(data) != null) ...[
                          const SizedBox(height: 10),
                          Text(
                            _featuredBadgeLine(data)!,
                            style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                          ),
                        ],
                        const SizedBox(height: 8),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: TextButton(
                            onPressed: () => context.push('/profile/achievements'),
                            child: const Text('View achievements'),
                          ),
                        ),
                        FutureBuilder<bool>(
                          future: currentUserHasStaffClaim(),
                          builder: (context, staffSnap) {
                            if (staffSnap.data != true) return const SizedBox.shrink();
                            return Align(
                              alignment: Alignment.centerLeft,
                              child: TextButton(
                                onPressed: () => context.push('/admin/reports'),
                                child: const Text('Staff: user reports'),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: Divider(color: AppColors.border)),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      ProfileSectionCard(
                        step: 1,
                        title: 'Identity & location',
                        onEdit: () => _pushEdit(context, ProfileEditSections.identity),
                        child: ProfileIdentitySection(
                          data: data,
                          email: email,
                          showEmail: true,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ProfileSectionCard(
                        step: 2,
                        title: 'Business goals',
                        onEdit: () => _pushEdit(context, ProfileEditSections.goals),
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
                        onEdit: () => _pushEdit(context, ProfileEditSections.skillsConfident),
                        child: confident.isEmpty
                            ? const Text(
                                'None selected.',
                                style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                              )
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
                        onEdit: () => _pushEdit(context, ProfileEditSections.skillsDesired),
                        child: desired.isEmpty
                            ? const Text(
                                'None selected.',
                                style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                              )
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
                        title: 'Tribe',
                        onEdit: () => _pushEdit(context, ProfileEditSections.industry),
                        child: Text(
                          tribe ?? '—',
                          style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                        ),
                      ),
                      const SizedBox(height: 16),
                      ProfileSectionCard(
                        step: 6,
                        title: 'Ideal work structure',
                        onEdit: () => _pushEdit(context, ProfileEditSections.work),
                        child: profileWorkStructureRows(data),
                      ),
                      const SizedBox(height: 16),
                      ProfileSectionCard(
                        step: 7,
                        title: 'Profile links',
                        onEdit: () => _pushEdit(context, ProfileEditSections.links),
                        child: ProfileLinksSection(data: data),
                      ),
                      const SizedBox(height: 16),
                      _ProfileSubmittedEventsSection(uid: authUser.uid),
                      const SizedBox(height: 16),
                      ProfileAchievementsCard(data: data),
                      const SizedBox(height: 16),
                      const ProfileCertificatesPlaceholderCard(),
                    ]),
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

class _ProfileSubmittedEventsSection extends StatelessWidget {
  const _ProfileSubmittedEventsSection({required this.uid});

  final String uid;

  @override
  Widget build(BuildContext context) {
    final repo = EventsRepository();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Events you submitted',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          const Text(
            'Status only — reviews are done in Digital Curriculum.',
            style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
          ),
          const SizedBox(height: 12),
          StreamBuilder<List<CommunityEvent>>(
            stream: repo.watchEventsCreatedBy(uid),
            builder: (context, snap) {
              if (snap.hasError) {
                return Text(
                  'Could not load events.\n${snap.error}',
                  style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                );
              }
              final list = snap.data ?? [];
              if (list.isEmpty) {
                return const Text(
                  'No events submitted from the app yet.',
                  style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                );
              }
              return Column(
                children: [
                  for (final e in list.take(12))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  e.title,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  [
                                    e.memberSubmissionStatusLabel,
                                    if (e.isPublished && e.date != null) formatEventDate(e.date),
                                    if (e.createdAt != null) 'Submitted ${formatRelativeTime(e.createdAt!)}',
                                  ].where((s) => s.isNotEmpty).join(' · '),
                                  style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: () => context.push('/events/${e.id}'),
                            child: const Text('View'),
                          ),
                        ],
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

String? _featuredBadgeLine(Map<String, dynamic> data) {
  final b = data['badges'];
  if (b is! Map) return null;
  final id = b['featured_badge_id'];
  if (id is String && id.isNotEmpty) {
    return 'Featured badge: $id';
  }
  return null;
}
