import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../utils/content_suspension.dart';

/// Member safety reports: `user_reports/{id}` (staff read/update).
class UserReportsRepository {
  UserReportsRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  CollectionReference<Map<String, dynamic>> get _col => _db.collection('user_reports');

  /// Submitted by a signed-in user about another profile.
  Future<void> submitReport({
    required String reportedUserId,
    required String reason,
  }) async {
    final me = _auth.currentUser?.uid;
    if (me == null) throw StateError('Not signed in');
    final r = reason.trim();
    if (r.isEmpty) throw StateError('Describe what you are reporting.');
    if (reportedUserId.isEmpty || reportedUserId == me) {
      throw StateError('Invalid report.');
    }
    await _col.add({
      'reporter_id': me,
      'reported_user_id': reportedUserId,
      'reason': r,
      'status': 'open',
      'created_at': FieldValue.serverTimestamp(),
    });
  }

  /// Newest first; filter client-side if needed.
  Stream<List<QueryDocumentSnapshot<Map<String, dynamic>>>> watchReports() {
    return _col.orderBy('created_at', descending: true).snapshots().map((s) => s.docs);
  }

  Future<void> setReportStatus({
    required String reportId,
    required String status,
  }) async {
    await _col.doc(reportId).update({
      'status': status,
      'updated_at': FieldValue.serverTimestamp(),
    });
  }

  /// Marks report investigating and suspends the reported user’s content.
  Future<void> startInvestigation({
    required String reportId,
    required String reportedUserId,
  }) async {
    final batch = _db.batch();
    batch.update(_col.doc(reportId), {
      'status': 'investigating',
      'updated_at': FieldValue.serverTimestamp(),
    });
    batch.update(_db.collection('users').doc(reportedUserId), {
      kUserFieldContentSuspended: true,
      'updated_at': FieldValue.serverTimestamp(),
    });
    await batch.commit();
  }

  /// Clears suspension and closes the report.
  Future<void> resolveAndLiftSuspension({
    required String reportId,
    required String reportedUserId,
  }) async {
    final batch = _db.batch();
    batch.update(_col.doc(reportId), {
      'status': 'resolved',
      'updated_at': FieldValue.serverTimestamp(),
    });
    batch.update(_db.collection('users').doc(reportedUserId), {
      kUserFieldContentSuspended: false,
      'updated_at': FieldValue.serverTimestamp(),
    });
    await batch.commit();
  }

  /// Dismisses report without changing the user’s suspension flag.
  Future<void> dismissReport(String reportId) async {
    await _col.doc(reportId).update({
      'status': 'dismissed',
      'updated_at': FieldValue.serverTimestamp(),
    });
  }
}
