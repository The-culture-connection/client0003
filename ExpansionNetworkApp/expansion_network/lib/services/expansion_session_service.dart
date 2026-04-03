import 'package:cloud_functions/cloud_functions.dart';

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
}
