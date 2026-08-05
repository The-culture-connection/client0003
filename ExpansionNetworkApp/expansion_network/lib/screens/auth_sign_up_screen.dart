import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../analytics/expansion_analytics.dart';
import '../auth/auth_controller.dart';
import '../mortarverse/widgets/torn_panel.dart';
import '../theme/app_theme.dart';

/// Open account creation — no invite code required. Anyone can create a
/// Mortarverse account this way and reach the chooser; entering the
/// Expansion Network specifically still requires an invite code (see
/// [ExpansionEnterCodeScreen]). Mirrors [AuthSignInScreen]'s structure.
class AuthSignUpScreen extends StatefulWidget {
  const AuthSignUpScreen({super.key});

  @override
  State<AuthSignUpScreen> createState() => _AuthSignUpScreenState();
}

class _AuthSignUpScreenState extends State<AuthSignUpScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(
        ExpansionAnalytics.log('auth_sign_up_screen_started', sourceScreen: 'auth_sign_up'),
      );
    });
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    // Held across the awaits below — see AuthSignInScreen._submit for why.
    final auth = context.read<AuthController>();
    await ExpansionAnalytics.log('auth_sign_up_submitted', sourceScreen: 'auth_sign_up');
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await FirebaseAuth.instance.createUserWithEmailAndPassword(
        email: _email.text.trim(),
        password: _password.text,
      );
      auth.markWelcomeIntroPending();
      if (mounted) {
        await ExpansionAnalytics.log('auth_sign_up_succeeded', sourceScreen: 'auth_sign_up');
        if (!mounted) return;
        context.go('/session');
      }
    } on FirebaseAuthException catch (e) {
      await ExpansionAnalytics.log(
        'auth_sign_up_failed',
        sourceScreen: 'auth_sign_up',
        extra: <String, Object?>{'code': e.code},
      );
      setState(() {
        _error = e.code == 'email-already-in-use'
            ? 'An account already exists for this email. Try signing in instead.'
            : e.message ?? e.code;
      });
    } catch (e) {
      await ExpansionAnalytics.log(
        'auth_sign_up_failed',
        sourceScreen: 'auth_sign_up',
        extra: <String, Object?>{'code': 'unknown'},
      );
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/'),
        ),
        title: const Text('CREATE ACCOUNT'),
      ),
      body: Stack(
        children: [
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
              child: TornPanel(
                seed: 9,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 40, 24, 28),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'MORTARVERSE',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: 'ArchivoBlack',
                            color: AppColors.foreground,
                            fontSize: 20,
                            letterSpacing: 2.4,
                          ),
                        ),
                        const SizedBox(height: 24),
                Text(
                  'No invite code needed — sign up, then choose Networking Hall or '
                  'Conference Center. An invite code is only required to enter the '
                  'Expansion Network specifically.',
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
                  controller: _password,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Password (min 6 characters)'),
                  validator: (v) => (v == null || v.length < 6) ? 'At least 6 characters' : null,
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
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
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
            ),
          ),
        ],
      ),
    );
  }
}
