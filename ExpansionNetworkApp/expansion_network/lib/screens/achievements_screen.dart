import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../analytics/expansion_analytics.dart';
import '../models/badge_definition.dart';
import '../services/badge_repository.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';

/// Reads `badge_definitions` + current user `badges.earned` / `gamification`.
class AchievementsScreen extends StatefulWidget {
  const AchievementsScreen({super.key});

  @override
  State<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends State<AchievementsScreen> {
  bool _emptyDefinitionsEventLogged = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(ExpansionAnalytics.log('achievements_screen_started', sourceScreen: 'achievements'));
    });
  }

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) {
      return const Scaffold(body: Center(child: Text('Sign in to view achievements.')));
    }

    final badgesRepo = BadgeRepository();
    final usersRepo = UserProfileRepository();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Achievements'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.foreground,
      ),
      backgroundColor: AppColors.background,
      body: StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
        stream: usersRepo.watchUserDoc(uid),
        builder: (context, userSnap) {
          final data = userSnap.data?.data();
          final earned = <String>{};
          final badgesMap = data?['badges'];
          if (badgesMap is Map && badgesMap['earned'] is List) {
            earned.addAll(List<String>.from(badgesMap['earned'] as List));
          }
          final counters = UserGamificationCounters.fromUserData(data);

          return StreamBuilder<List<BadgeDefinition>>(
            stream: badgesRepo.watchDefinitions(),
            builder: (context, defSnap) {
              if (defSnap.connectionState == ConnectionState.waiting && !defSnap.hasData) {
                return const Center(child: CircularProgressIndicator(color: AppColors.primary));
              }
              final defs = defSnap.data ?? [];
              if (defs.isEmpty) {
                if (!_emptyDefinitionsEventLogged) {
                  _emptyDefinitionsEventLogged = true;
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    unawaited(
                      ExpansionAnalytics.log(
                        'achievements_definitions_empty_shown',
                        sourceScreen: 'achievements',
                      ),
                    );
                  });
                }
                return ListView(
                  padding: const EdgeInsets.all(24),
                  children: [
                    Text(
                      'Badges will appear here once administrators publish badge definitions in Firestore (`badge_definitions`).',
                      style: TextStyle(color: AppColors.mutedForeground.withValues(alpha: 0.95)),
                    ),
                    const SizedBox(height: 20),
                    _progressCard(counters),
                  ],
                );
              }

              return ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                children: [
                  _progressCard(counters),
                  const SizedBox(height: 16),
                  Text(
                    'Badges',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  ...defs.map((d) => _BadgeTile(definition: d, unlocked: earned.contains(d.id))),
                ],
              );
            },
          );
        },
      ),
    );
  }

  Widget _progressCard(UserGamificationCounters c) {
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
          const Text('Your activity', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Text('Group posts created: ${c.postsCreated}', style: const TextStyle(color: AppColors.mutedForeground)),
          Text('Group comments: ${c.commentsCreated}', style: const TextStyle(color: AppColors.mutedForeground)),
        ],
      ),
    );
  }
}

class _BadgeTile extends StatelessWidget {
  const _BadgeTile({required this.definition, required this.unlocked});

  final BadgeDefinition definition;
  final bool unlocked;

  @override
  Widget build(BuildContext context) {
    final crit = definition.criteria;
    String? hint;
    if (crit != null) {
      final mp = crit['min_posts_created'];
      final mc = crit['min_comments_created'];
      if (mp is num) hint = 'Requires ${mp.toInt()}+ group posts';
      if (mc is num) hint = '${hint != null ? '$hint · ' : ''}Requires ${mc.toInt()}+ comments';
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: unlocked ? AppColors.primary.withValues(alpha: 0.08) : AppColors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: unlocked ? AppColors.primary.withValues(alpha: 0.35) : AppColors.border),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              unlocked ? Icons.military_tech : Icons.lock_outline,
              color: unlocked ? AppColors.primary : AppColors.mutedForeground,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          definition.name,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: unlocked ? AppColors.foreground : AppColors.mutedForeground,
                          ),
                        ),
                      ),
                      if (definition.tier != null)
                        Text(
                          definition.tier!,
                          style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                        ),
                    ],
                  ),
                  if (definition.description.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      definition.description,
                      style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground, height: 1.35),
                    ),
                  ],
                  if (!unlocked && hint != null) ...[
                    const SizedBox(height: 6),
                    Text(hint, style: const TextStyle(fontSize: 11, color: AppColors.primary)),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
