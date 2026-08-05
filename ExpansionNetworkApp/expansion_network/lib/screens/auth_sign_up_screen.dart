import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../analytics/expansion_analytics.dart';
import '../auth/auth_controller.dart';
import '../mortarverse/widgets/glow_pill_button.dart';
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

  static const _fieldLabel = TextStyle(
    color: Color(0xFFDED7CB),
    fontSize: 12,
    fontStyle: FontStyle.italic,
    fontWeight: FontWeight.w600,
    letterSpacing: 3,
  );
  static const _fieldDecoration = InputDecoration(
    filled: true,
    fillColor: Color(0x30FFFFFF),
    border: UnderlineInputBorder(),
    enabledBorder: UnderlineInputBorder(
      borderSide: BorderSide(color: Colors.white, width: 1.4),
    ),
    focusedBorder: UnderlineInputBorder(
      borderSide: BorderSide(color: AppColors.primary, width: 2),
    ),
    contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 12),
  );

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
                Text('EMAIL', textAlign: TextAlign.center, style: _fieldLabel),
                const SizedBox(height: 8),
                                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  decoration: _fieldDecoration,
                  validator: (v) {
                    final t = v?.trim() ?? '';
                    if (t.isEmpty) return 'Enter your email';
                    if (!t.contains('@')) return 'Enter a valid email';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                Text('PASSWORD  ·  MIN 6 CHARACTERS', textAlign: TextAlign.center, style: _fieldLabel),
                const SizedBox(height: 8),
                                TextFormField(
                  controller: _password,
                  obscureText: true,
                  decoration: _fieldDecoration,
                  validator: (v) => (v == null || v.length < 6) ? 'At least 6 characters' : null,
                ),
                const SizedBox(height: 16),
                Text('CONFIRM PASSWORD', textAlign: TextAlign.center, style: _fieldLabel),
                const SizedBox(height: 8),
                                TextFormField(
                  controller: _confirm,
                  obscureText: true,
                  decoration: _fieldDecoration,
                  validator: (v) => v != _password.text ? 'Passwords do not match' : null,
                ),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(_error!, style: const TextStyle(color: Colors.redAccent)),
                ],
                const SizedBox(height: 24),
                GlowPillButton(
                  label: 'Create account',
                  filled: true,
                  expand: true,
                  busy: _busy,
                  onPressed: _submit,
                ),
                const SizedBox(height: 22),
                const Text(
                  'ALREADY IN THE CREW?',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12.5,
                    fontStyle: FontStyle.italic,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
                  ),
                ),
                const SizedBox(height: 10),
                Center(
                  child: GlowPillButton(
                    label: 'Sign in',
                    onPressed: () => context.push('/auth/sign-in'),
                  ),
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
