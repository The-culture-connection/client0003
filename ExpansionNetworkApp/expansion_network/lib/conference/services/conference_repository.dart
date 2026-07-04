import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/conference.dart';
import '../models/conference_session.dart';

/// Read-only access to `conferences/{conferenceId}` and its `sessions` subcollection.
class ConferenceRepository {
  ConferenceRepository({FirebaseFirestore? firestore})
      : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> get _conferences =>
      _db.collection('conferences');

  Stream<Conference?> watchConference(String conferenceId) {
    return _conferences
        .doc(conferenceId)
        .snapshots()
        .map((snap) => Conference.fromDoc(snap.id, snap.data()));
  }

  Future<Conference?> fetchConference(String conferenceId) async {
    final snap = await _conferences.doc(conferenceId).get();
    return Conference.fromDoc(snap.id, snap.data());
  }

  /// First conference with `status == 'active'` — used by the Mortarverse chooser
  /// until real per-user ticket entitlements exist (Phase 2).
  Future<Conference?> fetchActiveConference() async {
    final snap = await _conferences
        .where('status', isEqualTo: 'active')
        .orderBy('startDate', descending: false)
        .limit(1)
        .get();
    if (snap.docs.isEmpty) return null;
    return Conference.fromDoc(snap.docs.first.id, snap.docs.first.data());
  }

  Stream<List<ConferenceSession>> watchSessions(String conferenceId) {
    return _conferences
        .doc(conferenceId)
        .collection('sessions')
        .orderBy('startTime', descending: false)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((d) => ConferenceSession.fromDoc(d.id, d.data()))
              .whereType<ConferenceSession>()
              .toList(),
        );
  }

  Future<ConferenceSession?> fetchSession(
    String conferenceId,
    String sessionId,
  ) async {
    final snap = await _conferences
        .doc(conferenceId)
        .collection('sessions')
        .doc(sessionId)
        .get();
    return ConferenceSession.fromDoc(snap.id, snap.data());
  }
}
