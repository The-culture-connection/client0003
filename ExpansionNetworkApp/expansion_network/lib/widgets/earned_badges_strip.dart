import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../badge/badge_platform_utils.dart';
import '../models/badge_definition.dart';
import '../services/badge_repository.dart';
import '../theme/app_theme.dart';

/// Thumbnails for earned badges that have `image_url` and apply to Expansion mobile.
class EarnedBadgesStrip extends StatelessWidget {
  const EarnedBadgesStrip({super.key, required this.profileData});

  final Map<String, dynamic> profileData;

  Set<String> _earnedIds() {
    final badges = profileData['badges'];
    if (badges is! Map) return {};
    final earned = badges['earned'];
    if (earned is! List) return {};
    return earned.map((e) => '$e').toSet();
  }

  @override
  Widget build(BuildContext context) {
    final ids = _earnedIds();
    if (ids.isEmpty) return const SizedBox.shrink();

    return StreamBuilder<List<BadgeDefinition>>(
      stream: BadgeRepository().watchDefinitions(),
      builder: (context, snap) {
        final defs = snap.data ?? [];
        final tiles = defs
            .where((d) => ids.contains(d.id) && badgeVisibleOnExpansionMobile(d.platform))
            .where((d) => (d.imageUrl ?? '').isNotEmpty)
            .take(14)
            .toList();
        if (tiles.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Earned badges',
              style: Theme.of(context).textTheme.labelLarge?.copyWith(color: AppColors.mutedForeground),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final d in tiles)
                  Tooltip(
                    message: d.name,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: CachedNetworkImage(
                        imageUrl: d.imageUrl!,
                        width: 44,
                        height: 44,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(
                          width: 44,
                          height: 44,
                          color: AppColors.secondary,
                        ),
                        errorWidget: (_, __, ___) => const Icon(Icons.military_tech, size: 28),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        );
      },
    );
  }
}
