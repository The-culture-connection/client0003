import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';

import '../models/conference_networking_profile.dart';

/// Networking-zone data access: the discoverability callables (region must match
/// deployment — `us-central1`, like [ConferenceTicketService]) plus Firestore
/// streams for the deck, my profile, and my swipes. Ranking is pure-Dart and
/// runs client-side over the fetched profiles.
class ConferenceNetworkingService {
  ConferenceNetworkingService({FirebaseFunctions? functions, FirebaseFirestore? firestore})
      : _functions = functions ?? FirebaseFunctions.instanceFor(region: 'us-central1'),
        _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFunctions _functions;
  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> _profiles(String conferenceId) =>
      _db.collection('conferences').doc(conferenceId).collection('networkingProfiles');

  // ---- Callables ----

  /// Auto-enroll / refresh. Returns `{ok, enabled, profile}`.
  Future<Map<String, dynamic>> ensureProfile({required String conferenceId}) async {
    final result = await _functions
        .httpsCallable('ensureNetworkingProfile')
        .call(<String, dynamic>{'conferenceId': conferenceId});
    return Map<String, dynamic>.from(result.data as Map);
  }

  /// Flip discoverability (the gear toggle). Returns `{ok, enabled}`.
  Future<Map<String, dynamic>> setEnabled({
    required String conferenceId,
    required bool enabled,
  }) async {
    final result = await _functions
        .httpsCallable('setNetworkingEnabled')
        .call(<String, dynamic>{'conferenceId': conferenceId, 'enabled': enabled});
    return Map<String, dynamic>.from(result.data as Map);
  }

  /// Record a swipe. On a mutual like, returns `{matched:true, targetUid,
  /// threadId, reason}` and the server has already created the match + seeded a DM.
  Future<Map<String, dynamic>> recordSwipe({
    required String conferenceId,
    required String targetUid,
    required bool like,
    String? reason,
    String? icebreaker,
  }) async {
    final result = await _functions.httpsCallable('recordConferenceSwipe').call(<String, dynamic>{
      'conferenceId': conferenceId,
      'targetUid': targetUid,
      'direction': like ? 'like' : 'pass',
      if (reason != null && reason.isNotEmpty) 'reason': reason,
      if (icebreaker != null && icebreaker.isNotEmpty) 'icebreaker': icebreaker,
    });
    return Map<String, dynamic>.from(result.data as Map);
  }

