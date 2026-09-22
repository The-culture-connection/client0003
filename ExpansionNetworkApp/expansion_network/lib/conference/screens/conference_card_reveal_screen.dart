import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:video_player/video_player.dart';

import '../../theme/cosmic.dart';
import '../conference_analytics.dart';
import '../theme/conference_colors.dart';

/// The spinning MORTAR card that plays for an attendee who followed a ticket
/// link and already holds entry, immediately before their scannable member
/// card.
///
/// Where it sits: `/tickets` → (already an attendee) → **here** → `/card`.
///
/// Design contract with the asset. The video should **end on the card facing
/// front**, filling roughly the same part of the screen as the card on
/// [MemberCardScreen]. The real screen then takes over and performs the flip
/// to the QR itself, so the hand-off reads as one continuous motion rather
/// than a video that stops and a screen that starts. Keep it short — this sits
/// between a scan and the thing the person actually wants.
///
/// Why MP4 rather than the GIF pipeline used by the Mortarverse welcome intro:
/// the card spins over a dark ground with gold on it, and GIF's 256-colour
/// palette bands badly on exactly that combination. [video_player] is already
/// a dependency, so this costs nothing extra.
///
/// **The screen degrades to a no-op.** If [kMortarCardRevealAsset] is not
/// bundled, or fails to initialise on the device, it forwards to the card
/// immediately instead of showing an error. That keeps the whole ticket flow
/// shippable before the animation lands, and means a codec problem on one
/// device costs a flourish rather than access to their badge.
const String kMortarCardRevealAsset = 'assets/conference/mortar_card_spin.mp4';

/// Hard ceiling on how long the reveal may hold the user.
///
/// Covers a video that initialises but never reports completion (a stall, a
/// truncated file). Without it the screen would sit on a frozen frame with the
/// card one tap away but no obvious way to reach it.
const Duration kMortarCardRevealMaxHold = Duration(seconds: 8);

/// Where the reveal hands off to. `ctx=conference` swaps the card's accent to
/// [ConferenceColors.gold], matching the room the user is standing in.
const String kMortarCardRevealDestination = '/card?ctx=conference';

class ConferenceCardRevealScreen extends StatefulWidget {
  const ConferenceCardRevealScreen({super.key});

  @override
  State<ConferenceCardRevealScreen> createState() =>
      _ConferenceCardRevealScreenState();
}

class _ConferenceCardRevealScreenState
    extends State<ConferenceCardRevealScreen> {
  VideoPlayerController? _controller;
  Timer? _safetyTimer;

  /// Guards every exit path. Completion, the skip tap and the safety timer can
  /// all fire at once; without this the screen would navigate more than once
  /// and leave a stray route on the stack.
  bool _forwarded = false;

  @override
  void initState() {
    super.initState();
    unawaited(_start());
  }

  Future<void> _start() async {
    final controller = VideoPlayerController.asset(kMortarCardRevealAsset);
    try {
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      await controller.setLooping(false);
      // Silent by design: this can play in a conference hall, and a sound the
      // user did not ask for is worse than no sound.
      await controller.setVolume(0);
      controller.addListener(_onTick);
      setState(() => _controller = controller);
      _safetyTimer = Timer(kMortarCardRevealMaxHold, () => _forward());
      await controller.play();
    } catch (_) {
      await controller.dispose();
      if (!mounted) return;
      // No asset (or no codec) — go straight to the card.
      _forward(assetMissing: true);
    }
  }

  void _onTick() {
    final c = _controller;
    if (c == null || !c.value.isInitialized) return;
    if (c.value.hasError) {
      _forward(assetMissing: true);
      return;
    }
    // `isCompleted` is not set on every platform, so also compare positions.
    final done = c.value.isCompleted ||
        (c.value.duration > Duration.zero &&
            c.value.position >= c.value.duration);
    if (done) _forward();
  }

  void _forward({bool assetMissing = false, bool skipped = false}) {
    if (_forwarded || !mounted) return;
    _forwarded = true;
    _safetyTimer?.cancel();
    _controller?.removeListener(_onTick);
    unawaited(ConferenceAnalytics.cardRevealPlayed(
      assetMissing: assetMissing,
      skipped: skipped,
    ));
    context.go(kMortarCardRevealDestination);
  }

  @override
  void dispose() {
    _safetyTimer?.cancel();
    _controller?.removeListener(_onTick);
    unawaited(_controller?.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = _controller;
    final ready = c != null && c.value.isInitialized;

    return Scaffold(
      backgroundColor: Colors.black,
      // Tapping anywhere skips — someone who has seen it twice should not have
      // to sit through it to reach their QR.
      body: GestureDetector(
        onTap: () => _forward(skipped: true),
        behavior: HitTestBehavior.opaque,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (ready)
              // `cover` rather than `contain`: the asset is authored full-bleed
              // portrait, and letterboxing it would frame the card in grey bars.
              FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                  width: c.value.size.width,
                  height: c.value.size.height,
                  child: VideoPlayer(c),
                ),
              )
            else
              const Center(
                child: SizedBox(
                  height: 26,
                  width: 26,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: ConferenceColors.gold,
                  ),
                ),
              ),
            if (ready)
              Positioned(
                left: 0,
                right: 0,
                bottom: 28,
                child: SafeArea(
                  top: false,
                  child: Text(
                    'Tap to skip',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Cosmic.textFaint,
                      fontSize: 12,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
