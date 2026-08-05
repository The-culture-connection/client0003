import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../analytics/expansion_analytics.dart';
import '../auth/auth_controller.dart';
import '../mortarverse/widgets/glow_pill_button.dart';
import '../mortarverse/widgets/torn_panel.dart';
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
      body: Stack(
        children: [
          Column(
            children: [
              Expanded(
                child: SafeArea(
                  bottom: false,
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text(
                            'MORTARVERSE',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontFamily: 'ArchivoBlack',
                              color: AppColors.foreground,
                              fontSize: 30,
                              letterSpacing: 3,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'MORTAR Alumni Network\nConnect with alumni. Grow your network.',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: AppColors.mutedForeground,
                                  height: 1.6,
                                ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              TornPanel(
                seed: 5,
                child: SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 30, 24, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Mockup bottom strip: SIGN IN | SIGN UP as glow pills.
                        Row(
                          children: [
                            Expanded(
                              child: GlowPillButton(
                                label: 'Sign in',
                                onPressed: () {
                                  unawaited(
                                    ExpansionAnalytics.log('landing_sign_in_clicked', sourceScreen: 'landing'),
                                  );
                                  context.push('/auth/sign-in');
                                },
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: GlowPillButton(
                                label: 'Sign up',
                                filled: true,
                                onPressed: () {
                                  unawaited(
                                    ExpansionAnalytics.log('landing_sign_up_clicked', sourceScreen: 'landing'),
                                  );
                                  context.push('/auth/sign-up');
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        TextButton(
                          onPressed: () {
                            unawaited(
                              ExpansionAnalytics.log('landing_claim_invite_clicked', sourceScreen: 'landing'),
                            );
                            context.push('/auth/claim');
                          },
                          child: const Text('Have an Expansion Network invite code?'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
