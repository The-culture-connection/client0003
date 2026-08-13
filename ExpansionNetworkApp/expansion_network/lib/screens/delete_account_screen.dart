import 'dart:async';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../analytics/expansion_analytics.dart';
import '../services/expansion_session_service.dart'
    show userMessageForFirebaseCallableError;
import '../theme/app_theme.dart';
import '../theme/cosmic_content.dart';
import '../widgets/page_header.dart';

/// Permanent, self-service account deletion.
///
/// Required by App Store Guideline 5.1.1(v): an app that supports account
/// creation must let the user delete the account from inside the app, without
/// being sent to support and without "deactivate" standing in for delete. The
/// caller is already signed in, so nothing is verified by email — confirming
/// here runs the deletion.
///
/// The confirmation is a typed phrase rather than a second button, because this
/// is irreversible and a mis-tap must not be able to reach it.
class DeleteAccountScreen extends StatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  static const String _confirmPhrase = 'DELETE';

  final TextEditingController _confirmController = TextEditingController();
  final TextEditingController _reasonController = TextEditingController();

  bool _acknowledged = false;
  bool _deleting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(ExpansionAnalytics.log(
        'account_delete_screen_viewed',
        sourceScreen: 'delete_account',
      ));
    });
  }

  @override
  void dispose() {
    _confirmController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  bool get _canDelete =>
      _acknowledged &&
      _confirmController.text.trim().toUpperCase() == _confirmPhrase &&
      !_deleting;

  Future<void> _delete() async {
    if (!_canDelete) return;
    setState(() {
      _deleting = true;
      _error = null;
    });
    unawaited(ExpansionAnalytics.log(
      'account_delete_confirmed',
      sourceScreen: 'delete_account',
    ));
    try {
      final callable = FirebaseFunctions.instanceFor(region: 'us-central1')
          .httpsCallable('deleteMyAccount');
      final result = await callable.call<Map<String, dynamic>>(<String, dynamic>{
        'confirm': _confirmPhrase,
        if (_reasonController.text.trim().isNotEmpty)
          'reason': _reasonController.text.trim(),
      });
      final reference = result.data['reference']?.toString() ?? '';

      // The server has already deleted the Auth user, so the local session is
      // stale — sign out to clear it rather than leaving a dead token behind.
      try {
        await FirebaseAuth.instance.signOut();
      } catch (_) {
        // The account is gone either way; a failed local sign-out must not
        // present as a failed deletion.
      }
      if (!mounted) return;
      await _showDeletedDialog(reference);
      if (!mounted) return;
      context.go('/');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _deleting = false;
        _error = userMessageForFirebaseCallableError(e);
      });
    }
  }

  Future<void> _showDeletedDialog(String reference) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        title: const Row(
          children: [
            Icon(Icons.check_circle_rounded, color: Color(0xFF34D399)),
            SizedBox(width: 10),
            Expanded(child: Text('Account deleted')),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Your MORTAR account and the data listed on the previous screen '
              'have been permanently deleted. You have been signed out.',
              style: TextStyle(height: 1.4),
            ),
            if (reference.isNotEmpty) ...[
              const SizedBox(height: 14),
              Text(
                'Reference: $reference',
                style: const TextStyle(
                  fontFeatures: [FontFeature.tabularFigures()],
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Keep this if you need to contact us about the deletion.',
                style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
              ),
            ],
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final email = FirebaseAuth.instance.currentUser?.email ?? '';

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            PageHeader(
              title: 'Delete account',
              subtitle: 'Permanently delete your MORTAR account and data.',
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: _deleting
                    ? null
                    : () => context.canPop()
                        ? context.pop()
                        : context.go('/commons/profile'),
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(Cosmic.gutter, 16, Cosmic.gutter, 32),
                children: [
                  _warningBanner(email),
                  const SizedBox(height: 20),
                  _section(
                    title: 'What gets deleted',
                    icon: Icons.delete_outline_rounded,
                    items: const [
                      'Your account, sign-in, and profile, including your photo',
                      'Posts, comments, replies and discussions you created',
                      'Your direct messages and group memberships',
                      'Event, conference and session registrations, and check-ins',
                      'Badges, missions, and course or quiz progress',
                      'Your networking profile, matches and connection activity',
                      'Usage analytics linked to your account',
                    ],
                  ),
                  const SizedBox(height: 16),
                  _section(
                    title: 'What we keep, and why',
                    icon: Icons.gavel_rounded,
                    items: const [
                      'Purchase and payment records — we are legally required to '
                          'keep financial records for tax and accounting.',
                      'Safety and moderation records — reports you filed about '
                          'someone else are kept so they stay actionable.',
                      'Aggregated statistics — totals that no longer identify '
                          'you and cannot be traced back to you.',
                    ],
                  ),
                  const SizedBox(height: 24),
                  _confirmBlock(),
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    _errorBox(_error!),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFB3261E),
                        foregroundColor: Colors.white,
                        disabledBackgroundColor:
                            const Color(0xFFB3261E).withValues(alpha: 0.3),
                        disabledForegroundColor: Colors.white.withValues(alpha: 0.5),
                        padding: const EdgeInsets.all(16),
                      ),
                      onPressed: _canDelete ? _delete : null,
                      child: _deleting
                          ? const SizedBox(
                              height: 22,
                              width: 22,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : const Text('Delete my account permanently',
                              style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Center(
                    child: TextButton(
                      onPressed: _deleting
                          ? null
                          : () => context.canPop()
                              ? context.pop()
                              : context.go('/commons/profile'),
                      child: const Text('Cancel — keep my account'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _warningBanner(String email) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFB3261E).withValues(alpha: 0.12),
        borderRadius: Cosmic.chipRadius,
        border: Border.all(color: const Color(0xFFB3261E).withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Color(0xFFFF8B95), size: 20),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'This cannot be undone',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            email.isEmpty
                ? 'Deleting your account removes it immediately and permanently. '
                    'There is no recovery and no grace period.'
                : 'Deleting removes $email immediately and permanently. There is '
                    'no recovery and no grace period.',
            style: const TextStyle(height: 1.45, color: AppColors.mutedForeground),
          ),
        ],
      ),
    );
  }

  Widget _section({
    required String title,
    required IconData icon,
    required List<String> items,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: Cosmic.chipRadius,
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: AppColors.mutedForeground),
              const SizedBox(width: 8),
              Text(title,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            ],
          ),
          const SizedBox(height: 12),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 6, right: 8),
                    child: SizedBox(
                      width: 4,
                      height: 4,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: AppColors.mutedForeground,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(item,
                        style: const TextStyle(
                            fontSize: 13,
                            height: 1.4,
                            color: AppColors.mutedForeground)),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _confirmBlock() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Confirm', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
        const SizedBox(height: 12),
        InkWell(
          onTap: _deleting ? null : () => setState(() => _acknowledged = !_acknowledged),
          borderRadius: Cosmic.chipRadius,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Checkbox(
                  value: _acknowledged,
                  onChanged: _deleting
                      ? null
                      : (v) => setState(() => _acknowledged = v ?? false),
                  activeColor: const Color(0xFFB3261E),
                ),
                const Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(top: 12),
                    child: Text(
                      'I understand this permanently deletes my account and the '
                      'data listed above, and that it cannot be undone.',
                      style: TextStyle(fontSize: 13, height: 1.4),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        const Text(
          'Type DELETE to confirm',
          style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _confirmController,
          enabled: !_deleting,
          autocorrect: false,
          enableSuggestions: false,
          textCapitalization: TextCapitalization.characters,
          inputFormatters: [LengthLimitingTextInputFormatter(10)],
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            hintText: _confirmPhrase,
            filled: true,
            fillColor: AppColors.background,
            border: OutlineInputBorder(
              borderRadius: Cosmic.chipRadius,
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: Cosmic.chipRadius,
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: Cosmic.chipRadius,
              borderSide: const BorderSide(color: Color(0xFFB3261E)),
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Anything you want us to know? (optional)',
          style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _reasonController,
          enabled: !_deleting,
          minLines: 2,
          maxLines: 4,
          maxLength: 2000,
          decoration: InputDecoration(
            filled: true,
            fillColor: AppColors.background,
            border: OutlineInputBorder(
              borderRadius: Cosmic.chipRadius,
              borderSide: const BorderSide(color: AppColors.border),
            ),
          ),
        ),
      ],
    );
  }

  Widget _errorBox(String message) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFB3261E).withValues(alpha: 0.1),
        borderRadius: Cosmic.chipRadius,
        border: Border.all(color: const Color(0xFFB3261E).withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("We couldn't delete your account",
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 6),
          Text(message,
              style: const TextStyle(
                  fontSize: 12.5, height: 1.4, color: AppColors.mutedForeground)),
          const SizedBox(height: 8),
          const Text(
            'Your account has not been changed. Try again, or email '
            'masters@wearemortar.com and we will do it for you.',
            style: TextStyle(fontSize: 12.5, height: 1.4, color: AppColors.mutedForeground),
          ),
        ],
      ),
    );
  }
}
