import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/conference.dart';
import '../models/conference_floor.dart';
import '../models/conference_session.dart';
import '../models/conference_sponsor.dart';

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

  /// The ticket code Stripe's webhook issued for [conferenceId] on one of
  /// [uid]'s completed orders, or null if there isn't one.
  ///
  /// `fulfillConferenceTicket` generates the code and stashes it on the order
  /// but does **not** write the attendee record — the buyer is expected to
  /// redeem in-app. Reading it here lets the gate finish that last step for
  /// them instead of sending them to their email for a code we already have.
  Future<String?> issuedTicketCodeFor(String uid, String conferenceId) async {
    final snap = await _db
        .collection('payment_orders')
        .where('uid', isEqualTo: uid)
        .get();
    for (final d in snap.docs) {
      final data = d.data();
      if (data['status'] != 'completed') continue;
      if (data['purchase_type'] != 'conference') continue;
      final meta = data['metadata'];
      if (meta is! Map) continue;
      if (meta['conference_id'] != conferenceId) continue;
      final code = (meta['conference_ticket_code'] as String?)?.trim();
      if (code != null && code.isNotEmpty) return code;
    }
    return null;
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

  /// Live single session (for the detail screen — reflects RSVP changes).
  Stream<ConferenceSession?> watchSession(String conferenceId, String sessionId) {
    return _conferences
        .doc(conferenceId)
        .collection('sessions')
        .doc(sessionId)
        .snapshots()
        .map((snap) => ConferenceSession.fromDoc(snap.id, snap.data()));
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

  Future<ConferenceSponsor?> fetchSponsor(String conferenceId, String sponsorId) async {
    final snap = await _conferences.doc(conferenceId).collection('sponsors').doc(sponsorId).get();
    return ConferenceSponsor.fromDoc(snap.id, snap.data());
  }

  /// Venue floor plans (+ embedded room pins), sorted by order then name.
  Stream<List<ConferenceFloor>> watchFloors(String conferenceId) {
    return _conferences
        .doc(conferenceId)
        .collection('floors')
        .snapshots()
        .map((snap) {
      final list = snap.docs
          .map((d) => ConferenceFloor.fromDoc(d.id, d.data()))
          .whereType<ConferenceFloor>()
          .toList();
      list.sort((a, b) => a.order != b.order
          ? a.order.compareTo(b.order)
          : a.name.toLowerCase().compareTo(b.name.toLowerCase()));
      return list;
    });
  }

  /// Sponsor booths for a conference, sorted by company name.
  Stream<List<ConferenceSponsor>> watchSponsors(String conferenceId) {
    return _conferences
        .doc(conferenceId)
        .collection('sponsors')
        .snapshots()
        .map((snap) {
      final list = snap.docs
          .map((d) => ConferenceSponsor.fromDoc(d.id, d.data()))
          .whereType<ConferenceSponsor>()
          .toList();
      list.sort((a, b) => a.companyName.toLowerCase().compareTo(b.companyName.toLowerCase()));
      return list;
    });
  }
}
