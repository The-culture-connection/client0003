import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../conference/conference_analytics.dart';
import '../services/member_card_link.dart';
import '../theme/app_theme.dart';
import '../widgets/qr_scan_view.dart';

/// Camera view for the "Scan" tab of [MemberCardScreen].
///
/// A valid card opens the 1:1 chat immediately — no confirmation step. All the
/// camera lifecycle, permission and torch handling lives in [QrScanView]; this
/// only decides what a decoded string means.
class MemberCardScanView extends StatelessWidget {
  const MemberCardScanView({
    super.key,
    required this.active,
    this.accent = AppColors.primary,
  });

  /// Whether this view's tab is the visible one.
  final bool active;

  final Color accent;

  void _toast(BuildContext context, String message) {
    ScaffoldMessenger.maybeOf(context)
      ?..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<ScanOutcome> _onCode(BuildContext context, String raw) async {
    final uid = parseMemberCardPayload(raw);
    if (uid == null) {
      logConferenceEvent(() => ConferenceAnalytics.cardScanned(result: 'invalid'));
      _toast(context, 'That’s not a MORTAR card.');
      return ScanOutcome.keepScanning;
    }
    if (uid == FirebaseAuth.instance.currentUser?.uid) {
      logConferenceEvent(() => ConferenceAnalytics.cardScanned(result: 'self'));
      _toast(context, 'That’s your own card 🙂');
      return ScanOutcome.keepScanning;
    }
    logConferenceEvent(
      () => ConferenceAnalytics.cardScanned(result: 'ok', scannedUid: uid),
    );

    // Awaited so the camera comes back if the user backs out of the chat —
    // this tab stays alive underneath it.
    await context.push<void>('/messages/direct/$uid');
    return ScanOutcome.handled;
  }

  @override
  Widget build(BuildContext context) {
    return QrScanView(
      active: active,
      accent: accent,
      hint: 'Point at a member’s code to open a chat',
      onCode: (raw) => _onCode(context, raw),
    );
  }
}