  /// People who swiped right on me that I haven't answered yet. Server-only:
  /// swipes are owner-read-only, so there is no client query for this.
  Future<List<InboundLike>> listInboundLikes({required String conferenceId}) async {
    final result = await _functions
        .httpsCallable('listConferenceInboundLikes')
        .call(<String, dynamic>{'conferenceId': conferenceId});
    final data = Map<String, dynamic>.from(result.data as Map);
    final raw = data['likes'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((m) => InboundLike.fromMap(Map<String, dynamic>.from(m)))
        .whereType<InboundLike>()
        .toList();
  }

  /// Undo the last swipe on a target (fails if it already produced a match).
  Future<Map<String, dynamic>> undoSwipe({
    required String conferenceId,
    required String targetUid,
  }) async {
    final result = await _functions.httpsCallable('undoConferenceSwipe').call(<String, dynamic>{
      'conferenceId': conferenceId,
      'targetUid': targetUid,
    });
    return Map<String, dynamic>.from(result.data as Map);
  }

  // ---- Streams ----

  /// Every discoverable attendee (enabled == true). Self/already-swiped are
  /// filtered client-side by the screen.
  Stream<List<NetworkingProfile>> watchDeck(String conferenceId) {
    return _profiles(conferenceId)
        .where('enabled', isEqualTo: true)
        .snapshots()
        .map((s) => s.docs.map(NetworkingProfile.fromDoc).toList());
  }

  Stream<NetworkingProfile?> watchMyProfile(String conferenceId, String uid) {
    return _profiles(conferenceId).doc(uid).snapshots().map(
          (d) => d.exists ? NetworkingProfile.fromDoc(d) : null,
        );
  }

  /// Target uids the current user has already swiped (like or pass).
  Stream<Set<String>> watchMySwipes(String conferenceId, String uid) {
    return _profiles(conferenceId)
        .doc(uid)
        .collection('swipes')
        .snapshots()
        .map((s) => s.docs.map((d) => d.id).toSet());
  }

  /// My mutual matches, newest first.
  ///
  /// Sorted in Dart rather than with `orderBy`: pairing `arrayContains` with an
  /// ordered field needs a composite index, and a single attendee's match list
  /// is small enough that it buys nothing.
  Stream<List<ConferenceMatch>> watchMyMatches(String conferenceId, String uid) {
    return _db
        .collection('conferences')
        .doc(conferenceId)
        .collection('matches')
        .where('users', arrayContains: uid)
        .snapshots()
        .map((s) {
      final list = s.docs
          .map((d) => ConferenceMatch.fromDoc(d, uid))
          .whereType<ConferenceMatch>()
          .toList();
      list.sort((a, b) {
        final at = a.createdAt, bt = b.createdAt;
        if (at == null && bt == null) return 0;
        if (at == null) return 1;
        if (bt == null) return -1;
        return bt.compareTo(at);
      });
      return list;
    });
  }

  /// Who has actually spoken in a match's DM thread.
  ///
  /// Reads the first few messages rather than the thread's `last_sender_id`,
  /// which only names the most recent speaker and so can't tell a one-sided
  /// opener from a real back-and-forth.
  Future<MatchTalkState> talkStateFor(String threadId, String me) async {
    try {
      final snap = await _db
          .collection('dm_threads')
          .doc(threadId)
          .collection('messages')
          .orderBy('created_at')
          .limit(8)
          .get();
      final senders = snap.docs
          .map((d) => d.data()['sender_id'])
          .whereType<String>()
          .toSet();
      if (senders.isEmpty) return MatchTalkState.silent;
      if (senders.length > 1) return MatchTalkState.talking;
      return senders.first == me ? MatchTalkState.awaitingThem : MatchTalkState.awaitingMe;
    } catch (_) {
      // A thread we can't read yet shouldn't blank the row — treat it as
      // "nothing said" so the card still renders with a Say hello action.
      return MatchTalkState.silent;
    }
  }

  // ---- Ranking (pure) ----

  /// Rank [others] against [me] by shared goals / complementary skills / industry.
  /// Excludes anyone in [excludeUids] and [me] itself. Highest score first.
  static List<NetworkingCandidate> rankCandidates(
    NetworkingProfile me,
    List<NetworkingProfile> others, {
    Set<String> excludeUids = const {},
  }) {
    final ranked = <NetworkingCandidate>[];
    for (final other in others) {
      if (other.uid == me.uid || excludeUids.contains(other.uid)) continue;
      ranked.add(_scoreCandidate(me, other));
    }
    ranked.sort((a, b) => b.matchScore.compareTo(a.matchScore));
    return ranked;
  }

  static NetworkingCandidate _scoreCandidate(NetworkingProfile me, NetworkingProfile other) {
    final sharedGoals = _intersect(me.goals, other.goals);
    final theyOfferIneed = _intersect(other.offers, me.seeks); // they can help me
    final iOfferTheyNeed = _intersect(other.seeks, me.offers); // I can help them
    final sameIndustry = me.industry.isNotEmpty &&
        me.industry.toLowerCase() == other.industry.toLowerCase();
    final sameLoc = me.location.isNotEmpty &&
        me.location.toLowerCase() == other.location.toLowerCase();

    var score = 45 +
        22 * _cap2(sharedGoals.length) +
        18 * _cap2(theyOfferIneed.length) +
        10 * _cap2(iOfferTheyNeed.length) +
        (sameIndustry ? 15 : 0) +
        (sameLoc ? 8 : 0);
    score = score.clamp(35, 99);

    // Strongest "why you should meet" reason (prominent gold banner).
    String? reason;
    if (sharedGoals.isNotEmpty) {
      reason = 'You both want ${sharedGoals.first}';
    } else if (theyOfferIneed.isNotEmpty) {
      reason = 'They can offer ${theyOfferIneed.first}';
    } else if (sameIndustry) {
      reason = 'You both work in ${other.industry}';
    } else if (iOfferTheyNeed.isNotEmpty) {
      reason = 'You can help with ${iOfferTheyNeed.first}';
    }

    return NetworkingCandidate(profile: other, matchScore: score, reason: reason);
  }

  static int _cap2(int n) => n > 2 ? 2 : n;

  static List<String> _intersect(List<String> a, List<String> b) {
    final bl = b.map((e) => e.toLowerCase()).toSet();
    return a.where((e) => bl.contains(e.toLowerCase())).toList();
  }
}
