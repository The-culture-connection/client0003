import 'dart:async';
import 'dart:ui' as ui;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';

import '../analytics/analytics_service.dart';
import '../router/app_router.dart';
import '../theme/cosmic.dart';
import 'beta_feedback_repository.dart';
import 'beta_feedback_screens.dart';
import 'beta_feedback_sheet.dart';
import 'shake_detector.dart';

/// Firestore kill switch: `app_config/beta_feedback`.
///
/// Beta collection is meant to end. Both flags default to **on** when the doc
/// is missing so the feature works out of the box, and staff can switch it off
/// from the admin Beta Testing tab without shipping a new build.
const String kBetaFeedbackConfigDoc = 'beta_feedback';
const String kBetaFeedbackConfigCollection = 'app_config';

/// Wraps the whole app so a shake on *any* screen opens the report sheet.
///
/// The screenshot comes from the [RepaintBoundary] around [child]. The floating
/// button and the sheet are deliberately outside that boundary, which is what
/// makes the captured image "the screen without the commenting widget" — there
/// is no report UI inside the boundary to hide.
///
/// Platform views (video player, camera preview, embedded maps) render outside
/// Flutter's layer tree and come out blank; everything else captures.
class BetaFeedbackOverlay extends StatefulWidget {
  const BetaFeedbackOverlay({super.key, required this.child});

  final Widget child;

  @override
  State<BetaFeedbackOverlay> createState() => _BetaFeedbackOverlayState();
}

class _BetaFeedbackOverlayState extends State<BetaFeedbackOverlay> {
  /// Long edge of the captured PNG, in pixels. Big enough to read UI labels,
  /// small enough that a report uploads on conference wifi.
  static const double _targetCaptureWidth = 1080;

  final GlobalKey _captureKey = GlobalKey(debugLabel: 'betaFeedbackCapture');
  final BetaFeedbackRepository _repository = BetaFeedbackRepository();

  late final ShakeDetector _detector = ShakeDetector(onShake: _onShake);

  StreamSubscription<User?>? _authSub;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _configSub;

  bool _signedIn = FirebaseAuth.instance.currentUser != null;
  bool _shakeEnabled = true;
  bool _buttonEnabled = true;
  bool _sheetOpen = false;

  /// Where the tester dragged the bug button, as a fraction of the screen.
  /// Null keeps it at the default resting spot above the bottom-right corner.
  Alignment? _buttonAlignment;

  bool get _active => _signedIn && (_shakeEnabled || _buttonEnabled);

  @override
  void initState() {
    super.initState();

    _authSub = FirebaseAuth.instance.authStateChanges().listen((user) {
      final next = user != null;
      if (next == _signedIn) return;
      setState(() => _signedIn = next);
      _syncDetector();
    });

    _configSub = FirebaseFirestore.instance
        .collection(kBetaFeedbackConfigCollection)
        .doc(kBetaFeedbackConfigDoc)
        .snapshots()
        .listen(
          (snap) {
            final data = snap.data();
            final shake = data?['shake_enabled'];
            final button = data?['button_enabled'];
            setState(() {
              _shakeEnabled = shake is bool ? shake : true;
              _buttonEnabled = button is bool ? button : true;
            });
            _syncDetector();
          },
          // No config doc, or rules deny the read: leave the defaults on.
          onError: (Object e) => debugPrint('[beta_feedback] config read failed: $e'),
        );

    _syncDetector();
  }

  @override
  void dispose() {
    _authSub?.cancel();
    _configSub?.cancel();
    _detector.dispose();
    super.dispose();
  }

  void _syncDetector() {
    if (_signedIn && _shakeEnabled) {
      _detector.start();
    } else {
      _detector.stop();
    }
  }

  Future<void> _onShake() async {
    if (!_signedIn || !_shakeEnabled) return;
    await HapticFeedback.mediumImpact();
    await _openReport('shake');
  }

  Future<void> _openReport(String trigger) async {
    if (_sheetOpen) return;
    _sheetOpen = true;
    _detector.pause();

    try {
      // Captured before anything of ours is on screen.
      final screenshot = await _captureScreen();

      if (!mounted) return;
      final navigatorContext = expansionRootNavigatorKey.currentContext;
      if (navigatorContext == null || !navigatorContext.mounted) return;

      final screen = AnalyticsService.instance.currentScreen;
      final route = AnalyticsService.instance.currentRoute;
      final label = betaFeedbackScreenLabel(screen);
      final size = MediaQuery.of(context).size;

      final sent = await showModalBottomSheet<bool>(
        context: navigatorContext,
        useRootNavigator: true,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        barrierColor: Colors.black.withValues(alpha: 0.6),
        builder: (_) => BetaFeedbackSheet(
          screenLabel: label,
          route: route,
          screenshot: screenshot,
          onSubmit: (comment) => _repository.submit(
            comment: comment,
            screen: screen,
            screenLabel: label,
            route: route,
            trigger: trigger,
            screenshot: screenshot,
            screenSize: size,
          ),
        ),
      );

      if (sent == true) {
        final messengerContext = expansionRootNavigatorKey.currentContext;
        if (messengerContext != null && messengerContext.mounted) {
          ScaffoldMessenger.maybeOf(messengerContext)?.showSnackBar(
            const SnackBar(content: Text('Thanks — sent to the MORTAR team.')),
          );
        }
      }
    } finally {
      _sheetOpen = false;
      _detector.resume();
    }
  }

