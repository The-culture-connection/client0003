import 'package:cached_network_image/cached_network_image.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/community_event.dart';
import '../models/explore_job.dart';
import '../models/explore_skill_listing.dart';
import '../profile/profile_utils.dart';
import '../services/events_repository.dart';
import '../services/explore_listings_repository.dart';
import '../services/user_profile_repository.dart';
import '../services/user_reports_repository.dart';
import '../theme/app_theme.dart';
import '../utils/relative_time.dart';
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

/// Dialog owns its [TextEditingController] so dispose order matches Flutter’s widget tree
/// (avoids `_dependents.isEmpty` / controller races when popping the route).
class _ReportMemberDialog extends StatefulWidget {
  const _ReportMemberDialog();

  @override
  State<_ReportMemberDialog> createState() => _ReportMemberDialogState();
}

class _ReportMemberDialogState extends State<_ReportMemberDialog> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final r = _controller.text.trim();
    if (r.isEmpty) {
      setState(() => _error = 'Please describe what we should review.');
      return;
    }
    if (r.length > 4000) {
      setState(() => _error = 'Please shorten your report (max 4000 characters).');
      return;
    }
    setState(() => _error = null);
    Navigator.of(context).pop<String>(r);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Report member'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _controller,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'What should we review?',
                hintText: 'Describe the issue…',
                alignLabelWithHint: true,
              ),
              onChanged: (_) {
                if (_error != null) setState(() => _error = null);
              },
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop<String?>(),
          child: const Text('Cancel'),
        ),
        FilledButton(onPressed: _submit, child: const Text('Submit')),
      ],
    );
  }
}

