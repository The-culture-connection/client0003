import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import 'analytics_event_schema.dart';

/// Firestore collection for client analytics (BigQuery export-friendly).
///
/// **Security rules (example):**
/// `match /expansion_analytics_events/{id} { allow create: if request.auth != null
///   && request.resource.data.user_id == request.auth.uid
///   && request.resource.data.event_name is string; }`
const String kExpansionAnalyticsCollection = 'expansion_analytics_events';

/// Pluggable delivery (Firestore, test fake, etc.).
abstract class AnalyticsSink {
  Future<void> write(Map<String, dynamic> document);
}

class AnalyticsService {
  AnalyticsService._();

  static final AnalyticsService instance = AnalyticsService._();

  static const _uuid = Uuid();

  /// Stable for the whole app process (cold start → process death).
  final String sessionId = _uuid.v4();

  AnalyticsSink? _sink;

  /// When true, [FirestoreAnalyticsSink] is not invoked without a signed-in user.
  bool skipFirestoreWhenLoggedOut = true;

  String _navigationScreen = 'unknown';
  String _navigationRoute = '/';

  DateTime? _activeScreenStartedAt;
  String? _activeScreenLabel;
  String? _activeRouteLabel;

  String? _lastNavSignature;

  void setSink(AnalyticsSink? sink) => _sink = sink;

  void _ensureDefaultSink() {
    _sink ??= FirestoreAnalyticsSink();
  }

  void updateNavigationContext({required String screen, required String route}) {
    _navigationScreen = screen;
    _navigationRoute = route;
  }

  String get currentScreen => _navigationScreen;
  String get currentRoute => _navigationRoute;

  bool get hasActiveScreenSession => _activeScreenStartedAt != null;

  /// Validates, merges base params, and delivers to the sink.
  ///
  /// [params] are nested under `properties` and must not use reserved keys.
  /// Use [screenOverride] / [routeOverride] for events that refer to a screen
  /// other than the current navigation (e.g. [logScreenSessionEnded]).
  Future<void> logEvent(
    String eventName,
    Map<String, Object?> params, {
    String? screenOverride,
    String? routeOverride,
  }) async {
    _ensureDefaultSink();
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (skipFirestoreWhenLoggedOut && uid == null && _sink is FirestoreAnalyticsSink) {
      final isErrorEvent =
          eventName.contains('error') || eventName.startsWith('app_flutter_') || eventName.startsWith('app_platform_');
      if (kDebugMode || isErrorEvent) {
        debugPrint('[analytics] skip Firestore (logged out): $eventName params=$params');
      }
      return;
    }

    final doc = AnalyticsEventSchema.buildAndValidate(
      eventName: eventName,
      userId: uid,
      sessionId: sessionId,
      screen: screenOverride ?? _navigationScreen,
      route: routeOverride ?? _navigationRoute,
      params: params,
    );

    try {
      await _sink!.write(doc);
    } catch (e, st) {
      debugPrint('[analytics] sink error: $e\n$st');
    }
  }

  /// Marks the beginning of a dwell segment on the **current** [screen]/[route].
  Future<void> logScreenSessionStarted({Map<String, Object?>? extra}) async {
    _activeScreenStartedAt = DateTime.now();
    _activeScreenLabel = _navigationScreen;
    _activeRouteLabel = _navigationRoute;
    final extraMap = extra ?? const <String, Object?>{};
    await logEvent('screen_session_started', {
      ...extraMap,
      'segment_started_at_ms': _activeScreenStartedAt!.millisecondsSinceEpoch,
    });
  }

  /// Ends the dwell opened by [logScreenSessionStarted] for the stored screen.
  Future<void> logScreenSessionEnded({Map<String, Object?>? extra}) async {
    final started = _activeScreenStartedAt;
    final exitedScreen = _activeScreenLabel ?? _navigationScreen;
    final exitedRoute = _activeRouteLabel ?? _navigationRoute;
    final durationMs = started != null ? DateTime.now().difference(started).inMilliseconds : null;

    _activeScreenStartedAt = null;
    _activeScreenLabel = null;
    _activeRouteLabel = null;

    final extraMap = extra ?? const <String, Object?>{};
    await logEvent(
      'screen_session_ended',
      {
        ...extraMap,
        if (durationMs != null) 'duration_ms': durationMs,
        'exited_screen': exitedScreen,
        'exited_route': exitedRoute,
      },
      screenOverride: exitedScreen,
      routeOverride: exitedRoute,
    );
  }

  /// Debug / manual verification (Phase 1 testing).
  Future<void> logManualTestEvent() async {
    await logEvent('analytics_manual_test', const {
      'source': 'debug_manual',
    });
  }

  bool shouldEmitForNavigationSignature(String signature) {
    if (_lastNavSignature == signature) return false;
    _lastNavSignature = signature;
    return true;
  }
}

/// Default sink: single Firestore document per event.
class FirestoreAnalyticsSink implements AnalyticsSink {
  FirestoreAnalyticsSink({FirebaseFirestore? firestore})
      : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  @override
  Future<void> write(Map<String, dynamic> document) async {
    await _db.collection(kExpansionAnalyticsCollection).add(document);
  }
}