  /// PNG bytes of the app below the overlay, or null if the frame could not be
  /// rasterised (never fatal — the report still goes out with the screen name).
  Future<Uint8List?> _captureScreen() async {
    try {
      final boundary =
          _captureKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) return null;

      // In debug builds the boundary can be mid-paint when a shake lands.
      if (boundary.debugNeedsPaint) {
        await Future<void>.delayed(const Duration(milliseconds: 40));
        if (!mounted) return null;
      }

      final logicalWidth = boundary.size.width;
      if (logicalWidth <= 0) return null;
      final devicePixelRatio = MediaQuery.of(context).devicePixelRatio;
      final pixelRatio =
          (_targetCaptureWidth / logicalWidth).clamp(1.0, devicePixelRatio);

      final image = await boundary.toImage(pixelRatio: pixelRatio);
      final data = await image.toByteData(format: ui.ImageByteFormat.png);
      image.dispose();
      return data?.buffer.asUint8List();
    } catch (e) {
      debugPrint('[beta_feedback] capture failed: $e');
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        RepaintBoundary(key: _captureKey, child: widget.child),
        if (_active && _buttonEnabled)
          _BetaFeedbackButton(
            alignment: _buttonAlignment ?? const Alignment(0.92, 0.72),
            onAlignmentChanged: (a) => setState(() => _buttonAlignment = a),
            onTap: () => _openReport('button'),
          ),
      ],
    );
  }
}

/// Draggable bug button. Small, semi-transparent, and it snaps to whichever
/// side it was let go nearest, so it can always be moved off whatever it covers.
class _BetaFeedbackButton extends StatefulWidget {
  const _BetaFeedbackButton({
    required this.alignment,
    required this.onAlignmentChanged,
    required this.onTap,
  });

  final Alignment alignment;
  final ValueChanged<Alignment> onAlignmentChanged;
  final VoidCallback onTap;

  @override
  State<_BetaFeedbackButton> createState() => _BetaFeedbackButtonState();
}

class _BetaFeedbackButtonState extends State<_BetaFeedbackButton> {
  static const double _size = 44;

  bool _dragging = false;
  late Alignment _live = widget.alignment;

  @override
  void didUpdateWidget(covariant _BetaFeedbackButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_dragging && oldWidget.alignment != widget.alignment) {
      _live = widget.alignment;
    }
  }

  @override
  Widget build(BuildContext context) {
    // SafeArea keeps the button clear of the notch and the home indicator.
    return Positioned.fill(
      child: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final maxX = (constraints.maxWidth - _size).clamp(0.0, double.infinity);
            final maxY = (constraints.maxHeight - _size).clamp(0.0, double.infinity);
            final left = (_live.x + 1) / 2 * maxX;
            final top = (_live.y + 1) / 2 * maxY;

            return Stack(
              children: [
                Positioned(
                  left: left,
                  top: top,
                  width: _size,
                  height: _size,
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: widget.onTap,
                    onPanStart: (_) => setState(() => _dragging = true),
                    onPanUpdate: (details) {
                      // Deltas, not global coordinates: `left`/`top` are already
                      // derived from `_live` each build, so accumulating keeps
                      // the button under the finger without any coordinate
                      // conversion between this box and the LayoutBuilder's.
                      final nextX = (left + details.delta.dx).clamp(0.0, maxX);
                      final nextY = (top + details.delta.dy).clamp(0.0, maxY);
                      setState(() {
                        _live = Alignment(
                          maxX == 0 ? 0 : nextX / maxX * 2 - 1,
                          maxY == 0 ? 0 : nextY / maxY * 2 - 1,
                        );
                      });
                    },
                    onPanEnd: (_) {
                      // Snap to the nearer vertical edge so it never floats
                      // in the middle of content.
                      final snapped = Alignment(_live.x < 0 ? -0.94 : 0.94, _live.y);
                      setState(() {
                        _dragging = false;
                        _live = snapped;
                      });
                      widget.onAlignmentChanged(snapped);
                    },
                    child: Semantics(
                      button: true,
                      label: 'Send beta feedback about this screen',
                      child: Opacity(
                        opacity: _dragging ? 1 : 0.72,
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Cosmic.space.withValues(alpha: 0.8),
                            border: Border.all(
                              color: Cosmic.accentExpansion.withValues(alpha: 0.75),
                              width: 1.5,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Cosmic.accentExpansion.withValues(alpha: 0.35),
                                blurRadius: 14,
                                spreadRadius: 1,
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.bug_report_outlined,
                            size: 20,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
