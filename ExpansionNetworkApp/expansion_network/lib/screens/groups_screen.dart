import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/group_thread_firestore.dart';
import '../services/group_thread_repository.dart';
import '../theme/app_theme.dart';
import '../utils/content_action_guard.dart';
import '../widgets/page_header.dart';

/// Groups discovery: subreddit-style communities in `groups_mobile`, then threads inside each group.
/// Layout: **Your groups** → **Featured communities** → **Explore** (everyone else).
class GroupsScreen extends StatefulWidget {
  const GroupsScreen({super.key});

  @override
  State<GroupsScreen> createState() => _GroupsScreenState();
}

class _GroupsScreenState extends State<GroupsScreen> {
  final _repo = GroupThreadRepository();
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<FsGroup> _filter(List<FsGroup> all, String q) {
    if (q.trim().isEmpty) return all;
    final s = q.trim().toLowerCase();
    return all.where((g) {
      return g.name.toLowerCase().contains(s) ||
          (g.category ?? '').toLowerCase().contains(s) ||
          (g.description ?? '').toLowerCase().contains(s);
    }).toList();
  }

  /// Featured strip = top two communities by recent activity (not `isFeatured` flags).
  List<FsGroup> _topTwoByActivity(List<FsGroup> source) {
    if (source.isEmpty) return [];
    final copy = List<FsGroup>.from(source);
    copy.sort((a, b) {
      final ta = a.lastActivityAt;
      final tb = b.lastActivityAt;
      if (ta != null && tb != null) {
        final c = tb.compareTo(ta);
        if (c != 0) return c;
      } else if (ta != null) {
        return -1;
      } else if (tb != null) {
        return 1;
      }
      final tr = (b.threadCount ?? 0).compareTo(a.threadCount ?? 0);
      if (tr != 0) return tr;
      return b.memberCount.compareTo(a.memberCount);
    });
    return copy.take(2).toList();
  }

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;

