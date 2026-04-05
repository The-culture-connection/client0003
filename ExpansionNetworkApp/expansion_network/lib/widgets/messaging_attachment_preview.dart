import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/community_event.dart';
import '../models/explore_job.dart';
import '../models/explore_skill_listing.dart';
import '../services/events_repository.dart';
import '../services/explore_listings_repository.dart';
import '../theme/app_theme.dart';
import '../utils/relative_time.dart';

/// Inline card for a job, skill listing, or event inside a DM bubble.
class MessagingAttachmentPreview extends StatelessWidget {
  const MessagingAttachmentPreview({
    super.key,
    required this.attachmentType,
    required this.attachmentId,
    this.compact = false,
  });

  final String attachmentType;
  final String attachmentId;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    switch (attachmentType) {
      case 'job':
        return _JobAttachmentCard(id: attachmentId, compact: compact);
      case 'skill':
        return _SkillAttachmentCard(id: attachmentId, compact: compact);
      case 'event':
        return _EventAttachmentCard(id: attachmentId, compact: compact);
      default:
        return const SizedBox.shrink();
    }
  }
}

class _JobAttachmentCard extends StatelessWidget {
  const _JobAttachmentCard({required this.id, required this.compact});

  final String id;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final repo = ExploreListingsRepository();
    return FutureBuilder<ExploreJob?>(
      future: repo.getJob(id),
      builder: (context, snap) {
        final j = snap.data;
        if (j == null) {
          return _loadingOrMissing(snap.connectionState == ConnectionState.waiting, 'Job');
        }
        return _cardShell(
          context,
          icon: Icons.work_outline,
          title: j.title,
          subtitle: [
            if (j.skillsSeeking.isNotEmpty) 'Seeking: ${j.skillsSeeking.join(' · ')}',
            if (j.industry != null && j.industry!.isNotEmpty) j.industry!,
            if (j.company != null && j.company!.isNotEmpty) j.company!,
            if (j.location != null && j.location!.isNotEmpty) j.location!,
          ].where((e) => e.isNotEmpty).join(' · '),
          onTap: compact ? null : () => context.push('/explore'),
        );
      },
    );
  }
}

class _SkillAttachmentCard extends StatelessWidget {
  const _SkillAttachmentCard({required this.id, required this.compact});

  final String id;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final repo = ExploreListingsRepository();
    return FutureBuilder<ExploreSkillListing?>(
      future: repo.getSkillListing(id),
      builder: (context, snap) {
        final s = snap.data;
        if (s == null) {
          return _loadingOrMissing(snap.connectionState == ConnectionState.waiting, 'Skill listing');
        }
        final skillSub = [
          if (s.skillsOffering.isNotEmpty) 'Offering: ${s.skillsOffering.join(' · ')}',
          if (s.industry != null && s.industry!.isNotEmpty) s.industry!,
          if (s.location != null && s.location!.isNotEmpty) s.location!,
          if (s.summary != null && s.summary!.isNotEmpty) s.summary!,
        ].where((e) => e.isNotEmpty).join(' · ');
        return _cardShell(
          context,
          icon: Icons.psychology_outlined,
          title: s.title,
          subtitle: skillSub.isNotEmpty ? skillSub : 'Skill offering',
          onTap: compact ? null : () => context.push('/explore/skills'),
        );
      },
    );
  }
}

class _EventAttachmentCard extends StatelessWidget {
  const _EventAttachmentCard({required this.id, required this.compact});

  final String id;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final repo = EventsRepository();
    return FutureBuilder<CommunityEvent?>(
      future: repo.getEvent(id),
      builder: (context, snap) {
        final e = snap.data;
        if (e == null) {
          return _loadingOrMissing(snap.connectionState == ConnectionState.waiting, 'Event');
        }
        return _cardShell(
          context,
          icon: Icons.event_outlined,
          title: e.title,
          subtitle: '${e.date != null ? formatEventDate(e.date) : 'TBD'} · ${e.time}',
          onTap: compact ? null : () => context.push('/events/$id'),
        );
      },
    );
  }
}

Widget _loadingOrMissing(bool loading, String label) {
  return Container(
    width: double.infinity,
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(
      color: AppColors.secondary,
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: AppColors.border),
    ),
    child: Text(
      loading ? 'Loading $label…' : '$label unavailable',
      style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
    ),
  );
}

Widget _cardShell(
  BuildContext context, {
  required IconData icon,
  required String title,
  required String subtitle,
  VoidCallback? onTap,
}) {
  final child = Container(
    width: double.infinity,
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(
      color: AppColors.background,
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: AppColors.border),
    ),
    child: Row(
      children: [
        Icon(icon, size: 22, color: AppColors.primary),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              if (subtitle.isNotEmpty)
                Text(
                  subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                ),
            ],
          ),
        ),
        if (onTap != null) const Icon(Icons.chevron_right, size: 18, color: AppColors.mutedForeground),
      ],
    ),
  );
  if (onTap == null) return child;
  return InkWell(onTap: onTap, borderRadius: BorderRadius.circular(10), child: child);
}
