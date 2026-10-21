import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

import '../../models/expansion_match.dart';
import '../../profile/profile_utils.dart';

/// Conference smart matching: the Networking Hall's algorithm, run against one
/// conference's attendees.
///
/// Calls `runConferenceUserMatching` and reads
/// `users/{uid}/conference_matches`, whose rows have the same shape as the
/// Networking Hall's `expansion_matches` plus a `conferenceId`.
class ConferenceSmartMatchingService {
  ConferenceSmartMatchingService({
    FirebaseFirestore? firestore,
    FirebaseFunctions? functions,
    FirebaseAuth? auth,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _functions = functions ??
            FirebaseFunctions.instanceFor(app: Firebase.app(), region: 'us-central1'),
        _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;
  final FirebaseAuth _auth;

  /// Recomputes the caller's top matches among [conferenceId]'s attendees.
  Future<Map<String, dynamic>> runMatching(String conferenceId) async {
    final user = _auth.currentUser;
    if (user == null) throw StateError('Not signed in');
    await user.getIdToken(true);
    final result = await _functions
        .httpsCallable('runConferenceUserMatching')
        .call(<String, dynamic>{'conferenceId': conferenceId});
    final data = result.data;
    return data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
  }

  /// The caller's saved matches for [conferenceId], highest score first.
  ///
  /// Sorted client-side so the query needs no composite index.
  Stream<List<ExpansionMatch>> watchMatches(String uid, String conferenceId) {
    return _db
        .collection('users')
        .doc(uid)
        .collection('conference_matches')
        .where('conferenceId', isEqualTo: conferenceId)
        .snapshots()
        .map((snap) {
      final list = snap.docs.map((d) => ExpansionMatch.fromDoc(d.id, d.data())).toList()
        ..sort((a, b) => b.score.compareTo(a.score));
      return list;
    });
  }

  /// Whether the signed-in user's profile is fully complete; live, so the
  /// disclaimer clears as soon as they finish Edit Profile and come back.
  Stream<bool> watchProfileComplete(String uid) {
    return _db.collection('users').doc(uid).snapshots().map((snap) {
      final data = snap.data();
      return data != null && isProfileFullyComplete(data);
    });
  }
}
