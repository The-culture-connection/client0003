import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../analytics/expansion_analytics.dart';
import '../auth/auth_controller.dart';
import '../theme/app_theme.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  AuthController? _auth;

  @override
  void initState() {
    super.initState();
    _auth = context.read<AuthController>();
    _auth!.addListener(_onAuthChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(ExpansionAnalytics.log('landing_screen_started', sourceScreen: 'landing'));
      _showAccessDeniedIfNeeded();
    });
  }

  @override
  void dispose() {
    _auth?.removeListener(_onAuthChanged);
    super.dispose();
  }

  void _onAuthChanged() => _showAccessDeniedIfNeeded();

  void _showAccessDeniedIfNeeded() {
    final auth = context.read<AuthController>();
    final msg = auth.takeAccessDeniedMessage();
    if (!mounted || msg == null) return;
    final preview = msg.length > 160 ? '${msg.substring(0, 157)}…' : msg;
    unawaited(
      ExpansionAnalytics.log(
        'landing_access_denied_dialog_shown',
        sourceScreen: 'landing',
        extra: <String, Object?>{'message_preview': preview},
      ),
    );
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign-in unavailable'),
        content: Text(msg),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Text(
                'Mortar Alumni Network',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.foreground,
                    ),
              ),
              const SizedBox(height: 12),
              Text(
                'Connect with alumni. Grow your network.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.mutedForeground,
                    ),
              ),
              const Spacer(),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: () {
                  unawaited(
                    ExpansionAnalytics.log('landing_claim_invite_clicked', sourceScreen: 'landing'),
                  );
                  context.push('/auth/claim');
                },
                child: const Text('Claim with invite'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.foreground,
                  side: const BorderSide(color: AppColors.border),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: () {
                  unawaited(
                    ExpansionAnalytics.log('landing_sign_in_clicked', sourceScreen: 'landing'),
                  );
                  context.push('/auth/sign-in');
                },
                child: const Text('Sign in'),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