Future<void> _openReportFlow(
  BuildContext context, {
  required String reportedUserId,
}) async {
  final reason = await showDialog<String?>(
    context: context,
    useRootNavigator: true,
    builder: (ctx) => const _ReportMemberDialog(),
  );
  if (reason == null || reason.isEmpty) return;
  try {
    await UserReportsRepository().submitReport(reportedUserId: reportedUserId, reason: reason);
    if (!context.mounted) return;
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      const SnackBar(content: Text('Thanks — our team will review.')),
    );
  } catch (e) {
    if (!context.mounted) return;
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text('$e')));
  }
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
        final tribe = profileString(data['tribe']) ?? profileString(data['industry']);
        final businessLogoUrl = profileString(data['business_logo_url']);

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
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton.icon(
                          onPressed: () => _openReportFlow(context, reportedUserId: userId),
                          icon: const Icon(Icons.flag_outlined, size: 18),
                          label: const Text('Report'),
                          style: TextButton.styleFrom(foregroundColor: AppColors.mutedForeground),
                        ),
                        const SizedBox(width: 8),
                        FilledButton.icon(
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
                      ],
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
                            if (businessLogoUrl != null) ...[
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: CachedNetworkImage(
                                      imageUrl: businessLogoUrl,
                                      width: 44,
                                      height: 44,
                                      fit: BoxFit.cover,
                                      placeholder: (_, __) => Container(
                                        width: 44,
                                        height: 44,
                                        color: AppColors.secondary,
                                      ),
                                      errorWidget: (_, __, ___) => const SizedBox.shrink(),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
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
                    title: 'Tribe',
                    child: Text(
                      tribe ?? '—',
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
                  _ProfileModalListings(userId: userId),
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

class _ProfileModalListings extends StatelessWidget {
  const _ProfileModalListings({required this.userId});

  final String userId;

  @override
  Widget build(BuildContext context) {
    final listings = ExploreListingsRepository();
    final eventsRepo = EventsRepository();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        StreamBuilder<List<ExploreJob>>(
          stream: listings.watchJobsByAuthor(userId),
          builder: (context, snap) {
            if (snap.hasError) {
              return _listingCard(
                title: 'Posted jobs',
                child: Text(
                  'Could not load jobs.\n${snap.error}',
                  style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                ),
              );
            }
            final jobs = snap.data ?? [];
            return _listingCard(
              title: 'Posted jobs',
              child: jobs.isEmpty
                  ? const Text('No job posts yet.', style: TextStyle(fontSize: 13, color: AppColors.mutedForeground))
                  : Column(
                      children: [
                        for (final j in jobs.take(8))
                          ListTile(
                            dense: true,
                            contentPadding: EdgeInsets.zero,
                            title: Text(j.title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                            subtitle: Text(
                              [
                                if (j.skillsSeeking.isNotEmpty) 'Seeking: ${j.skillsSeeking.join(' · ')}',
                                if (j.createdAt != null) formatRelativeTime(j.createdAt!),
                              ].where((e) => e.isNotEmpty).join(' · '),
                              style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                            ),
                            trailing: const Icon(Icons.chevron_right, size: 18),
                            onTap: () {
                              Navigator.pop(context);
                              context.push('/explore');
                            },
                          ),
                      ],
                    ),
            );
          },
        ),
        const SizedBox(height: 12),
        StreamBuilder<List<ExploreSkillListing>>(
          stream: listings.watchSkillListingsByAuthor(userId),
          builder: (context, snap) {
            if (snap.hasError) {
              return _listingCard(
                title: 'Skill listings',
                child: Text(
                  'Could not load skill listings.\n${snap.error}',
                  style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                ),
              );
            }
            final skills = snap.data ?? [];
            return _listingCard(
              title: 'Skill listings',
              child: skills.isEmpty
                  ? const Text('No skill listings yet.', style: TextStyle(fontSize: 13, color: AppColors.mutedForeground))
                  : Column(
                      children: [
                        for (final s in skills.take(8))
                          ListTile(
                            dense: true,
                            contentPadding: EdgeInsets.zero,
                            title: Text(s.title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                            subtitle: Text(
                              [
                                if (s.skillsOffering.isNotEmpty) 'Offering: ${s.skillsOffering.join(' · ')}',
                                if (s.createdAt != null) formatRelativeTime(s.createdAt!),
                              ].where((e) => e.isNotEmpty).join(' · '),
                              style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                            ),
                            trailing: const Icon(Icons.chevron_right, size: 18),
                            onTap: () {
                              Navigator.pop(context);
                              context.push('/explore/skills');
                            },
                          ),
                      ],
                    ),
            );
          },
        ),
        const SizedBox(height: 12),
        StreamBuilder<User?>(
          stream: FirebaseAuth.instance.authStateChanges(),
          initialData: FirebaseAuth.instance.currentUser,
          builder: (context, authSnap) {
            final me = authSnap.data?.uid;
            return StreamBuilder<List<CommunityEvent>>(
              stream: eventsRepo.watchEventsCreatedBy(userId),
              builder: (context, evSnap) {
                if (evSnap.hasError) {
                  return _listingCard(
                    title: 'Events',
                    child: Text(
                      'Could not load events.\n${evSnap.error}',
                      style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                    ),
                  );
                }
                final all = evSnap.data ?? [];
                final visible = all.where((e) => me == userId || e.isPublished).toList();
                return _listingCard(
                  title: 'Events',
                  child: visible.isEmpty
                      ? const Text('No events created.', style: TextStyle(fontSize: 13, color: AppColors.mutedForeground))
                      : Column(
                          children: [
                            for (final e in visible.take(8))
                              ListTile(
                                dense: true,
                                contentPadding: EdgeInsets.zero,
                                title: Text(e.title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                                subtitle: Text(
                                  [
                                    e.memberSubmissionStatusLabel,
                                    if (e.isPublished && e.date != null) formatEventDate(e.date),
                                  ].where((s) => s.isNotEmpty).join(' · '),
                                  style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                                ),
                                trailing: const Icon(Icons.chevron_right, size: 18),
                                onTap: () {
                                  Navigator.pop(context);
                                  context.push('/events/${e.id}');
                                },
                              ),
                          ],
                        ),
                );
              },
            );
          },
        ),
      ],
    );
  }

  Widget _listingCard({required String title, required Widget child}) {
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
          Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}
