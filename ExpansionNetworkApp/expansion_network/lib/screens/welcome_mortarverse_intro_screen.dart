import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:vibration/vibration.dart';

import '../analytics/expansion_analytics.dart';
import '../auth/auth_controller.dart';

/// Post–sign-in / post–profile-completion welcome, then the Mortarverse chooser.
const String kWelcomeGifAsset = 'assets/welcome_mortarverse.gif';

/// If the GIF is a single frame, or a frame has **no** delay in the file, hold this long
/// before moving on (replaces a fixed wall-clock “whole animation” timer).
const Duration kWelcomeSingleFrameOrZeroDelayHold = Duration(milliseconds: 5300);

/// Minimum time each frame stays on screen when the encoder stored `0` delay.
const Duration kWelcomeGifMinFrameDuration = Duration(milliseconds: 16);

/// One sustained buzz starting with the first frame.
///
/// Deliberately a *single* platform call rather than a train of
/// [HapticFeedback] impacts: each call hops the platform channel and competes
/// with frame decoding, which is what made the old intro stutter.
const bool kWelcomeIntroVibrationEnabled = true;
const Duration kWelcomeIntroVibrationDuration = Duration(milliseconds: 2100);

/// Never decode above the GIF's own 1080px width — upscaling costs memory and
/// buys nothing.
const int kWelcomeGifNativeWidth = 1080;

/// Plays [kWelcomeGifAsset] once, then routes to `/mortarverse`.
///
/// Playback notes — the GIF is 1080x1920 @ 30fps, and each decoded frame is
/// ~7.9 MB of RGBA, so how frames are pumped matters:
///
/// * **Decode-ahead.** The next frame decodes while the current one is on
///   screen, instead of serially decode → show → sleep. Only two frames are
///   ever in flight, so memory stays flat.
/// * **Absolute timeline.** Each frame is due at a fixed offset from the start,
///   measured with a [Stopwatch]. The previous implementation slept for the
///   *full* frame delay after decoding, so decode time was added on top of every
///   frame and the animation ran roughly half speed.
/// * **No `setState` per frame.** Frames go through a [ValueNotifier] so only
///   the [RawImage] repaints rather than rebuilding the whole subtree.
/// * **Decode at screen size.** On a device narrower than 1080px the codec
///   downscales during decode, cutting both work and memory.
class WelcomeMortarverseIntroScreen extends StatefulWidget {
  const WelcomeMortarverseIntroScreen({super.key});

  @override
  State<WelcomeMortarverseIntroScreen> createState() => _WelcomeMortarverseIntroScreenState();
}

class _WelcomeMortarverseIntroScreenState extends State<WelcomeMortarverseIntroScreen> {
  final ValueNotifier<ui.Image?> _frame = ValueNotifier<ui.Image?>(null);

  bool _loading = true;
  String? _errorMessage;
  ui.Codec? _codec;
  bool _disposed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _disposed) return;
      // Arriving here is what "uses up" the pending welcome, so a later cold
      // start lands straight on the chooser.
      context.read<AuthController>().consumeWelcomeIntroPending();
      unawaited(
        ExpansionAnalytics.log('welcome_intro_screen_started', sourceScreen: 'welcome_intro'),
      );
      unawaited(_bootstrap());
    });
  }

  /// Physical pixels available across the screen, capped at the GIF's own width.
  int _decodeWidth() {
    final view = View.of(context);
    final px = view.physicalSize.width.round();
    if (px <= 0) return kWelcomeGifNativeWidth;
    return px < kWelcomeGifNativeWidth ? px : kWelcomeGifNativeWidth;
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

    final ui.Codec codec;
    try {
      final buffer = await ui.ImmutableBuffer.fromUint8List(load.bytes!);
      final descriptor = await ui.ImageDescriptor.encoded(buffer);
      codec = await descriptor.instantiateCodec(targetWidth: _decodeWidth());
      descriptor.dispose();
      buffer.dispose();
    } catch (e, st) {
      debugPrint('Welcome GIF codec failed: $e\n$st');
      unawaited(
        ExpansionAnalytics.log(
          'welcome_intro_decode_failed',
          sourceScreen: 'welcome_intro',
          extra: ExpansionAnalytics.errorExtras(e, code: 'instantiateCodec'),
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

  /// Advances frames on the GIF's own timeline, decoding one frame ahead.
  Future<void> _playOneLoop(ui.Codec codec) async {
    final n = codec.frameCount;
    if (n <= 0) {
      _goNextIfMounted();
      return;
    }

    final clock = Stopwatch()..start();
    var dueMicros = 0;
    var buzzed = false;

    // Kick off the first decode before the loop so the pipeline is primed.
    Future<ui.FrameInfo>? pending = codec.getNextFrame();

    try {
      for (var i = 0; i < n; i++) {
        final ui.FrameInfo frame;
        try {
          frame = await pending!;
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
        if (!mounted || _disposed) {
          frame.image.dispose();
          return;
        }

        // Start the next decode immediately — it overlaps this frame's display.
        pending = i + 1 < n ? codec.getNextFrame() : null;

        final previous = _frame.value;
        _frame.value = frame.image;
        previous?.dispose();

        if (!buzzed) {
          buzzed = true;
          _startBuzz();
        }

        var step = frame.duration;
        if (step == Duration.zero) {
          step = n == 1 ? kWelcomeSingleFrameOrZeroDelayHold : kWelcomeGifMinFrameDuration;
        }
        dueMicros += step.inMicroseconds;

        // Absolute schedule: if a decode ran long we simply show the next frame
        // sooner rather than compounding the delay.
        final waitMicros = dueMicros - clock.elapsedMicroseconds;
        if (waitMicros > 0) {
          await Future<void>.delayed(Duration(microseconds: waitMicros));
        }
      }
    } catch (e, st) {
      if (!_disposed) debugPrint('Welcome GIF playback failed: $e\n$st');
    } finally {
      // Drop a decode that outlived the screen.
      unawaited(pending?.then((f) => f.image.dispose()).catchError((_) {}));
      _goNextIfMounted();
    }
  }

  /// Fires once, alongside the first frame. Best-effort: a device without a
  /// vibrator (or one that rejects the duration) must not break the intro.
  void _startBuzz() {
    if (!kWelcomeIntroVibrationEnabled) return;
    unawaited(() async {
      try {
        if (!await Vibration.hasVibrator()) return;
        await Vibration.vibrate(
          duration: kWelcomeIntroVibrationDuration.inMilliseconds,
        );
      } catch (e) {
        debugPrint('Welcome intro vibration skipped: $e');
      }
    }());
  }

  void _stopBuzz() {
    if (!kWelcomeIntroVibrationEnabled) return;
    unawaited(Vibration.cancel().catchError((_) {}));
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
        'Add welcome_mortarverse.gif under expansion_network/assets/, list it in '
        'pubspec.yaml flutter.assets, then flutter pub get and rebuild.',
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
    context.go('/mortarverse');
  }

  @override
  void dispose() {
    _disposed = true;
    _stopBuzz();
    _codec?.dispose();
    _codec = null;
    _frame.value?.dispose();
    _frame.value = null;
    _frame.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(child: Center(child: _buildBody())),
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
    return ValueListenableBuilder<ui.Image?>(
      valueListenable: _frame,
      builder: (context, image, _) {
        if (image == null) return const SizedBox.shrink();
        return RawImage(
          image: image,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.medium,
        );
      },
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
