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

class AuthSignInScreen extends StatefulWidget {
  const AuthSignInScreen({super.key});

  @override
  State<AuthSignInScreen> createState() => _AuthSignInScreenState();
}

class _AuthSignInScreenState extends State<AuthSignInScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(
        ExpansionAnalytics.log('auth_sign_in_screen_started', sourceScreen: 'auth_sign_in'),
      );
    });
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    // Held across the awaits below: signing in makes the router redirect off
    // `/auth/*`, which unmounts this screen — reading it from `context`
    // afterwards would be too late to flag the welcome intro.
    final auth = context.read<AuthController>();
    await ExpansionAnalytics.log('auth_sign_in_submitted', sourceScreen: 'auth_sign_in');
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: _email.text.trim(),
        password: _password.text,
      );
      auth.markWelcomeIntroPending();
      if (mounted) {
        await ExpansionAnalytics.log('auth_sign_in_succeeded', sourceScreen: 'auth_sign_in');
        if (!mounted) return;
        context.go('/session');
      }
    } on FirebaseAuthException catch (e) {
      await ExpansionAnalytics.log(
        'auth_sign_in_failed',
        sourceScreen: 'auth_sign_in',
        extra: <String, Object?>{'code': e.code},
      );
      setState(() => _error = e.message ?? e.code);
    } catch (e) {
      await ExpansionAnalytics.log(
        'auth_sign_in_failed',
        sourceScreen: 'auth_sign_in',
        extra: <String, Object?>{'code': 'unknown'},
      );
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  // Mockup field styling: italic tracked label above a translucent bar
  // with a white underline.
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
          onPressed: () {
            unawaited(
              ExpansionAnalytics.log('auth_sign_in_back_to_landing', sourceScreen: 'auth_sign_in'),
            );
            context.go('/');
          },
        ),
        title: const Text('SIGN IN'),
      ),
      body: Stack(
        children: [
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
              child: TornPanel(
                seed: 8,
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
                        const SizedBox(height: 28),
                const Text('EMAIL', textAlign: TextAlign.center, style: _fieldLabel),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: _fieldDecoration,
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Enter your email' : null,
                ),
                const SizedBox(height: 16),
                const Text('PASSWORD', textAlign: TextAlign.center, style: _fieldLabel),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _password,
                  obscureText: true,
                  decoration: _fieldDecoration,
                  validator: (v) =>
                      (v == null || v.isEmpty) ? 'Enter your password' : null,
                ),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(_error!, style: const TextStyle(color: Colors.redAccent)),
                ],
                const SizedBox(height: 24),
                GlowPillButton(
                  label: 'Sign in',
                  filled: true,
                  expand: true,
                  busy: _busy,
                  onPressed: _submit,
                ),
                const SizedBox(height: 26),
                const Text(
                  "HAVEN'T JOINED THE CREW YET?",
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
                    label: 'Sign up',
                    onPressed: () => context.push('/auth/sign-up'),
                  ),
                ),
                TextButton(
                  onPressed: () {
                    unawaited(
                      ExpansionAnalytics.log('auth_sign_in_navigate_to_claim', sourceScreen: 'auth_sign_in'),
                    );
                    context.push('/auth/claim');
                  },
                  child: const Text('Have an invite? Claim account'),
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
