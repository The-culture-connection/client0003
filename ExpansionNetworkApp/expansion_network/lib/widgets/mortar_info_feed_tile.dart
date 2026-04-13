import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/mortar_info_post.dart';
import '../theme/app_theme.dart';

String mortarInfoRelativeTime(DateTime? at) {
  if (at == null) return 'Recently';
  final diff = DateTime.now().difference(at);
  if (diff.inSeconds < 45) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m';
  if (diff.inHours < 24) return '${diff.inHours}h';
  if (diff.inDays < 7) return '${diff.inDays}d';
  if (diff.inDays < 365) return '${(diff.inDays / 7).floor()}w';
  return '${(diff.inDays / 365).floor()}y';
}

String? _linkHost(String? url) {
  if (url == null || url.trim().isEmpty) return null;
  return Uri.tryParse(url.trim())?.host;
}

/// LinkedIn-style post surface for Mortar Info (home preview or full detail).
class MortarInfoFeedTile extends StatelessWidget {
  const MortarInfoFeedTile({
    super.key,
    required this.post,
    this.compact = false,
    this.onOpenDetail,
  });

  final MortarInfoPost post;
  final bool compact;
  final VoidCallback? onOpenDetail;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE0E0E0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: compact ? 20 : 24,
                  backgroundColor: AppColors.primary,
                  child: Text(
                    'M',
                    style: TextStyle(
                      color: AppColors.onPrimary,
                      fontWeight: FontWeight.w700,
                      fontSize: compact ? 15 : 17,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Expanded(
                            child: Text(
                              'Mortar',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                                height: 1.2,
                              ),
                            ),
                          ),
                          Text(
                            mortarInfoRelativeTime(post.createdAt),
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.mutedForeground,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Alumni Network · Official update',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppColors.mutedForeground,
                          height: 1.2,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            if (post.title.trim().isNotEmpty) ...[
              Text(
                post.title.trim(),
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 6),
            ],
            Text(
              post.body.trim(),
              maxLines: compact ? 4 : null,
              overflow: compact ? TextOverflow.ellipsis : TextOverflow.visible,
              style: const TextStyle(fontSize: 14, height: 1.45, color: Color(0xFF1C1C1C)),
            ),
            if (post.hasNewsletterLink) ...[
              const SizedBox(height: 10),
              _NewsletterLinkCard(
                url: post.newsletterUrl!.trim(),
                label: post.newsletterLabel,
                compact: compact,
              ),
            ],
            if (post.media.isNotEmpty) ...[
              const SizedBox(height: 10),
              _MediaStrip(media: post.media, compact: compact),
            ],
          ],
        ),
      ),
    );

    if (onOpenDetail != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onOpenDetail,
          borderRadius: BorderRadius.circular(8),
          child: card,
        ),
      );
    }
    return card;
  }
}

class _NewsletterLinkCard extends StatelessWidget {
  const _NewsletterLinkCard({
    required this.url,
    this.label,
    required this.compact,
  });

  final String url;
  final String? label;
  final bool compact;

  Future<void> _open(BuildContext context) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open link')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final host = _linkHost(url) ?? url;
    final title = (label != null && label!.trim().isNotEmpty) ? label!.trim() : 'Newsletter & resources';

    return Material(
      color: const Color(0xFFF4F4F4),
      borderRadius: BorderRadius.circular(4),
      child: InkWell(
        onTap: () => _open(context),
        borderRadius: BorderRadius.circular(4),
        child: Container(
          width: double.infinity,
          padding: EdgeInsets.symmetric(horizontal: compact ? 10 : 12, vertical: compact ? 10 : 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: const Color(0xFFCECECE)),
          ),
          child: Row(
            children: [
              Icon(Icons.newspaper_outlined, size: compact ? 28 : 32, color: AppColors.primary),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: Color(0xFF1C1C1C),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      host,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.open_in_new, size: 16, color: AppColors.mutedForeground),
            ],
          ),
        ),
      ),
    );
  }
}

class _MediaStrip extends StatelessWidget {
  const _MediaStrip({required this.media, required this.compact});

  final List<MortarInfoMediaItem> media;
  final bool compact;

  Future<void> _openVideo(BuildContext context, String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open video')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = compact ? 160.0 : 220.0;
    if (media.length == 1) {
      final m = media.first;
      return ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: SizedBox(
          height: h,
          width: double.infinity,
          child: m.isVideo
              ? InkWell(
                  onTap: () => _openVideo(context, m.url),
                  child: Container(
                    color: const Color(0xFF1a1a1a),
                    child: const Center(
                      child: Icon(Icons.play_circle_filled, size: 56, color: Colors.white70),
                    ),
                  ),
                )
              : CachedNetworkImage(
                  imageUrl: m.url,
                  fit: BoxFit.cover,
                  width: double.infinity,
                  placeholder: (_, __) => const Center(
                    child: SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                    ),
                  ),
                  errorWidget: (_, __, ___) => const Center(child: Icon(Icons.broken_image_outlined)),
                ),
        ),
      );
    }

    return SizedBox(
      height: h,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: media.length,
        separatorBuilder: (_, __) => const SizedBox(width: 6),
        itemBuilder: (context, i) {
          final m = media[i];
          final w = compact ? 200.0 : 280.0;
          return ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: SizedBox(
              width: w,
              height: h,
              child: m.isVideo
                  ? InkWell(
                      onTap: () => _openVideo(context, m.url),
                      child: Container(
                        color: const Color(0xFF1a1a1a),
                        child: const Center(
                          child: Icon(Icons.play_circle_filled, size: 44, color: Colors.white70),
                        ),
                      ),
                    )
                  : CachedNetworkImage(
                      imageUrl: m.url,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => const Center(
                        child: SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                        ),
                      ),
                      errorWidget: (_, __, ___) => const Icon(Icons.broken_image_outlined),
                    ),
            ),
          );
        },
      ),
    );
  }
}
