import 'package:cached_network_image/cached_network_image.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../profile/profile_utils.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import 'user_profile_modal.dart';

/// One RSVP row: tappable for profile modal; optional **Message** for other users.
class EventRsvpAttendeeTile extends StatelessWidget {
  const EventRsvpAttendeeTile({
    super.key,
    required this.userId,
    this.dense = false,
  });

  final String userId;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    if (userId.isEmpty) return const SizedBox.shrink();
    final me = FirebaseAuth.instance.currentUser?.uid;
    final repo = UserProfileRepository();
    final radius = dense ? 18.0 : 22.0;

    return Padding(
      padding: EdgeInsets.only(bottom: dense ? 8 : 10),
      child: Material(
        color: AppColors.card,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => showUserProfileModal(context, userId: userId),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: dense ? 10 : 12, vertical: dense ? 8 : 12),
            child: FutureBuilder<Map<String, dynamic>?>(
              future: repo.getUserDoc(userId),
              builder: (context, snap) {
                final d = snap.data;
                final name = d != null ? profileDisplayName(d) : (snap.connectionState == ConnectionState.waiting ? '…' : 'Member');
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
                          fontWeight: FontWeight.w500,
                          fontSize: dense ? 13 : 15,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (me != null && userId != me)
                      TextButton(
                        onPressed: () => context.push('/messages/direct/$userId'),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text('Message'),
                      ),
                    Icon(Icons.chevron_right, color: AppColors.mutedForeground, size: dense ? 18 : 20),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
