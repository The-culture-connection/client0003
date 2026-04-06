import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../auth/auth_controller.dart';

/// Post–profile-completion welcome: **`assets/Welcome.gif`** for [kWelcomeGifPlaybackDuration], then **Home**.
const String kWelcomeGifAsset = 'assets/Welcome.gif';

/// Full playback length before navigating to Home (match one full loop of your GIF).
const Duration kWelcomeGifPlaybackDuration = Duration(milliseconds: 5300);

/// Haptic pulses during the intro, measured from the same t=0 as [kWelcomeGifPlaybackDuration] (after the GIF is on screen).
const List<int> kWelcomeIntroHapticOffsetsMs = [700, 2400, 4000];

class WelcomeMortarverseIntroScreen extends StatefulWidget {
  const WelcomeMortarverseIntroScreen({super.key});

  @override
  State<WelcomeMortarverseIntroScreen> createState() => _WelcomeMortarverseIntroScreenState();
}

class _WelcomeMortarverseIntroScreenState extends State<WelcomeMortarverseIntroScreen> {
  Timer? _navTimer;
  final List<Timer> _hapticTimers = [];
  late final Future<_WelcomeGifLoad> _gifFuture;

  @override
  void initState() {
    super.initState();
    _gifFuture = _loadWelcomeGifBytes();
    imageCache.evict(AssetImage(kWelcomeGifAsset));
    _scheduleNavAfterGifReady();
  }

  /// Start the 5.3s countdown only after the asset is loaded (and after the next
  /// frame so [Image.memory] can paint). Otherwise the timer overlaps bundle I/O
  /// and the GIF gets less than a full [kWelcomeGifPlaybackDuration] on screen.
  void _scheduleNavAfterGifReady() {
    _gifFuture.then((load) {
      if (!mounted) return;
      void startNavTimer() {
        _navTimer?.cancel();
        _navTimer = Timer(kWelcomeGifPlaybackDuration, _goNextIfMounted);
      }

      void scheduleHapticsForIntro() {
        for (final t in _hapticTimers) {
          t.cancel();
        }
        _hapticTimers.clear();
        for (final ms in kWelcomeIntroHapticOffsetsMs) {
          _hapticTimers.add(
            Timer(Duration(milliseconds: ms), () {
              if (!mounted) return;
              HapticFeedback.mediumImpact();
            }),
          );
        }
      }

      if (load.bytes != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            scheduleHapticsForIntro();
            startNavTimer();
          });
        });
      } else {
        startNavTimer();
      }
    });
  }

  Future<_WelcomeGifLoad> _loadWelcomeGifBytes() async {
    try {
      final data = await rootBundle.load(kWelcomeGifAsset);
      final bytes = data.buffer.asUint8List();
      if (bytes.length < 6) {
        return _WelcomeGifLoad.error('File too small to be a GIF.');
      }
      final isGif = bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46;
      if (!isGif) {
        return _WelcomeGifLoad.error(
          '$kWelcomeGifAsset is not a GIF. Export a real animated GIF or fix the file.',
        );
      }
      return _WelcomeGifLoad.ok(bytes);
    } catch (e, st) {
      debugPrint('Welcome GIF load failed: $e\n$st');
      return _WelcomeGifLoad.error(
        'Could not load $kWelcomeGifAsset.\n\n'
        'Add Welcome.gif under expansion_network/assets/, list it in pubspec.yaml flutter.assets, then flutter pub get and rebuild.',
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
    context.go('/home');
  }

  @override
  void dispose() {
    _navTimer?.cancel();
    for (final t in _hapticTimers) {
      t.cancel();
    }
    _hapticTimers.clear();
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
