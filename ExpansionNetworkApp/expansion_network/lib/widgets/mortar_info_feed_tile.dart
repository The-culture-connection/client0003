import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../analytics/expansion_analytics.dart';
import '../models/mortar_info_post.dart';
import '../theme/app_theme.dart';
import '../utils/safe_launch_url.dart';

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
    final scheme = Theme.of(context).colorScheme;
    final card = Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: scheme.outline.withValues(alpha: 0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
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
                          Expanded(
                            child: Text(
                              'Mortar',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                                height: 1.2,
                                color: scheme.onSurface,
                              ),
                            ),
                          ),
                          Text(
                            mortarInfoRelativeTime(post.createdAt),
                            style: TextStyle(
                              fontSize: 12,
                              color: scheme.onSurface.withValues(alpha: 0.65),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Alumni Network · Official update',
                        style: TextStyle(
                          fontSize: 11,
                          color: scheme.onSurface.withValues(alpha: 0.55),
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
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                  height: 1.35,
                  color: scheme.onSurface,
                ),
              ),
              const SizedBox(height: 6),
            ],
            Text(
              post.body.trim(),
              maxLines: compact ? 4 : null,
              overflow: compact ? TextOverflow.ellipsis : TextOverflow.visible,
              style: TextStyle(
                fontSize: 14,
                height: 1.45,
                color: scheme.onSurface.withValues(alpha: 0.92),
              ),
            ),
            if (post.hasNewsletterLink) ...[
              const SizedBox(height: 10),
              _NewsletterLinkCard(
                postId: post.id,
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
    required this.postId,
    required this.url,
    this.label,
    required this.compact,
  });

  final String postId;
  final String url;
  final String? label;
  final bool compact;

  Future<void> _open(BuildContext context) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    final ok = await safeLaunchExternalUrl(
      uri,
      messengerContext: context,
      userFailureMessage: 'Could not open newsletter link',
    );
    if (ok && context.mounted) {
      await ExpansionAnalytics.log(
        'mortar_info_external_link_opened',
        entityId: postId,
        sourceScreen: 'mortar_info',
        extra: <String, Object?>{'link_host': _linkHost(url) ?? ''},
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final host = _linkHost(url) ?? url;
    final title = (label != null && label!.trim().isNotEmpty) ? label!.trim() : 'Newsletter & resources';

    return Material(
      color: AppColors.secondary,
      borderRadius: BorderRadius.circular(4),
      child: InkWell(
        onTap: () => _open(context),
        borderRadius: BorderRadius.circular(4),
        child: Container(
          width: double.infinity,
          padding: EdgeInsets.symmetric(horizontal: compact ? 10 : 12, vertical: compact ? 10 : 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: scheme.outline.withValues(alpha: 0.45)),
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
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: scheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      host,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        color: scheme.onSurface.withValues(alpha: 0.6),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.open_in_new, size: 16, color: scheme.onSurface.withValues(alpha: 0.55)),
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

  @override
  Widget build(BuildContext context) {
    // Tall cap so portrait / logo art shows in full (contain), not cropped like cover.
    final singleMaxH = compact ? 420.0 : 640.0;
    final carouselH = compact ? 200.0 : 260.0;
    if (media.length == 1) {
      final m = media.first;
      return ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: ColoredBox(
          color: const Color(0xFF0A0A0A),
          child: SizedBox(
            width: double.infinity,
            height: singleMaxH,
            child: m.isVideo
                ? _MortarInlineVideo(url: m.url, height: singleMaxH)
                : CachedNetworkImage(
                    imageUrl: m.url,
                    fit: BoxFit.contain,
                    width: double.infinity,
                    height: singleMaxH,
                    alignment: Alignment.center,
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
        ),
      );
    }

    return SizedBox(
      height: carouselH,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: media.length,
        separatorBuilder: (_, __) => const SizedBox(width: 6),
        itemBuilder: (context, i) {
          final m = media[i];
          final w = compact ? 220.0 : 300.0;
          return ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: ColoredBox(
              color: const Color(0xFF0A0A0A),
              child: SizedBox(
                width: w,
                height: carouselH,
                child: m.isVideo
                    ? _MortarInlineVideo(url: m.url, height: carouselH)
                    : CachedNetworkImage(
                        imageUrl: m.url,
                        fit: BoxFit.contain,
                        width: w,
                        height: carouselH,
                        alignment: Alignment.center,
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
            ),
          );
        },
      ),
    );
  }
}

/// In-app playback for Storage/network video so we do not rely on [url_launcher] (Android Pigeon).
class _MortarInlineVideo extends StatefulWidget {
  const _MortarInlineVideo({required this.url, required this.height});

  final String url;
  final double height;

  @override
  State<_MortarInlineVideo> createState() => _MortarInlineVideoState();
}

class _MortarInlineVideoState extends State<_MortarInlineVideo> {
  VideoPlayerController? _controller;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final uri = Uri.tryParse(widget.url);
    if (uri == null) {
      if (mounted) setState(() => _failed = true);
      return;
    }
    final c = VideoPlayerController.networkUrl(uri);
    try {
      await c.initialize();
      if (!mounted) {
        await c.dispose();
        return;
      }
      await c.setLooping(false);
      await c.setVolume(1);
      c.addListener(_onVideoTick);
      setState(() => _controller = c);
    } catch (_) {
      await c.dispose();
      if (mounted) setState(() => _failed = true);
    }
  }

  void _onVideoTick() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _controller?.removeListener(_onVideoTick);
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _togglePlay() async {
    final c = _controller;
    if (c == null || !c.value.isInitialized) return;
    if (c.value.isPlaying) {
      await c.pause();
    } else {
      await c.play();
    }
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) {
      return ColoredBox(
        color: AppColors.secondary,
        child: Center(
          child: TextButton.icon(
            onPressed: () {
              final u = Uri.tryParse(widget.url);
              if (u != null) {
                safeLaunchExternalUrl(u, messengerContext: context, userFailureMessage: 'Could not open video');
              }
            },
            icon: const Icon(Icons.open_in_new),
            label: const Text('Open video'),
          ),
        ),
      );
    }

    final c = _controller;
    if (c == null || !c.value.isInitialized) {
      return const ColoredBox(
        color: Color(0xFF101010),
        child: Center(
          child: SizedBox(
            width: 28,
            height: 28,
            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
          ),
        ),
      );
    }

    final showPlayOverlay = !c.value.isPlaying;

    return Material(
      color: Colors.black,
      child: InkWell(
        onTap: _togglePlay,
        child: Stack(
          fit: StackFit.expand,
          alignment: Alignment.center,
          children: [
            FittedBox(
              fit: BoxFit.contain,
              child: SizedBox(
                width: c.value.size.width,
                height: c.value.size.height,
                child: VideoPlayer(c),
              ),
            ),
            if (showPlayOverlay)
              ColoredBox(
                color: Colors.black38,
                child: Center(
                  child: Icon(
                    Icons.play_circle_filled,
                    size: widget.height > 180 ? 56 : 44,
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
