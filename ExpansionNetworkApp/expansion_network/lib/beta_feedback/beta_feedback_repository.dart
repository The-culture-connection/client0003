import 'dart:io' show Platform;
import 'dart:ui' show Size;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// Beta tester reports: `beta_feedback/{id}` (staff read/update from the
/// Digital Curriculum admin → **Beta Testing** tab).
///
/// The screenshot lives in Cloud Storage at `beta_feedback/{uid}/{docId}.png`
/// and the doc keeps both the path and a download URL. Storage is written
/// first so the doc is never created pointing at a file that failed to upload;
/// if the upload fails the report is still filed, just without an image, since
/// the comment is the part that cannot be reconstructed later.
class BetaFeedbackRepository {
  BetaFeedbackRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
    FirebaseStorage? storage,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance,
        _storage = storage ?? FirebaseStorage.instance;

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;
  final FirebaseStorage _storage;

  static const String collectionPath = 'beta_feedback';
  static const String storageFolder = 'beta_feedback';

  /// Max characters accepted, matching the Firestore rule.
  static const int maxCommentLength = 4000;

  CollectionReference<Map<String, dynamic>> get _col => _db.collection(collectionPath);

  /// Files one report. Returns the new document id.
  ///
  /// [screen] is the router template (`/groups/:groupId`), [screenLabel] the
  /// human name shown in the admin list, [route] the location actually visited.
  /// [trigger] is `shake` or `button`.
  Future<String> submit({
    required String comment,
    required String screen,
    required String screenLabel,
    required String route,
    required String trigger,
    Uint8List? screenshot,
    Size? screenSize,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');

    final text = comment.trim();
    if (text.isEmpty) throw StateError('Tell us what you would change.');
    if (text.length > maxCommentLength) {
      throw StateError('Please keep it under $maxCommentLength characters.');
    }

    final docRef = _col.doc();

    String? screenshotPath;
    String? screenshotUrl;
    String? screenshotError;
    if (screenshot != null && screenshot.isNotEmpty) {
      final path = '$storageFolder/$uid/${docRef.id}.png';
      try {
        final ref = _storage.ref(path);
        await ref.putData(
          screenshot,
          SettableMetadata(contentType: 'image/png'),
        );
        screenshotUrl = await ref.getDownloadURL();
        screenshotPath = path;
      } catch (e) {
        // Keep the report — an image-less report still tells us the screen.
        debugPrint('[beta_feedback] screenshot upload failed: $e');
        screenshotError = e.toString();
      }
    }

    await docRef.set(<String, dynamic>{
      'comment': text,
      'screen': screen,
      'screen_label': screenLabel,
      'route': route,
      'trigger': trigger,
      'source': 'mobile',
      'status': 'new',
      'user_id': uid,
      'user_email': _auth.currentUser?.email ?? '',
      'user_name': await _resolveDisplayName(uid),
      'platform': _platformName(),
      'os_version': _osVersion(),
      'app_version': await _appVersion(),
      if (screenSize != null) 'viewport_width': screenSize.width.round(),
      if (screenSize != null) 'viewport_height': screenSize.height.round(),
      'screenshot_path': screenshotPath,
      'screenshot_url': screenshotUrl,
      if (screenshotError != null) 'screenshot_error': screenshotError,
      'created_at': FieldValue.serverTimestamp(),
    });

    return docRef.id;
  }

  /// Best effort — a missing or unreadable profile doc must not block a report.
  Future<String> _resolveDisplayName(String uid) async {
    final authName = _auth.currentUser?.displayName?.trim() ?? '';
    try {
      final snap = await _db.collection('users').doc(uid).get();
      final data = snap.data();
      if (data != null) {
        final first = (data['first_name'] as String?)?.trim() ?? '';
        final last = (data['last_name'] as String?)?.trim() ?? '';
        final joined = [first, last].where((s) => s.isNotEmpty).join(' ');
        if (joined.isNotEmpty) return joined;
        final display = (data['display_name'] as String?)?.trim() ?? '';
        if (display.isNotEmpty) return display;
      }
    } catch (e) {
      debugPrint('[beta_feedback] name lookup failed: $e');
    }
    return authName;
  }

  static String _platformName() {
    if (kIsWeb) return 'web';
    if (Platform.isAndroid) return 'android';
    if (Platform.isIOS) return 'ios';
    return Platform.operatingSystem;
  }

  static String _osVersion() {
    if (kIsWeb) return '';
    try {
      return Platform.operatingSystemVersion;
    } catch (_) {
      return '';
    }
  }

  static Future<String> _appVersion() async {
    try {
      final info = await PackageInfo.fromPlatform();
      return '${info.version}+${info.buildNumber}';
    } catch (e) {
      debugPrint('[beta_feedback] version lookup failed: $e');
      return '';
    }
  }
}
