import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../analytics/expansion_analytics.dart';
import '../auth/auth_controller.dart';

/// Post–profile-completion welcome: **`assets/Welcome.gif`**, then **Home**.
const String kWelcomeGifAsset = 'assets/Welcome.gif';

/// If the GIF is a single frame, or a frame has **no** delay in the file, hold this long
/// before Home (replaces a fixed wall-clock “whole animation” timer).
const Duration kWelcomeSingleFrameOrZeroDelayHold = Duration(milliseconds: 5300);

/// Minimum time each frame stays on screen when the encoder stored `0` delay.
const Duration kWelcomeGifMinFrameDuration = Duration(milliseconds: 16);

/// Seconds from **GIF start** (same moment as codec playback: first frame is on screen —
/// we schedule after that frame paints). Match these to beats in `Welcome.gif` (e.g. stopwatch
/// from when motion begins, or your editor’s timeline). Use decimals for fine tuning (e.g. 2.35).
const List<double> kWelcomeIntroHapticTimesSec = [0.7, 2.4, 4.0];

/// Flutter exposes only short impacts, not a true sustained motor buzz. We approximate
/// “BUUUZZ” with a train of [heavyImpact] calls — raise [kWelcomeIntroBuzzPulseCount] or
/// tighten [kWelcomeIntroBuzzPulseGapMs] for a longer / denser rumble.
const int kWelcomeIntroBuzzPulseCount = 10;
const int kWelcomeIntroBuzzPulseGapMs = 26;

class WelcomeMortarverseIntroScreen extends StatefulWidget {
  const WelcomeMortarverseIntroScreen({super.key});

  @override
  State<WelcomeMortarverseIntroScreen> createState() => _WelcomeMortarverseIntroScreenState();
}

class _WelcomeMortarverseIntroScreenState extends State<WelcomeMortarverseIntroScreen> {
  bool _loading = true;
  String? _errorMessage;
  ui.Codec? _codec;
  ui.Image? _frameImage;

  final List<Timer> _hapticTimers = [];
  bool _disposed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(
        ExpansionAnalytics.log('welcome_intro_screen_started', sourceScreen: 'welcome_intro'),
      );
    });
    imageCache.evict(AssetImage(kWelcomeGifAsset));
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final load = await _loadWelcomeGifBytes();
    if (!mounted || _disposed) return;
    if (load.errorMessage != null) {
      setState(() {
        _loading = false;
        _errorMessage = load.errorMessage;
      });
      return;
    }

    ui.Codec codec;
    try {
      codec = await ui.instantiateImageCodec(load.bytes!);
    } catch (e, st) {
      debugPrint('Welcome GIF codec failed: $e\n$st');
      unawaited(
        ExpansionAnalytics.log(
          'welcome_intro_decode_failed',
          sourceScreen: 'welcome_intro',
          extra: ExpansionAnalytics.errorExtras(e, code: 'instantiateImageCodec'),
        ),
      );
      if (!mounted || _disposed) return;
      setState(() {
        _loading = false;
        _errorMessage =
            'Could not decode $kWelcomeGifAsset.\n\nTry re-exporting the GIF or use a shorter animation.';
      });
      return;
    }

    if (!mounted || _disposed) {
      codec.dispose();
      return;
    }

    _codec = codec;
    setState(() => _loading = false);

    await _playOneLoop(codec);
  }

  /// Advances frames using each [FrameInfo.duration] from the file — same timeline as the
  /// GIF spec, so Home follows **one full loop** and haptics match what you see.
  Future<void> _playOneLoop(ui.Codec codec) async {
    final n = codec.frameCount;
    if (n <= 0) {
      _cancelHapticTimers();
      if (mounted && !_disposed) {
        _goNextIfMounted();
      }
      return;
    }

    var frameIndex = 0;
    var hapticsScheduled = false;

    try {
      while (mounted && !_disposed && frameIndex < n) {
        late final ui.FrameInfo frame;
        try {
          frame = await codec.getNextFrame();
        } catch (e, st) {
          if (_disposed || !mounted) return;
          debugPrint('Welcome GIF getNextFrame failed: $e\n$st');
          unawaited(
            ExpansionAnalytics.log(
              'welcome_intro_decode_failed',
              sourceScreen: 'welcome_intro',
              extra: ExpansionAnalytics.errorExtras(e, code: 'getNextFrame'),
            ),
          );
          break;
        }
        if (!mounted || _disposed) return;

        final img = frame.image;
        setState(() {
          _frameImage?.dispose();
          _frameImage = img;
        });

        if (!hapticsScheduled) {
          hapticsScheduled = true;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted || _disposed) return;
            _scheduleWallClockHaptics();
          });
        }

        var step = frame.duration;
        if (step == Duration.zero) {
          step = n == 1 ? kWelcomeSingleFrameOrZeroDelayHold : kWelcomeGifMinFrameDuration;
        }

        await Future<void>.delayed(step);
        frameIndex++;
      }
    } catch (e, st) {
      if (!_disposed) {
        debugPrint('Welcome GIF playback failed: $e\n$st');
      }
    } finally {
      _cancelHapticTimers();
      if (mounted && !_disposed) {
        _goNextIfMounted();
      }
    }
  }

  void _scheduleWallClockHaptics() {
    _cancelHapticTimers();
    for (final sec in kWelcomeIntroHapticTimesSec) {
      final delay = Duration(
        microseconds: (sec * Duration.microsecondsPerSecond).round(),
      );
      _hapticTimers.add(
        Timer(delay, () {
          if (!mounted || _disposed) return;
          _emitBuzzRumble();
        }),
      );
    }
  }

  /// Dense [HapticFeedback.heavyImpact] pulses read as a short “rumble” on most iPhones.
  void _emitBuzzRumble() {
    for (var i = 0; i < kWelcomeIntroBuzzPulseCount; i++) {
      _hapticTimers.add(
        Timer(Duration(milliseconds: kWelcomeIntroBuzzPulseGapMs * i), () {
          if (!mounted || _disposed) return;
          HapticFeedback.heavyImpact();
        }),
      );
    }
  }

  void _cancelHapticTimers() {
    for (final t in _hapticTimers) {
      t.cancel();
    }
    _hapticTimers.clear();
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
    if (!mounted || _disposed) return;
    _goNext();
  }

  void _goNext() {
    final auth = context.read<AuthController>();
    if (auth.loading) {
      context.go('/session');
      return;
    }
    unawaited(
      ExpansionAnalytics.log('welcome_intro_navigated_home', sourceScreen: 'welcome_intro'),
    );
    context.go('/home');
  }

  @override
  void dispose() {
    _disposed = true;
    _cancelHapticTimers();
    _codec?.dispose();
    _codec = null;
    _frameImage?.dispose();
    _frameImage = null;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Center(
          child: _buildBody(),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const SizedBox(
        width: 36,
        height: 36,
        child: CircularProgressIndicator(color: Colors.white24, strokeWidth: 2),
      );
    }
    if (_errorMessage != null) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          _errorMessage!,
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.white70, height: 1.35),
        ),
      );
    }
    final img = _frameImage;
    if (img == null) {
      return const SizedBox.shrink();
    }
    return RawImage(
      image: img,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.medium,
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
