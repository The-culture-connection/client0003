import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';

/// Port of [UI Basis/src/app/pages/Home.tsx]
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final recentPosts = [
      _MiniPost(1, 'Sarah Johnson', 'SJ', 'Just landed my dream job at a tech startup! 🚀', 24, '2h ago'),
      _MiniPost(2, 'Michael Chen', 'MC', 'Anyone attending the networking workshop tomorrow?', 12, '5h ago'),
    ];
    final upcomingEvents = [
      _MiniEvent(1, 'Networking Workshop', 'Feb 28', '2:00 PM', true),
      _MiniEvent(2, 'Guest Speaker Series', 'Mar 2', '6:00 PM', false),
    ];
    final myGroups = [
      _MiniGroup(1, 'Tech Entrepreneurs', 156),
      _MiniGroup(2, 'Class of 2024', 89),
      _MiniGroup(3, 'Marketing Professionals', 134),
    ];
    final topMatches = [
      _TopMatch(1, 'job', 'Senior Product Manager', 'TechCorp', 95),
      _TopMatch(2, 'connection', 'Maria Garcia', 'Marketing Director', 88),
    ];

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    height: 160,
                    child: _WelcomeCard(
                      onMatching: () => context.push('/matching'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  IntrinsicHeight(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(
                          child: _GroupsCard(
                            groups: myGroups.take(2).toList(),
                            onSeeAll: () => context.go('/groups'),
                            onGroupTap: (id) => context.push('/groups/$id'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _EventsCard(
                            events: upcomingEvents,
                            onSeeAll: () => context.go('/feed'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _RecentActivityCard(
                    posts: recentPosts,
                    onViewAll: () => context.go('/feed'),
                  ),
                  const SizedBox(height: 12),
                  _TopMatchesCard(
                    matches: topMatches,
                    onViewAll: () => context.go('/explore'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniPost {
  const _MiniPost(this.id, this.author, this.avatar, this.content, this.likes, this.time);
  final int id;
  final String author;
  final String avatar;
  final String content;
  final int likes;
  final String time;
}

class _MiniEvent {
  const _MiniEvent(this.id, this.title, this.date, this.time, this.registered);
  final int id;
  final String title;
  final String date;
  final String time;
  final bool registered;
}

class _MiniGroup {
  const _MiniGroup(this.id, this.name, this.members);
  final int id;
  final String name;
  final int members;
}

class _TopMatch {
  const _TopMatch(this.id, this.type, this.title, this.company, this.match);
  final int id;
  final String type;
  final String title;
  final String company;
  final int match;
}

class _WelcomeCard extends StatelessWidget {
  const _WelcomeCard({required this.onMatching});

  final VoidCallback onMatching;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: LinearGradient(
          colors: [
            AppColors.primary,
            AppColors.primary.withValues(alpha: 0.85),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welcome Back!',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: AppColors.onPrimary,
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Discover new opportunities',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.onPrimary.withValues(alpha: 0.9),
                          ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.auto_awesome, color: AppColors.onPrimary.withValues(alpha: 0.95), size: 32),
            ],
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white.withValues(alpha: 0.2),
                foregroundColor: AppColors.onPrimary,
              ),
              onPressed: onMatching,
              child: const Text('Run Smart Matching'),
            ),
          ),
        ],
      ),
    );
  }
}

class _GroupsCard extends StatelessWidget {
  const _GroupsCard({
    required this.groups,
    required this.onSeeAll,
    required this.onGroupTap,
  });

  final List<_MiniGroup> groups;
  final VoidCallback onSeeAll;
  final void Function(int id) onGroupTap;

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      title: 'Groups',
      onAction: onSeeAll,
      child: Column(
        children: [
          for (final g in groups)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                onTap: () => onGroupTap(g.id),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.groups, size: 12, color: AppColors.primary),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              g.name,
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: AppColors.foreground,
                                    fontWeight: FontWeight.w500,
                                  ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${g.members} members',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: AppColors.mutedForeground,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _EventsCard extends StatelessWidget {
  const _EventsCard({required this.events, required this.onSeeAll});

  final List<_MiniEvent> events;
  final VoidCallback onSeeAll;

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      title: 'Events',
      onAction: onSeeAll,
      child: Column(
        children: [
          for (final e in events)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.calendar_today, size: 12, color: AppColors.primary),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            e.title,
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  fontWeight: FontWeight.w500,
                                ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${e.date} • ${e.time}',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: AppColors.mutedForeground,
                          ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _RecentActivityCard extends StatelessWidget {
  const _RecentActivityCard({required this.posts, required this.onViewAll});

  final List<_MiniPost> posts;
  final VoidCallback onViewAll;

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      title: 'Recent Activity',
      actionLabel: 'View All',
      onAction: onViewAll,
      child: Column(
        children: [
          for (final p in posts)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CircleAvatar(
                        radius: 14,
                        backgroundColor: AppColors.primary,
                        child: Text(
                          p.avatar,
                          style: const TextStyle(fontSize: 10, color: AppColors.onPrimary, fontWeight: FontWeight.w600),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              p.author,
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                    fontWeight: FontWeight.w500,
                                  ),
                            ),
                            Text(
                              p.time,
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: AppColors.mutedForeground,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    p.content,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.favorite_border, size: 12, color: AppColors.mutedForeground),
                      const SizedBox(width: 4),
                      Text(
                        '${p.likes}',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: AppColors.mutedForeground,
                            ),
                      ),
                    ],
                  ),
                  if (p != posts.last) const Divider(height: 16),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _TopMatchesCard extends StatelessWidget {
  const _TopMatchesCard({required this.matches, required this.onViewAll});

  final List<_TopMatch> matches;
  final VoidCallback onViewAll;

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      title: 'Top Matches',
      actionLabel: 'View All',
      onAction: onViewAll,
      child: Column(
        children: [
          Row(
            children: [
              for (final m in matches)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(
                                  m.type == 'job' ? Icons.work_outline : Icons.people_outline,
                                  size: 16,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      m.title,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                            fontWeight: FontWeight.w500,
                                          ),
                                    ),
                                    Text(
                                      m.company,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                            color: AppColors.mutedForeground,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Icon(Icons.trending_up, size: 12, color: AppColors.primary),
                              const SizedBox(width: 4),
                              Text(
                                '${m.match}% match',
                                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.w600,
                                    ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CardShell extends StatelessWidget {
  const _CardShell({
    required this.title,
    required this.child,
    this.onAction,
    this.actionLabel,
  });

  final String title;
  final Widget child;
  final VoidCallback? onAction;
  final String? actionLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                ),
              ),
              if (onAction != null)
                TextButton(
                  onPressed: onAction,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (actionLabel != null)
                        Text(
                          actionLabel!,
                          style: const TextStyle(fontSize: 12, color: AppColors.primary),
                        ),
                      if (actionLabel == null)
                        const Icon(Icons.arrow_forward, size: 16, color: AppColors.primary),
                      if (actionLabel != null)
                        const Icon(Icons.arrow_forward, size: 14, color: AppColors.primary),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}
