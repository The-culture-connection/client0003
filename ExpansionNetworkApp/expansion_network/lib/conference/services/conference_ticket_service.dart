import 'package:cloud_functions/cloud_functions.dart';

/// Calls the Conference ticket-auth Cloud Functions (region must match
/// deployment — same `us-central1` as [ExpansionSessionService]).
///
/// Mirrors the invite flow in `expansion_session_service.dart`; reuse
/// `userMessageForFirebaseCallableError` from there for readable error text.
class ConferenceTicketService {
  ConferenceTicketService({FirebaseFunctions? functions})
      : _functions =
            functions ?? FirebaseFunctions.instanceFor(region: 'us-central1');

  final FirebaseFunctions _functions;

  /// Authenticated — consumes the caller's ticket code and writes their
  /// `attendees/{uid}` access record. Returns `{ok, state, code?, message?}`.
  Future<Map<String, dynamic>> redeemConferenceTicketCode({
    required String conferenceId,
    required String code,
  }) async {
    final callable = _functions.httpsCallable('redeemConferenceTicketCode');
    final result = await callable.call(<String, dynamic>{
      'conferenceId': conferenceId,
      'code': code.trim(),
    });
    return Map<String, dynamic>.from(result.data as Map);
  }

  /// Authenticated — register for a FREE conference. Auto-issues a code, emails
  /// it, and returns `{ok, code, conferenceId}` so the app can redeem right away.
  Future<Map<String, dynamic>> registerFreeConferenceTicket({
    required String conferenceId,
  }) async {
    final callable = _functions.httpsCallable('registerFreeConferenceTicket');
    final result = await callable.call(<String, dynamic>{
      'conferenceId': conferenceId,
    });
    return Map<String, dynamic>.from(result.data as Map);
  }

  /// Authenticated — non-consuming validity check. Returns `{valid, code, message?}`.
  Future<Map<String, dynamic>> validateConferenceTicketCode({
    required String conferenceId,
    required String code,
  }) async {
    final callable = _functions.httpsCallable('validateConferenceTicketCode');
    final result = await callable.call(<String, dynamic>{
      'conferenceId': conferenceId,
      'code': code.trim(),
    });
    return Map<String, dynamic>.from(result.data as Map);
  }
}
