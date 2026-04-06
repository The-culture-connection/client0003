import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../constants/alumni_network_constants.dart';
import '../services/expansion_session_service.dart';
import '../theme/app_theme.dart';

enum _ClaimStep {
  /// Email + invite code, then Continue.
  emailAndCode,

  /// New Firebase user: password + confirm.
  passwordNewAccount,

  /// Existing Firebase user: single password, then sign in + finalize invite server-side.
  passwordExistingAccount,
}

/// First-time access: validate email + code, then either create a password or sign in once.
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

  _ClaimStep _step = _ClaimStep.emailAndCode;
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

  String _mapValidateCode(String? code) {
    switch (code) {
      case 'NOT_ELIGIBLE':
        return kAlumniNetworkAccessDeniedMessage;
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
        return 'An account already exists for this email. Enter your password below to finish claiming your invite.';
      case 'INVALID_CODE':
      case 'NO_INVITE':
      case 'REVOKED':
      default:
        return 'This invite code is invalid.';
    }
  }

  Future<void> _continueFromEmailAndCode() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final data = await _session.validateInviteCode(
        email: _email.text,
        inviteCode: _code.text,
      );
      final valid = data['valid'] == true;
      if (!valid) {
        final code = data['code'] as String?;
        setState(() => _error = _mapValidateCode(code));
        return;
      }
      final existing = data['authAccountExists'] == true;
      setState(() {
        _password.clear();
        _confirm.clear();
        _step = existing
            ? _ClaimStep.passwordExistingAccount
            : _ClaimStep.passwordNewAccount;
      });
    } catch (e) {
      setState(() => _error = userMessageForFirebaseCallableError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submitNewAccount() async {
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
        if (code == 'ALREADY_EXISTS') {
          setState(() {
            _authAccountExistsFallback();
            _error = _mapClaimError(code);
          });
          return;
        }
        setState(() => _error = _mapClaimError(code));
        return;
      }
      final usePasswordSignIn = data['signInWithEmailPassword'] == true;
      if (usePasswordSignIn) {
        await FirebaseAuth.instance.signInWithEmailAndPassword(
          email: _email.text.trim(),
          password: _password.text,
        );
      } else {
        final token = data['customToken'] as String?;
        if (token == null || token.isEmpty) {
          setState(() => _error = 'Claim succeeded but no session token returned.');
          return;
        }
        await FirebaseAuth.instance.signInWithCustomToken(token);
      }
      if (mounted) context.go('/session');
    } catch (e) {
      if (e is FirebaseFunctionsException && e.code == 'already-exists') {
        setState(() {
          _authAccountExistsFallback();
          _error = e.message?.trim().isNotEmpty == true
              ? e.message!
              : _mapClaimError('ALREADY_EXISTS');
        });
        return;
      }
      setState(() => _error = userMessageForFirebaseCallableError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _authAccountExistsFallback() {
    _password.clear();
    _confirm.clear();
    _step = _ClaimStep.passwordExistingAccount;
  }

  Future<void> _submitExistingAccount() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final email = _email.text.trim();
      await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email,
        password: _password.text,
      );
      final fin = await _session.finalizeInviteClaim(inviteCode: _code.text);
      if (fin['ok'] != true) {
        await FirebaseAuth.instance.signOut();
        final msg = fin['message'] as String?;
        final code = fin['code'] as String?;
        setState(() {
          _error = msg ?? _mapClaimError(code);
        });
        return;
      }
      if (mounted) context.go('/session');
    } on FirebaseAuthException catch (e) {
      setState(() {
        _error = e.message ?? 'Sign-in failed. Check your password.';
      });
    } catch (e) {
      await FirebaseAuth.instance.signOut();
      setState(() => _error = userMessageForFirebaseCallableError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _goBackToEmailAndCode() {
    setState(() {
      _step = _ClaimStep.emailAndCode;
      _password.clear();
      _confirm.clear();
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final title = switch (_step) {
      _ClaimStep.emailAndCode => 'Claim your account',
      _ClaimStep.passwordNewAccount => 'Create your password',
      _ClaimStep.passwordExistingAccount => 'Sign in to finish',
    };

    final subtitle = switch (_step) {
      _ClaimStep.emailAndCode =>
        'Enter the email and one-time code from your administrator. You will set a password or sign in next.',
      _ClaimStep.passwordNewAccount =>
        'Choose a password for your new account (at least 6 characters).',
      _ClaimStep.passwordExistingAccount =>
        'This email already has a Mortar account. Enter your password once to link your invite and open the app.',
    };

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_step != _ClaimStep.emailAndCode) {
              _goBackToEmailAndCode();
            } else {
              context.go('/');
            }
          },
        ),
        title: Text(title),
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
                  subtitle,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.mutedForeground,
                      ),
                ),
                const SizedBox(height: 24),
                if (_step == _ClaimStep.emailAndCode) ...[
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
                ],
                if (_step == _ClaimStep.passwordNewAccount) ...[
                  _readOnlySummary(),
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
                ],
                if (_step == _ClaimStep.passwordExistingAccount) ...[
                  _readOnlySummary(),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _password,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                    ),
                    validator: (v) {
                      if (v == null || v.isEmpty) return 'Enter your password';
                      if (v.length < 6) return 'At least 6 characters';
                      return null;
                    },
                  ),
                ],
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
                  onPressed: _busy
                      ? null
                      : () async {
                          switch (_step) {
                            case _ClaimStep.emailAndCode:
                              await _continueFromEmailAndCode();
                            case _ClaimStep.passwordNewAccount:
                              await _submitNewAccount();
                            case _ClaimStep.passwordExistingAccount:
                              await _submitExistingAccount();
                          }
                        },
                  child: _busy
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.onPrimary,
                          ),
                        )
                      : Text(switch (_step) {
                          _ClaimStep.emailAndCode => 'Continue',
                          _ClaimStep.passwordNewAccount => 'Create account',
                          _ClaimStep.passwordExistingAccount => 'Sign in & finish',
                        }),
                ),
                if (_step != _ClaimStep.emailAndCode) ...[
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: _busy ? null : _goBackToEmailAndCode,
                    child: const Text('Edit email or code'),
                  ),
                ],
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

  Widget _readOnlySummary() {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Email', style: Theme.of(context).textTheme.labelSmall),
            Text(_email.text.trim(), style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 8),
            Text('Invite code', style: Theme.of(context).textTheme.labelSmall),
            Text(_code.text.trim(), style: Theme.of(context).textTheme.bodyLarge),
          ],
        ),
      ),
    );
  }
}
