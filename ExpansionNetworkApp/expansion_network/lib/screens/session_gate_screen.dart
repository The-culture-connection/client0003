import 'dart:async';

import 'package:flutter/material.dart';

import '../analytics/expansion_analytics.dart';
import '../theme/app_theme.dart';

/// Shown while [AuthController.loading] resolves so users do not briefly see the unauthenticated landing.
class SessionGateScreen extends StatefulWidget {
  const SessionGateScreen({super.key});

  @override
  State<SessionGateScreen> createState() => _SessionGateScreenState();
}

class _SessionGateScreenState extends State<SessionGateScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(
        ExpansionAnalytics.log('session_gate_screen_started', sourceScreen: 'session_gate'),
      );
    });
  }

  @override
  void dispose() {
    unawaited(
      ExpansionAnalytics.log('session_gate_screen_ended', sourceScreen: 'session_gate'),
    );
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: AppColors.primary),
            SizedBox(height: 16),
            Text(
              'Loading…',
              style: TextStyle(color: AppColors.mutedForeground, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }
}
