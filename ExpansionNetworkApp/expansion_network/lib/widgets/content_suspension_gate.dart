import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../router/app_router.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../utils/content_suspension.dart';

const String kContentSuspensionInvestigationDialogBody =
    'You have been reported, your profile is under investigation.';

/// Shows a one-time-per-suspension-period dialog when `users/{uid}.content_suspended` (or `under_investigation`) is true.
class ContentSuspensionGate extends StatefulWidget {
  const ContentSuspensionGate({required this.child, super.key});

  final Widget? child;

  @override
  State<ContentSuspensionGate> createState() => _ContentSuspensionGateState();
}

class _ContentSuspensionGateState extends State<ContentSuspensionGate> {
  final _users = UserProfileRepository();
  StreamSubscription<User?>? _authSub;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _docSub;
  bool _shownForCurrentSuspension = false;
  bool _dialogOpen = false;

  @override
  void initState() {
    super.initState();
    _authSub = FirebaseAuth.instance.authStateChanges().listen(_onAuthUser);
  }

  void _onAuthUser(User? user) {
    _docSub?.cancel();
    _docSub = null;
    _shownForCurrentSuspension = false;
    if (user == null) return;
    _docSub = _users.watchUserDoc(user.uid).listen(_onUserDoc);
  }

  void _onUserDoc(DocumentSnapshot<Map<String, dynamic>> snap) {
    final data = snap.data();
    final suspended = isProfileContentSuspended(data);
    if (!suspended) {
      _shownForCurrentSuspension = false;
      return;
    }
    if (_shownForCurrentSuspension || _dialogOpen) return;
    _shownForCurrentSuspension = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _showInvestigationDialog();
    });
  }

  Future<void> _showInvestigationDialog() async {
    if (!mounted || _dialogOpen) return;
    final nav = expansionRootNavigatorKey.currentState;
    if (nav == null) return;
    _dialogOpen = true;
    try {
      await showDialog<void>(
        context: nav.context,
        barrierDismissible: true,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.card,
          title: const Text(
            'Account under review',
            style: TextStyle(color: AppColors.foreground, fontWeight: FontWeight.w600),
          ),
          content: const Text(
            kContentSuspensionInvestigationDialogBody,
            style: TextStyle(color: AppColors.foreground, height: 1.35),
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop(),
              style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    } finally {
      _dialogOpen = false;
    }
  }

  @override
  void dispose() {
    _authSub?.cancel();
    _docSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.child ?? const SizedBox.shrink();
  }
}
