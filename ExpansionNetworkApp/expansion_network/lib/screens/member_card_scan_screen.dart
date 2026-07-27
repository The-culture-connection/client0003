import 'dart:async';
import 'dart:io' show Platform;

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/member_card_link.dart';
import '../theme/app_theme.dart';

/// Camera view for the "Scan" tab of [MemberCardScreen].
///
/// A valid card opens the 1:1 chat immediately — no confirmation step. Decoding
/// is entirely on-device (ML Kit on Android, Vision on iOS); the chat route is
/// the only thing that touches the network.
///
/// The camera is held open only while [active] is true, so switching back to
/// the "My Code" tab (or backgrounding the app) releases it.
class MemberCardScanView extends StatefulWidget {
  const MemberCardScanView({
    super.key,
    required this.active,
    this.accent = AppColors.primary,
  });

  /// Whether this view's tab is the visible one.
  final bool active;

  final Color accent;

  @override
  State<MemberCardScanView> createState() => _MemberCardScanViewState();
}

class _MemberCardScanViewState extends State<MemberCardScanView>
    with WidgetsBindingObserver {
  // autoStart is off: TabBarView builds both tabs eagerly, so the camera must
  // follow `active` rather than construction.
  final MobileScannerController _controller = MobileScannerController(
    autoStart: false,
    formats: const [BarcodeFormat.qrCode],
    detectionSpeed: DetectionSpeed.noDuplicates,
  );

  /// Guards against a second detection landing while we navigate —
  /// [MobileScannerController.stop] is async, so frames can still arrive.
  bool _handling = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (widget.active) _syncCamera();
  }

  @override
  void didUpdateWidget(MemberCardScanView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active != oldWidget.active) _syncCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // We own the controller, so MobileScanner does not manage the camera
    // lifecycle for us — release it while backgrounded.
    if (state == AppLifecycleState.resumed) {
      _syncCamera();
    } else {
      unawaited(_controller.stop());
    }
  }

  /// Starts the camera when this tab is visible and idle, stops it otherwise.
  void _syncCamera() {
    if (!widget.active || _handling) {
      unawaited(_controller.stop());
      return;
    }
    // Deferred a frame so MobileScanner is attached before start() is called,
    // which otherwise raises `controllerNotAttached`.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !widget.active || _handling) return;
      unawaited(_controller.start());
    });
  }

  void _toast(String message) {
    ScaffoldMessenger.maybeOf(context)
      ?..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_handling || !widget.active) return;

    final raw = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
    final uid = parseMemberCardPayload(raw);
    if (uid == null) {
      _toast('That’s not a MORTAR card.');
      return;
    }
    if (uid == FirebaseAuth.instance.currentUser?.uid) {
      _toast('That’s your own card 🙂');
      return;
    }

    _handling = true;
    await _controller.stop();
    if (!mounted) return;

    // Straight into the chat. Awaited so the camera comes back if the user
    // backs out of it — this tab stays alive underneath.
    await context.push<void>('/messages/direct/$uid');
    if (!mounted) return;

    _handling = false;
    _syncCamera();
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black,
      child: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
            errorBuilder: (context, error) => _ScannerError(
              error: error,
              accent: widget.accent,
              onRetry: _syncCamera,
            ),
            placeholderBuilder: (context) => const ColoredBox(color: Colors.black),
          ),
          IgnorePointer(child: _ScanReticle(accent: widget.accent)),
          Positioned(
            left: 24,
            right: 24,
            bottom: 32,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: const Text(
                      'Point at a member’s code to open a chat',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            top: 16,
            right: 16,
            child: ValueListenableBuilder<MobileScannerState>(
              valueListenable: _controller,
              builder: (context, state, _) {
                if (!state.hasCameraPermission) return const SizedBox.shrink();
                final on = state.torchState == TorchState.on;
                return IconButton.filled(
                  onPressed: () => unawaited(_controller.toggleTorch()),
                  icon: Icon(on ? Icons.flash_on : Icons.flash_off),
                  tooltip: on ? 'Turn off torch' : 'Turn on torch',
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.black.withValues(alpha: 0.6),
                    foregroundColor: on ? widget.accent : Colors.white,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// Simple framed cutout so users know where to aim.
class _ScanReticle extends StatelessWidget {
  const _ScanReticle({required this.accent});

  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 240,
        height: 240,
        decoration: BoxDecoration(
          border: Border.all(color: accent, width: 3),
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
}

class _ScannerError extends StatelessWidget {
  const _ScannerError({
    required this.error,
    required this.accent,
    required this.onRetry,
  });

  final MobileScannerException error;
  final Color accent;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final denied = error.errorCode == MobileScannerErrorCode.permissionDenied;
    final unsupported = error.errorCode == MobileScannerErrorCode.unsupported;

    final String title;
    final String body;
    if (denied) {
      title = 'Camera access needed';
      body = 'MORTAR needs your camera to scan a card. Enable camera access '
          'for MORTAR in Settings, then try again.';
    } else if (unsupported) {
      title = 'Scanning unavailable';
      body = 'This device does not have a camera we can use for scanning.';
    } else {
      title = 'Camera unavailable';
      body = error.errorDetails?.message ?? error.errorCode.message;
    }

    return ColoredBox(
      color: Colors.black,
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                denied ? Icons.no_photography_outlined : Icons.videocam_off_outlined,
                size: 48,
                color: AppColors.mutedForeground,
              ),
              const SizedBox(height: 20),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 10),
              Text(
                body,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.mutedForeground,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),
              if (!unsupported)
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  alignment: WrapAlignment.center,
                  children: [
                    // iOS exposes a settings URL any app can open; Android has no
                    // equivalent without an extra plugin, so we guide there instead.
                    if (denied && Platform.isIOS)
                      FilledButton(
                        onPressed: () =>
                            unawaited(launchUrl(Uri.parse('app-settings:'))),
                        style: FilledButton.styleFrom(
                          backgroundColor: accent,
                          foregroundColor: Colors.black,
                        ),
                        child: const Text('Open Settings'),
                      ),
                    OutlinedButton(
                      onPressed: onRetry,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.foreground,
                        side: const BorderSide(color: AppColors.border),
                      ),
                      child: const Text('Try again'),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}
