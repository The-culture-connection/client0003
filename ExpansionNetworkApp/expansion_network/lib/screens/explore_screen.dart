import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/explore_job.dart';
import '../models/explore_skill_listing.dart';
import '../services/explore_listings_repository.dart';
import '../theme/app_theme.dart';
import '../utils/relative_time.dart';
import '../widgets/page_header.dart';
import '../widgets/poster_profile_avatar.dart';
import '../widgets/user_profile_modal.dart';

/// Discover jobs (Firestore), skills (Firestore + sub-page), and sample connection matches.
class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

enum _ExploreFilter { all, jobs, skills, connections }

class _ExploreScreenState extends State<ExploreScreen> {
  _ExploreFilter _filter = _ExploreFilter.all;
  final _repo = ExploreListingsRepository();

  static const _connections = <_Conn>[
    _Conn('maria-garcia', 'Connect with Maria Garcia', 'Marketing Director • Class of 2022', 'New York, NY', '1w ago', 88),
    _Conn('james-wilson', 'Connect with James Wilson', 'Tech Entrepreneur • Class of 2021', 'Austin, TX', '2w ago', 76),
  ];

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;

    return Scaffold(
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 72),
        child: FloatingActionButton(
          onPressed: () => _openPostMenu(context),
          child: const Icon(Icons.add),
        ),
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: PageHeader(
              title: 'Explore',
              subtitle: 'Jobs, skills, and connections',
              trailing: IconButton(
                icon: const Icon(Icons.notifications_outlined, color: AppColors.foreground),
                onPressed: () => context.push('/messages'),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverToBoxAdapter(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  minimumSize: const Size.fromHeight(52),
                ),
                onPressed: () => context.push('/matching'),
                icon: const Icon(Icons.auto_awesome),
                label: const Text('Run Matching Algorithm'),
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 12)),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  _FilterChip(
                    label: 'All',
                    selected: _filter == _ExploreFilter.all,
                    onTap: () => setState(() => _filter = _ExploreFilter.all),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Jobs',
                    selected: _filter == _ExploreFilter.jobs,
                    onTap: () => setState(() => _filter = _ExploreFilter.jobs),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Skills',
                    selected: _filter == _ExploreFilter.skills,
                    onTap: () => setState(() => _filter = _ExploreFilter.skills),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Connections',
                    selected: _filter == _ExploreFilter.connections,
                    onTap: () => setState(() => _filter = _ExploreFilter.connections),
                  ),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 12)),
          StreamBuilder<List<ExploreJob>>(
            stream: _repo.watchJobs(),
            builder: (context, jobSnap) {
              return StreamBuilder<List<ExploreSkillListing>>(
                stream: _repo.watchSkillListings(),
                builder: (context, skillSnap) {
                  if (jobSnap.hasError || skillSnap.hasError) {
                    return SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          '${jobSnap.error ?? skillSnap.error}',
                          style: const TextStyle(color: AppColors.mutedForeground),
                        ),
                      ),
                    );
                  }
                  final jobs = jobSnap.data ?? [];
                  final skills = skillSnap.data ?? [];
                  final showJobs = _filter == _ExploreFilter.all || _filter == _ExploreFilter.jobs;
                  final showSkills = _filter == _ExploreFilter.all || _filter == _ExploreFilter.skills;
                  final showConn = _filter == _ExploreFilter.all || _filter == _ExploreFilter.connections;

                  final children = <Widget>[];

                  if (showJobs) {
                    if (jobs.isEmpty && jobSnap.connectionState == ConnectionState.waiting) {
                      children.add(const Center(child: Padding(
                        padding: EdgeInsets.all(24),
                        child: CircularProgressIndicator(color: AppColors.primary),
                      )));
                    } else if (jobs.isEmpty && _filter == _ExploreFilter.jobs) {
                      children.add(const Padding(
                        padding: EdgeInsets.all(24),
                        child: Text('No jobs yet. Tap + to post one.', style: TextStyle(color: AppColors.mutedForeground)),
                      ));
                    } else {
                      for (final j in jobs) {
                        children.add(
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _JobCard(job: j, currentUid: uid),
                          ),
                        );
                      }
                    }
                  }

                  if (showSkills) {
                    if (skills.isEmpty && skillSnap.connectionState == ConnectionState.waiting) {
                      children.add(const SizedBox.shrink());
                    } else if (skills.isEmpty && _filter == _ExploreFilter.skills) {
                      children.add(const Padding(
                        padding: EdgeInsets.all(24),
                        child: Text(
                          'No skills on this feed. Open Skills hub for the full list.',
                          style: TextStyle(color: AppColors.mutedForeground),
                        ),
                      ));
                    } else {
                      for (final s in skills) {
                        children.add(
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _ExploreSkillRow(listing: s, currentUid: uid),
                          ),
                        );
                      }
                    }
                  }

                  if (showConn) {
                    for (final c in _connections) {
                      children.add(
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _ConnectionCard(conn: c),
                        ),
                      );
                    }
                  }

                  if (children.isEmpty) {
                    children.add(
                      const Padding(
                        padding: EdgeInsets.all(32),
                        child: Text(
                          'Nothing in this filter yet.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppColors.mutedForeground),
                        ),
                      ),
                    );
                  }

                  return SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, i) => children[i],
                        childCount: children.length,
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  void _openPostMenu(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.work_outline, color: AppColors.primary),
              title: const Text('Post a job'),
              onTap: () {
                Navigator.pop(ctx);
                context.push('/explore/jobs/create');
              },
            ),
            ListTile(
              leading: const Icon(Icons.psychology_outlined, color: AppColors.primary),
              title: const Text('Offer a skill'),
              onTap: () {
                Navigator.pop(ctx);
                context.push('/explore/skills/create');
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.primary : AppColors.secondary,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: selected ? AppColors.onPrimary : AppColors.mutedForeground,
              fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }
}

