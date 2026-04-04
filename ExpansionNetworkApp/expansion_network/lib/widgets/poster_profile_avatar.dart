import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import 'user_profile_modal.dart';

/// Tappable avatar that opens [showUserProfileModal] for [userId].
class PosterProfileAvatar extends StatelessWidget {
  const PosterProfileAvatar({
    super.key,
    required this.userId,
    this.displayNameHint,
    this.radius = 18,
  });

  final String userId;
  final String? displayNameHint;
  final double radius;

  static String _initials(String? name) {
    if (name == null || name.trim().isEmpty) return '?';
    final parts = name.trim().split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return parts.first.length >= 2 ? parts.first.substring(0, 2).toUpperCase() : parts.first[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    if (userId.isEmpty) {
      return CircleAvatar(
        radius: radius,
        backgroundColor: AppColors.secondary,
        child: const Icon(Icons.person_outline, size: 18, color: AppColors.mutedForeground),
      );
    }
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => showUserProfileModal(context, userId: userId),
        customBorder: const CircleBorder(),
        child: CircleAvatar(
          radius: radius,
          backgroundColor: AppColors.primary,
          child: Text(
            _initials(displayNameHint),
            style: TextStyle(
              fontSize: radius * 0.65,
              fontWeight: FontWeight.w600,
              color: AppColors.onPrimary,
            ),
          ),
        ),
      ),
    );
  }
}
