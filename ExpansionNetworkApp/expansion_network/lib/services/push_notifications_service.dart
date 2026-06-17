import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

class PushNotificationsService {
  factory PushNotificationsService({
    FirebaseMessaging? messaging,
    FirebaseAuth? auth,
    FirebaseFirestore? firestore,
  }) {
    _instance ??= PushNotificationsService._internal(
      messaging: messaging,
      auth: auth,
      firestore: firestore,
    );
    return _instance!;
  }

  PushNotificationsService._internal({
    FirebaseMessaging? messaging,
    FirebaseAuth? auth,
    FirebaseFirestore? firestore,
  })  : _messaging = messaging ?? FirebaseMessaging.instance,
        _auth = auth ?? FirebaseAuth.instance,
        _firestore = firestore ?? FirebaseFirestore.instance;
  static PushNotificationsService? _instance;

  final FirebaseMessaging _messaging;
  final FirebaseAuth _auth;
  final FirebaseFirestore _firestore;

  StreamSubscription<String>? _tokenRefreshSub;
  StreamSubscription<RemoteMessage>? _tapSub;
  bool _initialized = false;
  Future<void> Function(String deepLink)? _onDeepLink;

  Future<void> initialize({
    Future<void> Function(String deepLink)? onDeepLink,
  }) async {
    if (_initialized) return;
    _initialized = true;
    _onDeepLink = onDeepLink;

    final settings = await _messaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );
    debugPrint('PushNotificationsService: permission=${settings.authorizationStatus}');

    await _messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    _tokenRefreshSub ??= _messaging.onTokenRefresh.listen((token) async {
      await _saveTokenForCurrentUser(token);
    });

    _tapSub ??= FirebaseMessaging.onMessageOpenedApp.listen((message) async {
      await _handleDeepLinkFromMessage(message);
    });

    final initial = await _messaging.getInitialMessage();
    if (initial != null) {
      await _handleDeepLinkFromMessage(initial);
    }

    if (kDebugMode) {
      await _logPushDebugInfo();
    }
  }

  Future<void> syncTokenForCurrentUser() async {
    final token = await _messaging.getToken();
    if (token == null || token.isEmpty) return;
    await _saveTokenForCurrentUser(token);
  }

  Future<void> _saveTokenForCurrentUser(String fcmToken) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return;

    final payload = <String, dynamic>{
      'fcm_token': fcmToken,
      'fcm_tokens': FieldValue.arrayUnion([fcmToken]),
      'fcm_token_updated_at': FieldValue.serverTimestamp(),
      'updated_at': FieldValue.serverTimestamp(),
    };

    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.iOS) {
      final apnsToken = await _messaging.getAPNSToken();
      if (apnsToken != null && apnsToken.isNotEmpty) {
        payload['apns_token'] = apnsToken;
      }
    }

    await _firestore.collection('users').doc(uid).set(payload, SetOptions(merge: true));
  }

  /// Detach this device's FCM token on logout. Must be called **before**
  /// `FirebaseAuth.signOut()` so `currentUser` is still available to scope the write.
  /// Removes the token from the user doc (so the backend stops targeting this device)
  /// and deletes it on-device so a fresh token is minted on the next login.
  Future<void> removeTokenForCurrentUser() async {
    final uid = _auth.currentUser?.uid;
    String? token;
    try {
      token = await _messaging.getToken();
    } catch (_) {
      token = null;
    }

    if (uid != null && token != null && token.isNotEmpty) {
      final update = <String, dynamic>{
        'fcm_tokens': FieldValue.arrayRemove([token]),
        'updated_at': FieldValue.serverTimestamp(),
      };
      try {
        final snap = await _firestore.collection('users').doc(uid).get();
        if (snap.data()?['fcm_token'] == token) {
          update['fcm_token'] = FieldValue.delete();
        }
        await _firestore.collection('users').doc(uid).set(
              update,
              SetOptions(merge: true),
            );
      } catch (e) {
        debugPrint('PushNotificationsService: removeToken doc update failed: $e');
      }
    }

    try {
      await _messaging.deleteToken();
    } catch (e) {
      debugPrint('PushNotificationsService: deleteToken failed: $e');
    }
  }

  Future<void> _handleDeepLinkFromMessage(RemoteMessage message) async {
    final deepLink = message.data['deep_link'];
    if (deepLink is! String || deepLink.trim().isEmpty) return;
    final handler = _onDeepLink;
    if (handler == null) return;
    await handler(deepLink.trim());
  }

  Future<void> _logPushDebugInfo() async {
    final projectId = _firestore.app.options.projectId;
    final fcmToken = await _messaging.getToken();
    String? apnsToken;
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.iOS) {
      apnsToken = await _messaging.getAPNSToken();
    }

    debugPrint('=== PUSH DEBUG START ===');
    debugPrint('Firebase projectId: ${projectId.isEmpty ? "unknown" : projectId}');
    debugPrint('FCM token: ${fcmToken ?? "null"}');
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.iOS) {
      debugPrint('APNs token: ${apnsToken ?? "null"}');
    }
    debugPrint('=== PUSH DEBUG END ===');
  }

  Future<void> dispose() async {
    await _tokenRefreshSub?.cancel();
    _tokenRefreshSub = null;
    await _tapSub?.cancel();
    _tapSub = null;
  }
}
