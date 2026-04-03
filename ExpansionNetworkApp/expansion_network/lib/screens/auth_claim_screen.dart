import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../constants/alumni_network_constants.dart';
import '../services/expansion_session_service.dart';
import '../theme/app_theme.dart';

/// First-time access: email + one-time invite code + password (Cloud Function validates).
class AuthClaimScreen extends StatefulWidget {
  const AuthClaimScreen({super.key});

  @override
  State<AuthClaimScreen> createState() => _AuthClaimScreenState();
}

class _AuthClaimScreenState extends State<AuthClaimScreen> {
  final _email = TextEditingController();
  final _code = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final _session = ExpansionSessionService();

  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  String _mapClaimError(String? code) {
    switch (code) {
      case 'NOT_ELIGIBLE':
        return kAlumniNetworkAccessDeniedMessage;
      case 'NO_NETWORK_ACCESS':
        return kSessionNoNetworkAccessMessage;
      case 'USED':
        return 'This invite code has already been used.';
      case 'EXPIRED':
        return 'This invite code has expired. Please contact an administrator for a new one.';
      case 'ALREADY_EXISTS':
        return 'An account already exists for this email. Please log in instead.';
      case 'INVALID_CODE':
      case 'NO_INVITE':
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
    try {
      final data = await _session.claimInviteAndCreateAccount(
        email: _email.text,
        inviteCode: _code.text,
        password: _password.text,
      );
      final ok = data['ok'] == true;
      if (!ok) {
        final code = data['code'] as String?;
        setState(() => _error = _mapClaimError(code));
        return;
      }
      final token = data['customToken'] as String?;
      if (token == null || token.isEmpty) {
        setState(() => _error = 'Claim succeeded but no session token returned.');
        return;
      }
      await FirebaseAuth.instance.signInWithCustomToken(token);
      if (mounted) context.go('/');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/'),
        ),
        title: const Text('Claim your account'),
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
                  'Use the email and one-time code from your administrator.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.mutedForeground,
                      ),
                ),
                const SizedBox(height: 24),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  decoration: const InputDecoration(labelText: 'Email'),
                  validator: (v) {
                    final t = v?.trim() ?? '';
                    if (t.isEmpty) return 'Enter your email';
                    if (!t.contains('@')) return 'Enter a valid email';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _code,
                  autocorrect: false,
                  decoration: const InputDecoration(labelText: 'Invite code'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Enter your code' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _password,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Password (min 6 characters)',
                  ),
                  validator: (v) {
                    if (v == null || v.length < 6) return 'At least 6 characters';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _confirm,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Confirm password'),
                  validator: (v) => v != _password.text ? 'Passwords do not match' : null,
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
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.onPrimary,
                          ),
                        )
                      : const Text('Create account'),
                ),
                TextButton(
                  onPressed: () => context.push('/auth/sign-in'),
                  child: const Text('Already have an account? Sign in'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
