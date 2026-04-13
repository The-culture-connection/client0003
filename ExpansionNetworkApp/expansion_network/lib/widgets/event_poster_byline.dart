import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../profile/profile_utils.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import 'user_profile_modal.dart';

/// “Posted by” with avatar + name; tap opens [showUserProfileModal] for [userId].
class EventPosterByline extends StatelessWidget {
  const EventPosterByline({
    super.key,
    required this.userId,
    this.dense = false,
  });

  final String userId;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    if (userId.isEmpty) return const SizedBox.shrink();
    final repo = UserProfileRepository();
    final radius = dense ? 18.0 : 22.0;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          'Posted by',
          style: TextStyle(
            fontSize: dense ? 12 : 13,
            color: AppColors.mutedForeground,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => showUserProfileModal(context, userId: userId),
              borderRadius: BorderRadius.circular(10),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                child: FutureBuilder<Map<String, dynamic>?>(
                  future: repo.getUserDoc(userId),
                  builder: (context, snap) {
                    final d = snap.data;
                    final name = d != null
                        ? profileDisplayName(d)
                        : (snap.connectionState == ConnectionState.waiting ? '…' : 'Member');
                    final photoUrl = d != null ? profileString(d['photo_url']) : null;
                    final initials = d != null ? profileInitials(d) : '?';

                    return Row(
                      children: [
                        CircleAvatar(
                          radius: radius,
                          backgroundColor: AppColors.primary,
                          backgroundImage:
                              photoUrl != null ? CachedNetworkImageProvider(photoUrl) : null,
                          child: photoUrl == null
                              ? Text(
                                  initials,
                                  style: TextStyle(
                                    fontSize: radius * 0.55,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.onPrimary,
                                  ),
                                )
                              : null,
                        ),
                        SizedBox(width: dense ? 10 : 12),
                        Expanded(
                          child: Text(
                            name,
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: dense ? 14 : 15,
                              color: AppColors.foreground,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
