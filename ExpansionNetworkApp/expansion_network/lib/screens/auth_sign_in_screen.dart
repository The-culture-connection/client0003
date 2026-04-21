import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../analytics/expansion_analytics.dart';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            unawaited(
              ExpansionAnalytics.log('auth_sign_in_back_to_landing', sourceScreen: 'auth_sign_in'),
            );
            context.go('/');
          },
        ),
        title: const Text('Sign in'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Enter your email' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _password,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Password'),
                  validator: (v) =>
                      (v == null || v.isEmpty) ? 'Enter your password' : null,
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
                      : const Text('Sign in'),
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
    );
  }
}
