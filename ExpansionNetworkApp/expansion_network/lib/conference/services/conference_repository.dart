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

  /// Conferences a buyer can currently enter or purchase into: `status == 'active'`,
  /// soonest first. Used by the Conference Center gate ("first click") screen.
  Future<List<Conference>> fetchUpcomingConferences({int limit = 20}) async {
    final snap = await _conferences
        .where('status', isEqualTo: 'active')
        .orderBy('startDate', descending: false)
        .limit(limit)
        .get();
    return snap.docs
        .map((d) => Conference.fromDoc(d.id, d.data()))
        .whereType<Conference>()
        .toList();
  }

  /// Whether [uid] has redeemed a ticket for [conferenceId] — the entry gate.
  /// Reads `conferences/{id}/attendees/{uid}` (a user may read their own record
  /// per `firestore.rules`).
  Future<bool> hasAttendeeAccess(String conferenceId, String uid) async {
    final snap = await _conferences
        .doc(conferenceId)
        .collection('attendees')
        .doc(uid)
        .get();
    return snap.exists;
  }

  /// Of [conferenceIds], the ones [uid] already has entry access to (redeemed).
  Future<Set<String>> accessibleConferenceIds(
    String uid,
    Iterable<String> conferenceIds,
  ) async {
    final ids = <String>{};
    for (final id in conferenceIds) {
      if (await hasAttendeeAccess(id, uid)) ids.add(id);
    }
    return ids;
  }

  /// Conference ids [uid] has a completed (paid) ticket order for — read from
  /// their own `payment_orders` (client-readable). Covers the "bought but not
  /// yet redeemed" state so the gate can show "Enter code" instead of "Buy".
  Future<Set<String>> purchasedConferenceIds(String uid) async {
    final snap = await _db
        .collection('payment_orders')
        .where('uid', isEqualTo: uid)
        .get();
    final ids = <String>{};
    for (final d in snap.docs) {
      final data = d.data();
      if (data['status'] == 'completed' && data['purchase_type'] == 'conference') {
        final meta = data['metadata'];
        final cid = meta is Map ? meta['conference_id'] as String? : null;
        if (cid != null && cid.isNotEmpty) ids.add(cid);
      }
    }
    return ids;
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
