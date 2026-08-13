import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../conference/models/conference_networking_profile.dart';
import 'user_profile_repository.dart';

/// One mutual match for the Matches page — the partner's networking snapshot
/// plus where/why the match happened.
class MutualMatch {
  const MutualMatch({
    required this.partnerUid,
    required this.displayName,
    required this.profession,
    required this.photoUrl,
    required this.conferenceId,
    required this.conferenceName,
    this.reason,
    this.matchedAt,
  });

  final String partnerUid;
  final String displayName;
  final String profession;
  final String photoUrl;
  final String conferenceId;
  final String conferenceName;
  final String? reason;
  final DateTime? matchedAt;
}

/// Reads the mutual matches created by the conference networking flow.
///
/// Matches live at `conferences/{cid}/matches/{pairId}` with a `users` pair
/// (server-written on a reciprocal like; participants may read their own).
/// Who *liked* you is deliberately unreadable: swipes are stored under the
/// swiper's own `networkingProfiles/{uid}/swipes` subcollection, owner-read
/// only, and carry no queryable target field — the functions code calls this
/// "the mutual-match secret". So this repository can only surface mutual
/// matches, never pending incoming likes.
class ConferenceMatchesRepository {
  ConferenceMatchesRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
    UserProfileRepository? users,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance,
        _users = users ?? UserProfileRepository();

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;
  final UserProfileRepository _users;

  /// All of the caller's mutual matches across every conference, newest first.
  ///
  /// The `conferences` collection is small (Mortar's own events) and readable
  /// by any signed-in user, so a per-conference `users array-contains me`
  /// query avoids both a collection-group rule and a collection-group index.
  Future<List<MutualMatch>> loadMyMatches() async {
    final me = _auth.currentUser?.uid;
    if (me == null) return const [];

    final conferences = await _db.collection('conferences').get();
    final out = <MutualMatch>[];
    for (final conf in conferences.docs) {
      final confName = (conf.data()['name'] as String?)?.trim() ?? '';
      final QuerySnapshot<Map<String, dynamic>> matches;
      try {
        matches = await conf.reference
            .collection('matches')
            .where('users', arrayContains: me)
            .get();
      } catch (_) {
        // A conference whose matches we cannot list contributes nothing.
        continue;
      }
      for (final m in matches.docs) {
        final users = (m.data()['users'] as List?)?.whereType<String>().toList() ?? const [];
        final partner = users.firstWhere((u) => u != me, orElse: () => '');
        if (partner.isEmpty) continue;
        final reason = (m.data()['reason'] as String?)?.trim();
        final createdAt = m.data()['createdAt'];
        out.add(await _describePartner(
          conferenceId: conf.id,
          conferenceName: confName.isEmpty ? 'Conference' : confName,
          partnerUid: partner,
          reason: (reason == null || reason.isEmpty) ? null : reason,
          matchedAt: createdAt is Timestamp ? createdAt.toDate() : null,
        ));
      }
    }
    out.sort((a, b) {
      final at = a.matchedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bt = b.matchedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bt.compareTo(at);
    });
    // A pair can in principle match at more than one conference — keep the
    // most recent row per person so the list never repeats someone.
    final seen = <String>{};
    return out.where((m) => seen.add(m.partnerUid)).toList();
  }

  Future<MutualMatch> _describePartner({
    required String conferenceId,
    required String conferenceName,
    required String partnerUid,
    String? reason,
    DateTime? matchedAt,
  }) async {
    var name = '';
    var profession = '';
    var photoUrl = '';
    try {
      final snap = await _db
          .collection('conferences')
          .doc(conferenceId)
          .collection('networkingProfiles')
          .doc(partnerUid)
          .get();
      if (snap.exists) {
        final p = NetworkingProfile.fromDoc(snap);
        name = p.displayName == 'Member' ? '' : p.displayName;
        profession = p.subtitle;
        photoUrl = p.photoUrl;
      }
    } catch (_) {
      // Fall through to the users doc below.
    }
    if (name.isEmpty) {
      try {
        name = await _users.getDisplayNameForUser(partnerUid);
      } catch (_) {
        name = 'Member';
      }
    }
    return MutualMatch(
      partnerUid: partnerUid,
      displayName: name.isEmpty ? 'Member' : name,
      profession: profession,
      photoUrl: photoUrl,
      conferenceId: conferenceId,
      conferenceName: conferenceName,
      reason: reason,
      matchedAt: matchedAt,
    );
  }
}
