import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';
import '../widgets/page_header.dart';

/// Port of [UI Basis/src/app/pages/Explore.tsx]
class ExploreScreen extends StatelessWidget {
  const ExploreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const opportunities = [
      _Opp(1, 'job', 'Senior Product Manager', 'TechCorp', 'San Francisco, CA', '2d ago', 95, null),
      _Opp(2, 'connection', 'Connect with Maria Garcia', 'Marketing Director • Class of 2022', 'New York, NY', '1w ago', 88, 'maria-garcia'),
      _Opp(3, 'job', 'Marketing Specialist', 'StartupXYZ', 'Remote', '3d ago', 82, null),
      _Opp(4, 'connection', 'Connect with James Wilson', 'Tech Entrepreneur • Class of 2021', 'Austin, TX', '2w ago', 76, 'james-wilson'),
    ];

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: PageHeader(
              title: 'Explore',
              subtitle: 'Discover opportunities matched to you',
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
          const SliverToBoxAdapter(child: SizedBox(height: 16)),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverToBoxAdapter(
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Search opportunities...',
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
          const SliverToBoxAdapter(child: SizedBox(height: 12)),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 36,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: const [
                  _FilterChip(label: 'All', selected: true),
                  SizedBox(width: 8),
                  _FilterChip(label: 'Jobs', selected: false),
                  SizedBox(width: 8),
                  _FilterChip(label: 'Connections', selected: false),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 12)),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final o = opportunities[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _OpportunityCard(opp: o),
                  );
                },
                childCount: opportunities.length,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.selected});

  final String label;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: selected ? AppColors.primary : AppColors.secondary,
        borderRadius: BorderRadius.circular(8),
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        style: TextStyle(
          fontSize: 13,
          color: selected ? AppColors.onPrimary : AppColors.mutedForeground,
        ),
      ),
    );
  }
}

class _Opp {
  const _Opp(
    this.id,
    this.type,
    this.title,
    this.company,
    this.location,
    this.posted,
    this.match,
    this.userId,
  );

  final int id;
  final String type;
  final String title;
  final String company;
  final String location;
  final String posted;
  final int match;
  final String? userId;
}

class _OpportunityCard extends StatelessWidget {
  const _OpportunityCard({required this.opp});

  final _Opp opp;

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
                child: Icon(
                  opp.type == 'job' ? Icons.work_outline : Icons.people_outline,
                  color: AppColors.primary,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(opp.title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 15)),
                    const SizedBox(height: 4),
                    Text(opp.company, style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.place_outlined, size: 12, color: AppColors.mutedForeground),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            opp.location,
                            style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(' • ${opp.posted}', style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
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
                '${opp.match}% match',
                style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600),
              ),
              const Spacer(),
              if (opp.type == 'connection' && opp.userId != null)
                OutlinedButton(
                  onPressed: () => context.push('/messages/direct/${opp.userId}'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.foreground,
                    side: const BorderSide(color: AppColors.border),
                  ),
                  child: const Icon(Icons.chat_bubble_outline, size: 18),
                ),
              if (opp.type == 'connection' && opp.userId != null) const SizedBox(width: 8),
              FilledButton(
                onPressed: () {},
                style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                child: Text(opp.type == 'job' ? 'Apply' : 'Connect'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
