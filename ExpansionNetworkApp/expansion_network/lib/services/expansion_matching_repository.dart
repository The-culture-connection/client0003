import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

import '../models/expansion_match.dart';

/// Calls `runExpansionUserMatching` and reads `users/{uid}/expansion_matches`.
class ExpansionMatchingRepository {
  ExpansionMatchingRepository({
    FirebaseFirestore? firestore,
    FirebaseFunctions? functions,
    FirebaseAuth? auth,
    FirebaseApp? app,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _functions = functions ??
            FirebaseFunctions.instanceFor(app: app ?? Firebase.app(), region: 'us-central1'),
        _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;
  final FirebaseAuth _auth;

  /// Recompute matches for the signed-in user (`scope: self`).
  Future<Map<String, dynamic>> runSelfMatching() async {
    final user = _auth.currentUser;
    if (user == null) throw StateError('Not signed in');
    await user.getIdToken(true);
    final callable = _functions.httpsCallable('runExpansionUserMatching');
    final result = await callable.call(<String, dynamic>{'scope': 'self'});
    final data = result.data;
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    return <String, dynamic>{};
  }

  /// Live list of match rows for [uid], highest [score] first.
  Stream<List<ExpansionMatch>> watchMatches(String uid) {
    return _db
        .collection('users')
        .doc(uid)
        .collection('expansion_matches')
        .orderBy('score', descending: true)
        .snapshots()
        .map((snap) {
      return snap.docs.map((d) => ExpansionMatch.fromDoc(d.id, d.data())).toList();
    });
  }
}
