import 'package:flutter/material.dart';

import '../models/mortar_info_post.dart';
import '../services/mortar_info_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/mortar_info_feed_tile.dart';

class MortarInfoDetailScreen extends StatelessWidget {
  const MortarInfoDetailScreen({super.key, required this.postId});

  final String postId;

  @override
  Widget build(BuildContext context) {
    final repo = MortarInfoRepository();

    return Scaffold(
      appBar: AppBar(title: const Text('Mortar')),
      body: FutureBuilder<MortarInfoPost?>(
        future: repo.getPost(postId),
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator(color: AppColors.primary));
          }
          final post = snap.data;
          if (post == null) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'This post is unavailable or was removed.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.mutedForeground),
                ),
              ),
            );
          }
          return SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
            child: MortarInfoFeedTile(
              post: post,
              compact: false,
            ),
          );
        },
      ),
    );
  }
}
