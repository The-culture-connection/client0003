import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

import '../utils/content_suspension.dart';

/// Member safety reports: `user_reports/{id}` (staff read/update).
class UserReportsRepository {
  UserReportsRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
    FirebaseFunctions? functions,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance,
        _functions = functions ?? FirebaseFunctions.instanceFor(region: 'us-central1');

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;
  final FirebaseFunctions _functions;

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
    try {
      await _col.add({
        'reporter_id': me,
        'reported_user_id': reportedUserId,
        'reason': r,
        'status': 'open',
        'created_at': FieldValue.serverTimestamp(),
      });
    } on FirebaseException catch (e) {
      if (e.code == 'permission-denied') {
        throw StateError(
          'Could not submit report (permission denied). If this persists, ask an admin to deploy '
          'the latest Firestore rules for this Firebase project (${Firebase.app().options.projectId}).',
        );
      }
      rethrow;
    }
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

  /// Staff: [moderateUserAccount] then mark report resolved with [staff_resolution] `ban` or `unsuspend`.
  Future<void> finalizeStaffModeration({
    required String reportId,
    required String reportedUserId,
    required bool ban,
  }) async {
    final me = _auth.currentUser?.uid;
    if (me == null) throw StateError('Not signed in');
    final callable = _functions.httpsCallable('moderateUserAccount');
    await callable.call<Map<String, dynamic>>({
      'uid': reportedUserId,
      'action': ban ? 'ban' : 'lift_content_suspension',
    });
    await _col.doc(reportId).update({
      'status': 'resolved',
      'staff_resolution': ban ? 'ban' : 'unsuspend',
      'resolved_at': FieldValue.serverTimestamp(),
      'resolved_by': me,
      'updated_at': FieldValue.serverTimestamp(),
    });
  }
}
