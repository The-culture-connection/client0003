import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../analytics/expansion_analytics.dart';
import '../auth/auth_controller.dart';
import '../services/expansion_session_service.dart';
import '../theme/app_theme.dart';

/// For an **already signed-in** account (open sign-up, or Conference-only)
/// that wants to unlock the Expansion Network. Unlike [AuthClaimScreen] (which
/// creates a brand-new Auth account from a code), this just links an invite
/// code to the current account via the authenticated `finalizeInviteClaim`
/// callable, then reloads the session gate.
class ExpansionEnterCodeScreen extends StatefulWidget {
  const ExpansionEnterCodeScreen({super.key});

  @override
  State<ExpansionEnterCodeScreen> createState() => _ExpansionEnterCodeScreenState();
}

class _ExpansionEnterCodeScreenState extends State<ExpansionEnterCodeScreen> {
  final _code = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final _session = ExpansionSessionService();
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(
        ExpansionAnalytics.log('expansion_enter_code_screen_started', sourceScreen: 'expansion_enter_code'),
      );
    });
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  String _mapError(String? code) {
    switch (code) {
      case 'NOT_ELIGIBLE':
        return 'This email is not on the Expansion Network invite list.';
      case 'USED':
        return 'This invite code has already been used.';
      case 'EXPIRED':
        return 'This invite code has expired. Please contact an administrator for a new one.';
      case 'NO_INVITE':
      case 'INVALID':
      case 'REVOKED':
      default:
        return 'This invite code is invalid.';
    }
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    await ExpansionAnalytics.log('expansion_enter_code_submitted', sourceScreen: 'expansion_enter_code');
    try {
      final data = await _session.finalizeInviteClaim(inviteCode: _code.text);
      if (data['ok'] != true) {
        final code = data['code'] as String?;
        final msg = data['message'] as String?;
        await ExpansionAnalytics.log(
          'expansion_enter_code_failed',
          sourceScreen: 'expansion_enter_code',
          extra: <String, Object?>{'error_code': code ?? 'unknown'},
        );
        setState(() => _error = msg ?? _mapError(code));
        return;
      }
      await ExpansionAnalytics.log('expansion_enter_code_succeeded', sourceScreen: 'expansion_enter_code');
      if (!mounted) return;
      await context.read<AuthController>().reloadProfileGate();
      if (!mounted) return;
      // Straight into the Networking Hall rather than back to the Mortarverse
      // chooser — the router's redirect guard still forces `/onboarding` first
      // if that's somehow still needed, so this is safe even in that edge case.
      context.go('/home');
    } catch (e) {
      await ExpansionAnalytics.log(
        'expansion_enter_code_failed',
        sourceScreen: 'expansion_enter_code',
        extra: ExpansionAnalytics.errorExtras(e, code: 'finalize_invite'),
      );
      setState(() => _error = userMessageForFirebaseCallableError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final email = FirebaseAuth.instance.currentUser?.email ?? '';
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Back to the MORTARVERSE',
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/mortarverse');
            }
          },
        ),
        title: const Text('Enter invite code'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Enter the invite code you received to unlock the Expansion Network '
                  'for $email.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.mutedForeground,
                      ),
                ),
                const SizedBox(height: 24),
                TextFormField(
                  controller: _code,
                  autocorrect: false,
                  decoration: const InputDecoration(labelText: 'Invite code'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter your code' : null,
                ),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(_error!, style: const TextStyle(color: Colors.redAccent)),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: _busy ? null : _submit,
                  child: _busy
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                        )
                      : const Text('Unlock Expansion Network'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
