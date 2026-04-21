import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../analytics/expansion_analytics.dart';
import '../services/user_profile_repository.dart';
import 'content_suspension.dart';

/// UX helper: snackbar when the signed-in user’s profile has [content_suspended].
///
/// When [blockedSurfaceEvent] is set, that event is logged (Phase 3 surface-specific friction).
/// Otherwise logs [content_action_blocked_suspended].
Future<bool> blockContentActionIfSuspended(
  BuildContext context, {
  String? blockedSurfaceEvent,
}) async {
  final uid = FirebaseAuth.instance.currentUser?.uid;
  if (uid == null) return true;
  final suspended = await UserProfileRepository().isContentSuspended(uid);
  if (!suspended) return false;
  if (blockedSurfaceEvent != null) {
    unawaited(
      ExpansionAnalytics.log(
        blockedSurfaceEvent,
        sourceScreen: 'content_guard',
        extra: const <String, Object?>{'reason': 'content_suspended'},
      ),
    );
  } else {
    unawaited(
      ExpansionAnalytics.log(
        'content_action_blocked_suspended',
        sourceScreen: 'content_guard',
        extra: const <String, Object?>{'reason': 'content_suspended'},
      ),
    );
  }
  if (context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text(kContentSuspendedUserMessage)),
    );
  }
  return true;
}
