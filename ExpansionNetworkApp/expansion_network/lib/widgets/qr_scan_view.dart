import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme/app_theme.dart';
import '../theme/cosmic_content.dart';

/// What a scan handler wants to happen next.
enum ScanOutcome {
  /// Not one of ours, or a soft rejection — keep scanning.
  keepScanning,

  /// Handled and we are navigating away; leave the camera stopped until the
  /// user returns to this view.
  handled,
}

/// Reusable camera + QR decoding chrome.
///
/// Owns the parts every scanner needs and gets wrong in isolation: starting and
/// stopping with visibility and app lifecycle, the permission-denied state, the
/// torch toggle, and guarding against a second detection landing mid-navigation.
/// Callers supply only [onCode].
///
/// Decoding is entirely on-device (ML Kit on Android, Vision on iOS).
class QrScanView extends StatefulWidget {
  const QrScanView({
    super.key,
    required this.active,
    required this.onCode,
    this.accent = AppColors.primary,
    this.hint,
  });

  /// Whether this view is the visible one. The camera is held open only while
  /// true, so a hidden tab or a backgrounded app releases it.
  final bool active;

  /// Invoked for each decoded value. Return [ScanOutcome.handled] when
  /// navigating away; the camera resumes automatically once this view is shown
  /// again. Errors thrown here are swallowed and treated as `keepScanning`.
  final Future<ScanOutcome> Function(String raw) onCode;

  final Color accent;

  /// Caption shown over the viewfinder.
  final String? hint;

  @override
  State<QrScanView> createState() => _QrScanViewState();
}

class _QrScanViewState extends State<QrScanView> with WidgetsBindingObserver {
  // autoStart is off: a parent may build this inside a TabBarView, which
  // constructs hidden tabs eagerly. The camera follows `active` instead.
  final MobileScannerController _controller = MobileScannerController(
    autoStart: false,
    formats: const [BarcodeFormat.qrCode],
    detectionSpeed: DetectionSpeed.noDuplicates,
  );

  /// Guards against a second detection while we navigate — stop() is async, so
  /// frames can still arrive after it is called.
  bool _handling = false;

  /// Frozen "camera access needed" state. While true the camera is never
  /// auto-started: on Android a denied permission made every lifecycle resume
  /// retry `start()`, which re-fired the (auto-denied) permission request and
  /// left the error screen blinking with an un-tappable "Try again". Only an
  /// explicit tap on Try again leaves this state.
  bool _permissionDenied = false;

  /// Prevents overlapping `start()` calls (each one can prompt for permission).
  bool _starting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (widget.active) _syncCamera();
  }

  @override
  void didUpdateWidget(QrScanView oldWidget) {
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

  /// Starts the camera when this view is visible and idle; stops it otherwise.
  void _syncCamera() {
    if (!widget.active || _handling || _permissionDenied) {
      unawaited(_controller.stop());
      return;
    }
    // Deferred a frame so MobileScanner is attached before start() is called,
    // which otherwise raises `controllerNotAttached`.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !widget.active || _handling || _permissionDenied) return;
      unawaited(_start());
    });
  }

  /// Runs `start()` once and freezes into the stable denied pane when the
  /// camera permission is (still) refused.
  Future<void> _start() async {
    if (_starting) return;
    _starting = true;
    try {
      await _controller.start();
    } on MobileScannerException {
      // The failure also lands in the controller's state, checked below.
    } catch (_) {
      // Unknown failure — the errorBuilder shows the controller's state.
    } finally {
      _starting = false;
    }
    if (!mounted) return;
    if (_controller.value.error?.errorCode ==
        MobileScannerErrorCode.permissionDenied) {
      setState(() => _permissionDenied = true);
    }
  }

  /// "Try again" on the denied pane: re-attempt, which re-requests the
  /// permission where the OS still allows a prompt.
  void _retryAfterPermissionDenied() {
    setState(() => _permissionDenied = false);
    _syncCamera();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_handling || !widget.active) return;
    final raw = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
    if (raw == null || raw.isEmpty) return;

    _handling = true;
    await _controller.stop();
    if (!mounted) return;

    ScanOutcome outcome;
    try {
      outcome = await widget.onCode(raw);
    } catch (_) {
      outcome = ScanOutcome.keepScanning;
    }
    if (!mounted) return;

    // Either way the camera comes back when this view is next visible: a
    // handler that navigated away leaves it stopped until the user returns.
    _handling = false;
    if (outcome == ScanOutcome.keepScanning) _syncCamera();
  }

  @override
  Widget build(BuildContext context) {
    // The denied state gets its own stable pane INSTEAD of MobileScanner —
    // rendering it through the scanner's errorBuilder meant every restart
    // attempt flashed placeholder → error ("glitching/blinking").
    if (_permissionDenied) {
      return _PermissionDeniedPane(
        accent: widget.accent,
        onRetry: _retryAfterPermissionDenied,
      );
    }
    return ColoredBox(
      color: Colors.black,
      child: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: (c) => unawaited(_onDetect(c)),
            errorBuilder: (context, error) {
              if (error.errorCode == MobileScannerErrorCode.permissionDenied) {
                // Freeze into the stable pane on the next frame.
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted && !_permissionDenied) {
                    setState(() => _permissionDenied = true);
                  }
                });
                return _PermissionDeniedPane(
                  accent: widget.accent,
                  onRetry: _retryAfterPermissionDenied,
                );
              }
              return _ScannerError(
                error: error,
                accent: widget.accent,
                onRetry: _syncCamera,
              );
            },
            placeholderBuilder: (context) => const ColoredBox(color: Colors.black),
          ),
          IgnorePointer(child: _ScanReticle(accent: widget.accent)),
          if (widget.hint != null)
            Positioned(
              left: 24,
              right: 24,
              bottom: 32,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.6),
                    borderRadius: Cosmic.chipRadius,
                  ),
                  child: Text(
                    widget.hint!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                ),
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
          borderRadius: Cosmic.chipRadius,
        ),
      ),
    );
  }
}

/// Stable, non-blinking "camera access needed" pane with a working retry.
///
/// `permission_handler` is not a dependency, so there is no cross-platform
/// `openAppSettings()`: iOS gets its settings deep link, Android gets written
/// directions alongside the retry (which re-prompts when the OS allows it).
class _PermissionDeniedPane extends StatelessWidget {
  const _PermissionDeniedPane({required this.accent, required this.onRetry});

  final Color accent;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black,
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.no_photography_outlined,
                size: 48,
                color: AppColors.mutedForeground,
              ),
              const SizedBox(height: 20),
              const Text(
                'Camera access needed',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 10),
              Text(
                'MORTAR needs your camera to scan a code. Tap "Try again" to '
                'allow access.'
                '${Platform.isIOS ? '' : '\n\nIf no prompt appears, enable it in '
                    'Settings → Apps → MORTAR → Permissions → Camera, then come back.'}',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.mutedForeground,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                alignment: WrapAlignment.center,
                children: [
                  if (Platform.isIOS)
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
      body = 'MORTAR needs your camera to scan a code. Enable camera access '
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
