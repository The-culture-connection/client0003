import 'package:flutter/material.dart';

import '../models/community_event.dart';
import '../theme/app_theme.dart';

/// Card chrome for list / feed tiles — matches “official” mock: red rim + glow.
BoxDecoration mortarEventListCardDecoration(CommunityEvent event) {
  if (!event.isMortarHostedEvent) {
    return BoxDecoration(
      color: AppColors.card,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.border),
    );
  }
  return BoxDecoration(
    color: AppColors.card,
    borderRadius: BorderRadius.circular(12),
    border: Border.all(color: AppColors.primary, width: 1.5),
    boxShadow: [
      BoxShadow(
        color: AppColors.primary.withValues(alpha: 0.42),
        blurRadius: 14,
        spreadRadius: 0,
        offset: const Offset(0, 0),
      ),
      BoxShadow(
        color: AppColors.primary.withValues(alpha: 0.14),
        blurRadius: 22,
        spreadRadius: 1,
        offset: const Offset(0, 2),
      ),
    ],
  );
}

/// Small red seal with check — sits beside the event title (mock reference).
class MortarOfficialVerifiedSeal extends StatelessWidget {
  const MortarOfficialVerifiedSeal({super.key, this.size = 22});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.primary,
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.55),
            blurRadius: 8,
            spreadRadius: 0,
          ),
        ],
      ),
      child: Icon(
        Icons.check_rounded,
        size: size * 0.58,
        color: AppColors.onPrimary,
      ),
    );
  }
}

/// Mortar event pill only (`distribution` mobile/both). Member-posted events show no badge here.
class EventSourceBadges extends StatelessWidget {
  const EventSourceBadges({super.key, required this.event, this.dense = false});

  final CommunityEvent event;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    if (!event.isMortarHostedEvent) return const SizedBox.shrink();
    return _OfficialMortarEventPill(dense: dense);
  }
}

/// Red outline pill + dot + caps label (reference UI).
class _OfficialMortarEventPill extends StatelessWidget {
  const _OfficialMortarEventPill({required this.dense});

  final bool dense;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: dense ? 12 : 14, vertical: dense ? 7 : 9),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.primary, width: 1.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: dense ? 7 : 8,
            height: dense ? 7 : 8,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primary,
            ),
          ),
          SizedBox(width: dense ? 8 : 10),
          Text(
            'MORTAR EVENT',
            style: TextStyle(
              color: AppColors.primary,
              fontWeight: FontWeight.w800,
              fontSize: dense ? 10.5 : 11.5,
              letterSpacing: 0.85,
              height: 1.0,
            ),
          ),
        ],
      ),
    );
  }
}
