import 'dart:async';
import 'dart:math' as math;

import 'package:sensors_plus/sensors_plus.dart';

/// Recognises a deliberate phone shake from the accelerometer.
///
/// A single spike above the threshold is not a shake — a phone dropped on a
/// desk or yanked out of a pocket clears 2g easily. So a shake is
/// [requiredJolts] *separate* spikes inside [joltWindow], each at least
/// [minJoltGap] after the last, which is the back-and-forth motion of an actual
/// wrist shake and very hard to produce by accident.
///
/// After firing, the detector ignores everything for [cooldown] so one long
/// shake cannot open the sheet twice.
class ShakeDetector {
  ShakeDetector({
    required this.onShake,
    this.gForceThreshold = 2.4,
    this.requiredJolts = 3,
    this.joltWindow = const Duration(milliseconds: 1200),
    this.minJoltGap = const Duration(milliseconds: 110),
    this.cooldown = const Duration(seconds: 3),
  });

  final void Function() onShake;

  /// Total acceleration (including gravity) above which a sample counts as a jolt.
  final double gForceThreshold;

  /// Jolts needed inside [joltWindow] before [onShake] fires.
  final int requiredJolts;

  final Duration joltWindow;

  /// Minimum spacing between jolts, so one spike spread over several samples
  /// is not counted repeatedly.
  final Duration minJoltGap;

  final Duration cooldown;

  static const double _gravity = 9.80665;

  StreamSubscription<AccelerometerEvent>? _subscription;
  final List<DateTime> _jolts = <DateTime>[];
  DateTime? _firedAt;
  bool _paused = false;

  bool get isListening => _subscription != null;

  /// Safe to call repeatedly; only the first call subscribes.
  void start() {
    if (_subscription != null) return;
    _subscription = accelerometerEventStream(
      samplingPeriod: SensorInterval.gameInterval,
    ).listen(_onSample, onError: (_) {
      // A device without a usable accelerometer (or an emulator with sensors
      // off) just means the floating button is the only way in.
      stop();
    });
  }

  void stop() {
    _subscription?.cancel();
    _subscription = null;
    _jolts.clear();
  }

  /// Stops reacting without unsubscribing — used while the report sheet is open.
  void pause() {
    _paused = true;
    _jolts.clear();
  }

  void resume() {
    _paused = false;
    _jolts.clear();
    _firedAt = DateTime.now();
  }

  void _onSample(AccelerometerEvent event) {
    if (_paused) return;

    final gForce =
        math.sqrt(event.x * event.x + event.y * event.y + event.z * event.z) / _gravity;
    if (gForce < gForceThreshold) return;

    final now = DateTime.now();
    if (_firedAt != null && now.difference(_firedAt!) < cooldown) return;
    if (_jolts.isNotEmpty && now.difference(_jolts.last) < minJoltGap) return;

    _jolts
      ..add(now)
      ..removeWhere((t) => now.difference(t) > joltWindow);

    if (_jolts.length >= requiredJolts) {
      _jolts.clear();
      _firedAt = now;
      onShake();
    }
  }

  void dispose() => stop();
}