class _JobCard extends StatelessWidget {
  const _JobCard({required this.job, required this.currentUid});

  final ExploreJob job;
  final String? currentUid;

  @override
  Widget build(BuildContext context) {
    final isSelf = currentUid != null && job.authorId == currentUid;
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
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              PosterProfileAvatar(userId: job.authorId, displayNameHint: job.authorName, radius: 22),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.work_outline, color: AppColors.primary, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(job.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                    const SizedBox(height: 4),
                    if (job.skillsSeeking.isNotEmpty) ...[
                      Text(
                        'Skills seeking: ${job.skillsSeeking.join(' · ')}',
                        style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 4),
                    ],
                    Text(
                      [
                        if (job.industry != null && job.industry!.isNotEmpty) job.industry!,
                        if (job.company != null && job.company!.isNotEmpty) job.company!,
                        if (job.location != null && job.location!.isNotEmpty) job.location!,
                      ].join(' · '),
                      style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                    ),
                    if (job.description != null && job.description!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        job.description!,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        if (job.authorName != null)
                          GestureDetector(
                            onTap: job.authorId.isEmpty ? null : () => showUserProfileModal(context, userId: job.authorId),
                            child: Text(
                              job.authorName!,
                              style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w500),
                            ),
                          ),
                        if (job.createdAt != null) ...[
                          const Text(' · ', style: TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                          Text(
                            formatRelativeTime(job.createdAt!),
                            style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              if (!isSelf)
                OutlinedButton.icon(
                  onPressed: job.authorId.isEmpty
                      ? null
                      : () => context.push('/messages/direct/${job.authorId}?attach=job&id=${job.id}'),
                  icon: const Icon(Icons.chat_bubble_outline, size: 18),
                  label: const Text('Message'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ExploreSkillRow extends StatelessWidget {
  const _ExploreSkillRow({required this.listing, required this.currentUid});

  final ExploreSkillListing listing;
  final String? currentUid;

  @override
  Widget build(BuildContext context) {
    final isSelf = currentUid != null && listing.authorId == currentUid;
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
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              PosterProfileAvatar(userId: listing.authorId, displayNameHint: listing.authorName, radius: 22),
              const SizedBox(width: 10),
              const Icon(Icons.psychology_outlined, color: AppColors.primary, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(listing.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                    const SizedBox(height: 4),
                    if (listing.skillsOffering.isNotEmpty) ...[
                      Text(
                        'Skills offering: ${listing.skillsOffering.join(' · ')}',
                        style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 4),
                    ],
                    Text(
                      [
                        if (listing.industry != null && listing.industry!.isNotEmpty) listing.industry!,
                        if (listing.location != null && listing.location!.isNotEmpty) listing.location!,
                      ].join(' · '),
                      style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (listing.summary != null && listing.summary!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              listing.summary!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              if (!isSelf)
                OutlinedButton.icon(
                  onPressed: listing.authorId.isEmpty
                      ? null
                      : () => context.push(
                            '/messages/direct/${listing.authorId}?attach=skill&id=${listing.id}',
                          ),
                  icon: const Icon(Icons.chat_bubble_outline, size: 18),
                  label: const Text('Message'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Conn {
  const _Conn(this.userId, this.title, this.subtitle, this.location, this.posted, this.match);
  final String userId;
  final String title;
  final String subtitle;
  final String location;
  final String posted;
  final int match;
}

class _ConnectionCard extends StatelessWidget {
  const _ConnectionCard({required this.conn});

  final _Conn conn;

  @override
  Widget build(BuildContext context) {
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
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.people_outline, color: AppColors.primary, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(conn.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                    const SizedBox(height: 4),
                    Text(conn.subtitle, style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.place_outlined, size: 12, color: AppColors.mutedForeground),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            conn.location,
                            style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(' • ${conn.posted}', style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 24),
          Row(
            children: [
              const Icon(Icons.trending_up, size: 18, color: AppColors.primary),
              const SizedBox(width: 6),
              Text(
                '${conn.match}% match',
                style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600),
              ),
              const Spacer(),
              OutlinedButton(
                onPressed: () => context.push('/messages/direct/${conn.userId}'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.foreground,
                  side: const BorderSide(color: AppColors.border),
                ),
                child: const Icon(Icons.chat_bubble_outline, size: 18),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: () {},
                style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                child: const Text('Connect'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
