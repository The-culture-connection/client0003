import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../services/user_profile_repository.dart';
import 'content_suspension.dart';

/// UX helper: snackbar when the signed-in user’s profile has [content_suspended].
Future<bool> blockContentActionIfSuspended(BuildContext context) async {
  final uid = FirebaseAuth.instance.currentUser?.uid;
  if (uid == null) return true;
  final suspended = await UserProfileRepository().isContentSuspended(uid);
  if (!suspended) return false;
  if (context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text(kContentSuspendedUserMessage)),
    );
  }
  return true;
}