    return Scaffold(
      body: StreamBuilder<List<FsGroup>>(
        stream: _repo.watchGroups(),
        builder: (context, snap) {
          if (snap.hasError) {
            return Center(child: Text('Could not load groups.\n${snap.error}', textAlign: TextAlign.center));
          }
          final all = snap.data ?? [];
          final filtered = _filter(all, _search.text);
          final yours = filtered.where((g) => g.isMember(uid)).toList();
          final featured = _topTwoByActivity(filtered);
          // Explore: groups you have not joined (all other discoverable communities).
          final explore = filtered.where((g) => !g.isMember(uid)).toList();

          return CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: PageHeader(
                  title: 'Groups',
                  subtitle: 'Communities like subreddits — posts inside each group are threads. Featured shows the two most active groups.',
                  trailing: IconButton(
                    tooltip: 'Create community',
                    onPressed: () async {
                      if (await blockContentActionIfSuspended(context)) return;
                      if (context.mounted) context.push('/groups/create');
                    },
                    icon: const Icon(Icons.add_circle_outline, color: AppColors.primary),
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                sliver: SliverToBoxAdapter(
                  child: TextField(
                    controller: _search,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      hintText: 'Search groups…',
                      prefixIcon: const Icon(Icons.search, color: AppColors.mutedForeground),
                      filled: true,
                      fillColor: AppColors.inputBackground,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                    ),
                  ),
                ),
              ),
              if (snap.connectionState == ConnectionState.waiting && all.isEmpty)
                const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                )
              else ...[
                // --- Your groups ---
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    child: Text(
                      'Your groups',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.foreground,
                          ),
                    ),
                  ),
                ),
                if (yours.isEmpty)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        uid == null
                            ? 'Sign in to join communities.'
                            : 'You have not joined any yet. Explore below or create one with +.',
                        style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13),
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, i) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _GroupListCard(group: yours[i], uid: uid, joined: true),
                        ),
                        childCount: yours.length,
                      ),
                    ),
                  ),

                // --- Featured communities ---
                if (featured.isNotEmpty) ...[
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Row(
                        children: [
                          Icon(Icons.star_rounded, color: AppColors.primary, size: 22),
                          const SizedBox(width: 8),
                          Text(
                            'Featured communities',
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.foreground,
                                ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 176,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                        itemCount: featured.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 12),
                        itemBuilder: (context, i) => _FeaturedCard(group: featured[i], uid: uid),
                      ),
                    ),
                  ),
                ],

                // --- Explore ---
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: Text(
                      'Explore',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.foreground,
                          ),
                    ),
                  ),
                ),
                if (explore.isEmpty)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                      child: Text(
                        filtered.isEmpty ? 'No communities match your search.' : 'You’re in every community here.',
                        style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13),
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, i) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _GroupListCard(group: explore[i], uid: uid, joined: false),
                        ),
                        childCount: explore.length,
                      ),
                    ),
                  ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _FeaturedCard extends StatelessWidget {
  const _FeaturedCard({required this.group, required this.uid});

  final FsGroup group;
  final String? uid;

  @override
  Widget build(BuildContext context) {
    final joined = group.isMember(uid);
    final threads = group.threadCount;
    return InkWell(
      onTap: () => context.push('/groups/${group.id}'),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: 228,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.groups_rounded, color: AppColors.primary, size: 22),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              group.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                            ),
                          ),
                          if (group.looksActiveRecently)
                            Container(
                              margin: const EdgeInsets.only(left: 4),
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.fiber_manual_record, size: 8, color: AppColors.primary),
                                  const SizedBox(width: 4),
                                  const Text('Active', style: TextStyle(fontSize: 10, color: AppColors.primary)),
                                ],
                              ),
                            ),
                        ],
                      ),
                      if (group.category != null && group.category!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          group.category!,
                          style: const TextStyle(fontSize: 11, color: AppColors.primary),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            const Spacer(),
            Row(
              children: [
                const Icon(Icons.people_outline, size: 14, color: AppColors.mutedForeground),
                Text(' ${group.memberCount}', style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                const SizedBox(width: 12),
                const Icon(Icons.forum_outlined, size: 14, color: AppColors.mutedForeground),
                Text(
                  threads != null ? ' $threads' : ' —',
                  style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                ),
              ],
            ),
            if (group.lastActivitySnippet != null && group.lastActivitySnippet!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                group.lastActivitySnippet!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 10, color: AppColors.mutedForeground, height: 1.25),
              ),
            ],
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                joined
                    ? 'View'
                    : group.isPrivateCommunity
                        ? 'Private'
                        : 'Join',
                style: TextStyle(
                  fontSize: 12,
                  color: group.isPrivateCommunity && !joined
                      ? AppColors.mutedForeground
                      : AppColors.primary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GroupListCard extends StatelessWidget {
  const _GroupListCard({required this.group, required this.uid, required this.joined});

  final FsGroup group;
  final String? uid;
  final bool joined;

  @override
  Widget build(BuildContext context) {
    final threads = group.threadCount;
    return InkWell(
      onTap: () => context.push('/groups/${group.id}'),
      borderRadius: BorderRadius.circular(12),
      child: Container(
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
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    group.name.isNotEmpty ? group.name[0].toUpperCase() : '?',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        group.name,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                      ),
                      if (group.category != null && group.category!.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            group.category!,
                            style: const TextStyle(fontSize: 11, color: AppColors.primary),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (joined)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('Joined', style: TextStyle(fontSize: 11, color: AppColors.onPrimary)),
                  )
                else if (group.isPrivateCommunity)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.secondary,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Text(
                      'Private',
                      style: TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                    ),
                  ),
                const Icon(Icons.chevron_right, color: AppColors.mutedForeground),
              ],
            ),
            if (group.lastActivitySnippet != null && group.lastActivitySnippet!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 2),
                    child: Icon(Icons.schedule, size: 14, color: AppColors.mutedForeground),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      group.lastActivitySnippet!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.people_outline, size: 16, color: AppColors.mutedForeground),
                Text(' ${group.memberCount} members', style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13)),
                const SizedBox(width: 16),
                const Icon(Icons.forum_outlined, size: 16, color: AppColors.mutedForeground),
                Text(
                  threads != null ? ' $threads threads' : ' Threads',
                  style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
