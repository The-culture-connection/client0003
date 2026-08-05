import 'package:cloud_functions/cloud_functions.dart';

import '../models/conference_attendee_survey.dart';

/// Saves the pre-checkout registration survey.
///
/// Same `us-central1` region as [ConferenceTicketService] — the callable region
/// must match the deployment.
class ConferenceAttendeeSurveyService {
  ConferenceAttendeeSurveyService({FirebaseFunctions? functions})
      : _functions =
            functions ?? FirebaseFunctions.instanceFor(region: 'us-central1');

  final FirebaseFunctions _functions;

  /// Authenticated — upserts `conferences/{id}/attendee_profiles/{uid}` and
  /// mirrors the reusable answers onto `users/{uid}`. Returns
  /// `{success, conference_id, user_id, first_submission}`.
  Future<Map<String, dynamic>> save({
    required String conferenceId,
    required ConferenceAttendeeSurvey survey,
  }) async {
    final callable = _functions.httpsCallable('saveConferenceAttendeeSurvey');
    final result = await callable.call(<String, dynamic>{
      'conference_id': conferenceId,
      'answers': survey.toAnswers(),
    });
    return Map<String, dynamic>.from(result.data as Map);
  }
}
