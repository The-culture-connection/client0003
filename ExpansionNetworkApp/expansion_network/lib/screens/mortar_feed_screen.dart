import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/mortar_info_post.dart';
import '../services/mortar_info_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/mortar_info_feed_tile.dart';

/// Full list of published Mortar announcements (`mortar_info_posts`).
class MortarFeedScreen extends StatelessWidget {
  const MortarFeedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final repo = MortarInfoRepository();

    return Scaffold(
      appBar: AppBar(title: const Text('Mortar feed')),
      body: StreamBuilder<List<MortarInfoPost>>(
        stream: repo.watchPublishedPosts(limit: 100),
        builder: (context, snap) {
          if (snap.hasError) {
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text(
                  'Could not load posts.\n${snap.error}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.mutedForeground),
                ),
              ),
            );
          }
          if (!snap.hasData) {
            return const Center(
              child: SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
              ),
            );
          }
          final posts = snap.data!;
          if (posts.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'No Mortar updates yet.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.mutedForeground),
                ),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            itemCount: posts.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, i) {
              final p = posts[i];
              return MortarInfoFeedTile(
                post: p,
                compact: true,
                onOpenDetail: () => context.push('/mortar-info/${p.id}'),
              );
            },
          );
        },
      ),
    );
  }
}
