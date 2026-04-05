import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'auth/auth_controller.dart';
import 'firebase_options.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final firebaseOk = await _initFirebase();
  if (!firebaseOk) {
    runApp(const _FirebaseBridgeLostApp());
    return;
  }

  final authController = AuthController();
  final router = createAppRouter(authController);
  runApp(
    ChangeNotifierProvider.value(
      value: authController,
      child: ExpansionNetworkApp(router: router),
    ),
  );
}

/// Returns `false` when the native Firebase bridge is unavailable (common after **Hot Restart**
/// on Android). In that case we show [_FirebaseBridgeLostApp] instead of crashing.
///
/// Use **Hot Reload** (`r`) or a **full stop + Run** — not Hot Restart (`R`) — while developing.
Future<bool> _initFirebase() async {
  if (Firebase.apps.isNotEmpty) {
    return true;
  }
  try {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    return true;
  } on PlatformException catch (e, st) {
    debugPrint('_initFirebase: $e\n$st');
    if (e.code == 'channel-error') {
      debugPrint(
        'Firebase Pigeon channel lost (usually Hot Restart on Android). '
        'Showing recovery screen — stop app and Run again.',
      );
      return false;
    }
    rethrow;
  } on FirebaseException catch (e, st) {
    if (e.code == 'duplicate-app') {
      return true;
    }
    debugPrint('_initFirebase: $e\n$st');
    rethrow;
  }
}

/// Shown when [Firebase.initializeApp] cannot reach native code (e.g. after Hot Restart).
class _FirebaseBridgeLostApp extends StatelessWidget {
  const _FirebaseBridgeLostApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.restart_alt_rounded, size: 56, color: AppColors.primary),
                const SizedBox(height: 20),
                Text(
                  'Full restart required',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppColors.foreground,
                      ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Hot Restart disconnected Firebase from the Android engine. '
                  'Stop this app completely, then press Run again.\n\n'
                  'Tip: use Hot Reload (r) for UI changes, not Hot Restart (R), when using Firebase.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.mutedForeground,
                        height: 1.4,
                      ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class ExpansionNetworkApp extends StatelessWidget {
  const ExpansionNetworkApp({required this.router, super.key});

  final GoRouter router;

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Mortar Alumni Network',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: router,
    );
  }
}
