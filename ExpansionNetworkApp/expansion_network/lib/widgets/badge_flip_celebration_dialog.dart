import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_theme.dart';

/// Full-screen celebration: badge art → 3D flip → checkmark, with haptics at the check.
class BadgeFlipCelebrationDialog extends StatefulWidget {
  const BadgeFlipCelebrationDialog({
    super.key,
    required this.title,
    required this.imageUrl,
    required this.onDone,
  });

  final String title;
  final String? imageUrl;
  final VoidCallback onDone;

  @override
  State<BadgeFlipCelebrationDialog> createState() => _BadgeFlipCelebrationDialogState();
}

class _BadgeFlipCelebrationDialogState extends State<BadgeFlipCelebrationDialog>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  var _hapticFired = false;
  var _closed = false;

  void _closeOnce() {
    if (_closed || !mounted) return;
    _closed = true;
    if (_c.isAnimating) _c.stop();
    widget.onDone();
  }

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 2200))
      ..addListener(() {
        final v = _c.value;
        if (!_hapticFired && v >= 0.52) {
          _hapticFired = true;
          HapticFeedback.heavyImpact();
          HapticFeedback.mediumImpact();
        }
      })
      ..addStatusListener((status) {
        if (status == AnimationStatus.completed) {
          Future<void>.delayed(const Duration(milliseconds: 350), () {
            if (mounted) _closeOnce();
          });
        }
      })
      ..forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.55),
      child: Center(
        child: AnimatedBuilder(
          animation: _c,
          builder: (context, _) {
            final t = _c.value;
            final scale = Curves.easeOutBack.transform(math.min(1, t / 0.18));
            final flipT = ((t - 0.2) / 0.45).clamp(0.0, 1.0);
            final angle = flipT * math.pi;
            final showFront = angle < math.pi / 2;
            final rot = Matrix4.identity()
              ..setEntry(3, 2, 0.0012)
              ..rotateY(angle);

            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  widget.title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 20),
                Transform.scale(
                  scale: 0.85 + 0.15 * scale,
                  child: Transform(
                    alignment: Alignment.center,
                    transform: rot,
                    child: SizedBox(
                      width: 160,
                      height: 160,
                      child: showFront ? _frontFace() : _backFace(),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                TextButton(
                  onPressed: _closeOnce,
                  child: const Text('Nice!', style: TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _frontFace() {
    final u = widget.imageUrl?.trim();
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: u != null && u.isNotEmpty
          ? CachedNetworkImage(imageUrl: u, fit: BoxFit.cover, width: 160, height: 160)
          : const Center(
              child: Icon(Icons.military_tech, size: 72, color: AppColors.primary),
            ),
    );
  }

  Widget _backFace() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white24, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      alignment: Alignment.center,
      child: const Icon(Icons.check_rounded, size: 88, color: AppColors.onPrimary),
    );
  }
}
