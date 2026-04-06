import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../auth/auth_controller.dart';

/// **Only** `assets/Welcome.gif` is used for the post-sign-in welcome animation (not `MortarAppIcon.png`).
const String kWelcomeGifAsset = 'assets/Welcome.gif';

/// [Image.memory] loops GIFs; navigation runs once after this duration. Match one full play of your GIF.
const Duration kWelcomeGifPlaybackDuration = Duration(seconds: 5);

/// Full-screen welcome GIF after sign-in, then **Home** or **Onboarding** (same routing as before).
class WelcomeMortarverseIntroScreen extends StatefulWidget {
  const WelcomeMortarverseIntroScreen({super.key});

  @override
  State<WelcomeMortarverseIntroScreen> createState() => _WelcomeMortarverseIntroScreenState();
}

class _WelcomeMortarverseIntroScreenState extends State<WelcomeMortarverseIntroScreen> {
  Timer? _navTimer;
  late final Future<_WelcomeGifLoad> _gifFuture;

  @override
  void initState() {
    super.initState();
    _gifFuture = _loadWelcomeGifBytes();
    imageCache.evict(AssetImage(kWelcomeGifAsset));
    _navTimer = Timer(kWelcomeGifPlaybackDuration, _goNextIfMounted);
  }

  /// Loads exactly [kWelcomeGifAsset] from the manifest (not any other image).
  Future<_WelcomeGifLoad> _loadWelcomeGifBytes() async {
    try {
      final data = await rootBundle.load(kWelcomeGifAsset);
      final bytes = data.buffer.asUint8List();
      if (bytes.length < 6) {
        return _WelcomeGifLoad.error('File too small to be a GIF.');
      }
      final isGif = bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46; // "GIF"
      if (!isGif) {
        return _WelcomeGifLoad.error(
          '$kWelcomeGifAsset is not a GIF (starts with wrong bytes). '
          'If you renamed a PNG to .gif, export a real animated GIF or fix the file.',
        );
      }
      return _WelcomeGifLoad.ok(bytes);
    } catch (e, st) {
      debugPrint('Welcome GIF load failed: $e\n$st');
      return _WelcomeGifLoad.error(
        'Could not load $kWelcomeGifAsset.\n\n'
        'Place Welcome.gif in expansion_network/assets/, list it under flutter.assets in pubspec.yaml, then flutter pub get and rebuild (not just hot reload).',
      );
    }
  }

  void _goNextIfMounted() {
    if (!mounted) return;
    _goNext();
  }

  void _goNext() {
    final auth = context.read<AuthController>();
    if (auth.loading) {
      context.go('/session');
      return;
    }
    if (auth.needsExpansionOnboarding == true) {
      context.go('/onboarding');
    } else {
      context.go('/home');
    }
  }

  @override
  void dispose() {
    _navTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Center(
          child: FutureBuilder<_WelcomeGifLoad>(
            future: _gifFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const SizedBox(
                  width: 36,
                  height: 36,
                  child: CircularProgressIndicator(color: Colors.white24, strokeWidth: 2),
                );
              }
              final load = snapshot.data!;
              if (load.errorMessage != null) {
                return Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    load.errorMessage!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white70, height: 1.35),
                  ),
                );
              }
              return Image.memory(
                load.bytes!,
                fit: BoxFit.contain,
                gaplessPlayback: true,
                filterQuality: FilterQuality.medium,
              );
            },
          ),
        ),
      ),
    );
  }
}

class _WelcomeGifLoad {
  _WelcomeGifLoad._({this.bytes, this.errorMessage});

  factory _WelcomeGifLoad.ok(Uint8List bytes) => _WelcomeGifLoad._(bytes: bytes);

  factory _WelcomeGifLoad.error(String message) => _WelcomeGifLoad._(errorMessage: message);

  final Uint8List? bytes;
  final String? errorMessage;
}
