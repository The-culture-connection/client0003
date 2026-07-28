import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../models/conference_mission.dart';

/// Reads admin-authored missions and the signed-in user's progress.
///
/// Both are read-only from the client: definitions are staff-written, and
/// progress is produced by the mission evaluator Cloud Function whenever
/// `user_analytics_summary` changes.
class ConferenceMissionService {
  ConferenceMissionService({FirebaseFirestore? firestore, FirebaseAuth? auth})
      : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  /// Active missions for [conferenceId], in admin-defined order.
  ///
  /// Sorted client-side so a missing `display_order` on older docs cannot drop
  /// them from the query.
  Stream<List<ConferenceMission>> watchMissions(String conferenceId) {
    return _db
        .collection('conference_missions')
        .where('conference_id', isEqualTo: conferenceId)
        .where('active', isEqualTo: true)
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => ConferenceMission.fromDoc(d.id, d.data()))
            .whereType<ConferenceMission>()
            .toList()
          ..sort((a, b) {
            final byOrder = a.displayOrder.compareTo(b.displayOrder);
            return byOrder != 0 ? byOrder : a.title.compareTo(b.title);
          }));
  }

  /// Progress keyed by mission id. Empty until the evaluator has run once.
  Stream<Map<String, MissionProgress>> watchMyProgress() {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return Stream.value(const {});
    return _db.collection('mission_progress').doc(uid).snapshots().map((snap) {
      final byBadge = snap.data()?['by_badge'];
      if (byBadge is! Map) return const <String, MissionProgress>{};
      final out = <String, MissionProgress>{};
      byBadge.forEach((key, value) {
        if (value is Map) {
          out['$key'] = MissionProgress.fromMap(Map<String, dynamic>.from(value));
        }
      });
      return out;
    });
  }
}
