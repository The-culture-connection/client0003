import 'package:cloud_functions/cloud_functions.dart';

/// Staff callables: moderation snapshot + account actions (aligned with web admin).
class AdminModerationRepository {
  AdminModerationRepository({FirebaseFunctions? functions})
      : _functions = functions ?? FirebaseFunctions.instanceFor(region: 'us-central1');

  final FirebaseFunctions _functions;

  Future<Map<String, dynamic>> getUserModerationSnapshot(String uid) async {
    final callable = _functions.httpsCallable('getUserModerationSnapshot');
    final res = await callable.call<Map<String, dynamic>>({'uid': uid});
    return Map<String, dynamic>.from(res.data);
  }

  /// [action]: `ban`, `unban`, `lift_content_suspension`.
  Future<void> moderateUserAccount({required String uid, required String action}) async {
    final callable = _functions.httpsCallable('moderateUserAccount');
    await callable.call<Map<String, dynamic>>({'uid': uid, 'action': action});
  }
}
