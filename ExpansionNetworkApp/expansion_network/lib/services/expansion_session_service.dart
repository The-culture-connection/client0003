import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/services.dart';

/// Non-null when the Flutter ↔ native **Pigeon** channel for Firebase broke.
/// Typical cause: **Hot Restart** (`R`) on Android while `cloud_functions` (or
/// other Firebase plugins) were already initialized — same class of issue as
/// `FirebaseCoreHostApi` in [ApplicationNotes]. **Fix:** stop the app fully,
/// then **Run** again; prefer **Hot Reload** (`r`) while developing.
/// True only for real Flutter ↔ native **channel** failures (Pigeon), not for
/// normal HTTPS errors from the callable (those often mention
/// `cloud_functions_platform_interface` in stack traces and must not be
/// mislabeled as a “lost bridge”).
bool _textLooksLikePigeonChannelFailure(String s) {
  final t = s.toLowerCase();
  if (t.contains('unable to establish connection on channel')) return true;
  if (t.contains('channel was discarded')) return true;
  if (t.contains('channel-error')) return true;
  // Specific host API name appears in genuine channel errors, rarely in HTTP messages.
  if (t.contains('cloudfunctionshostapi') &&
      (t.contains('unable to establish') || t.contains('connection'))) {
    return true;
  }
  return false;
}

String? firebaseNativeBridgeLostUserMessage(Object error) {
  if (error is PlatformException && error.code == 'channel-error') {
    return _firebaseBridgeRecoveryInstructions;
  }
  if (_textLooksLikePigeonChannelFailure(error.toString())) {
    return _firebaseBridgeRecoveryInstructions;
  }
  if (error is FirebaseFunctionsException) {
    final code = error.code.toLowerCase();
    final msg = error.message ?? '';
    final combined = '${error.toString()} $msg';
    // Only treat as bridge loss when the text clearly indicates the platform channel.
    if ((code == 'unknown' || code == 'internal') &&
        _textLooksLikePigeonChannelFailure(combined)) {
      return _firebaseBridgeRecoveryInstructions;
    }
  }
  return null;
}

const String _firebaseBridgeRecoveryInstructions =
    'This build lost the native link to Firebase Cloud Functions (common on '
    'Android after Hot Restart, or if the app was not rebuilt after adding '
    'cloud_functions). Fix: uninstall the app from the device, then run '
    'flutter clean && flutter pub get, then Run again. Use Hot Reload (r) '
    'only—not Hot Restart (R)—while testing Firebase.';

/// Readable message for callable failures; hides long stack traces for bridge loss.
String userMessageForFirebaseCallableError(Object error) {
  final bridge = firebaseNativeBridgeLostUserMessage(error);
  if (bridge != null) return bridge;
  if (error is FirebaseFunctionsException) {
    final code = error.code;
    final m = error.message?.trim();
    if (m != null && m.isNotEmpty) return '[$code] $m';
    return '[$code]';
  }
  return error.toString();
}

/// Calls Expansion Network Cloud Functions (region must match deployment).
class ExpansionSessionService {
  ExpansionSessionService({FirebaseFunctions? functions})
      : _functions =
            functions ?? FirebaseFunctions.instanceFor(region: 'us-central1');

  final FirebaseFunctions _functions;

  Future<Map<String, dynamic>> initializeUserSession() async {
    final callable = _functions.httpsCallable('initializeUserSession');
    final result = await callable.call();
    return Map<String, dynamic>.from(result.data as Map);
  }

  /// Public callable — no prior sign-in.
  Future<Map<String, dynamic>> claimInviteAndCreateAccount({
    required String email,
    required String inviteCode,
    required String password,
  }) async {
    final callable = _functions.httpsCallable('claimInviteAndCreateAccount');
    final result = await callable.call(<String, dynamic>{
      'email': email.trim(),
      'inviteCode': inviteCode.trim(),
      'password': password,
    });
    return Map<String, dynamic>.from(result.data as Map);
  }

  /// Public — checks invite; returns [authAccountExists] when [valid] is true.
  Future<Map<String, dynamic>> validateInviteCode({
    required String email,
    required String inviteCode,
  }) async {
    final callable = _functions.httpsCallable('validateInviteCode');
    final result = await callable.call(<String, dynamic>{
      'email': email.trim(),
      'inviteCode': inviteCode.trim(),
    });
    return Map<String, dynamic>.from(result.data as Map);
  }

  /// Authenticated — marks invite used and links [eligibleUsers] after sign-in.
  Future<Map<String, dynamic>> finalizeInviteClaim({
    required String inviteCode,
  }) async {
    final callable = _functions.httpsCallable('finalizeInviteClaim');
    final result = await callable.call(<String, dynamic>{
      'inviteCode': inviteCode.trim(),
    });
    return Map<String, dynamic>.from(result.data as Map);
  }
}
