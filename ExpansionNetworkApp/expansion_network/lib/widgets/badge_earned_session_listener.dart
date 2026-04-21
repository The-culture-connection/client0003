import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../router/app_router.dart';
import 'badge_flip_celebration_dialog.dart';

/// Listens for new `users/{uid}/notifications` docs with `type == badge_earned` and shows
/// [BadgeFlipCelebrationDialog] once per new document (skips the initial snapshot batch).
class BadgeEarnedSessionListener extends StatefulWidget {
  const BadgeEarnedSessionListener({required this.child, super.key});

  final Widget child;

  @override
  State<BadgeEarnedSessionListener> createState() => _BadgeEarnedSessionListenerState();
}

class _BadgeEarnedSessionListenerState extends State<BadgeEarnedSessionListener> {
  StreamSubscription<User?>? _authSub;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _sub;
  var _skipFirstSnapshot = true;

  @override
  void initState() {
    super.initState();
    _authSub = FirebaseAuth.instance.authStateChanges().listen((user) {
      _sub?.cancel();
      _sub = null;
      if (user != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _attachForUid(user.uid);
        });
      }
    });
  }

  void _attachForUid(String uid) {
    _sub?.cancel();
    _skipFirstSnapshot = true;
    _sub = FirebaseFirestore.instance
        .collection('users')
        .doc(uid)
        .collection('notifications')
        .limit(80)
        .snapshots()
        .listen((snap) => _onSnapshot(uid, snap));
  }

  Future<void> _onSnapshot(String uid, QuerySnapshot<Map<String, dynamic>> snap) async {
    if (_skipFirstSnapshot) {
      _skipFirstSnapshot = false;
      return;
    }
    if (!mounted) return;

    for (final ch in snap.docChanges) {
      if (ch.type != DocumentChangeType.added) continue;
      final doc = ch.doc;
      final m = doc.data();
      if (m == null) continue;
      if (m['type'] != 'badge_earned') continue;
      if (m['read'] == true) continue;
      final badgeId = m['badgeId'] as String? ?? '';
      final rawTitle = m['title'] as String?;
      final title = rawTitle != null && rawTitle.trim().isNotEmpty ? rawTitle.trim() : 'Badge earned';

      String? imageUrl;
      if (badgeId.isNotEmpty) {
        try {
          final def = await FirebaseFirestore.instance.collection('badge_definitions').doc(badgeId).get();
          final uu = def.data()?['image_url'];
          if (uu is String && uu.trim().isNotEmpty) imageUrl = uu.trim();
        } catch (_) {}
      }

      if (!mounted) return;
      final ctx = expansionRootNavigatorKey.currentContext;
      if (ctx == null || !ctx.mounted) continue;

      await showGeneralDialog<void>(
        context: ctx,
        barrierDismissible: true,
        barrierLabel: 'Dismiss',
        transitionDuration: const Duration(milliseconds: 200),
        pageBuilder: (dialogCtx, _, __) {
          return BadgeFlipCelebrationDialog(
            title: title,
            imageUrl: imageUrl,
            onDone: () => Navigator.of(dialogCtx).pop(),
          );
        },
      );

      try {
        await doc.reference.update({'read': true});
      } catch (_) {}
    }
  }

  @override
  void dispose() {
    _authSub?.cancel();
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
