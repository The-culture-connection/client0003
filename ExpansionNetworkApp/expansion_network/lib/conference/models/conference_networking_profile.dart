import 'package:cloud_firestore/cloud_firestore.dart';

/// A discoverable attendee in the networking zone — mirrors
/// `conferences/{id}/networkingProfiles/{uid}` (server-written snapshot of the
/// user's curriculum profile + the `enabled` discoverability toggle).
class NetworkingProfile {
  const NetworkingProfile({
    required this.uid,
    required this.displayName,
    required this.profession,
    required this.industry,
    required this.location,
    required this.photoUrl,
    required this.offers,
    required this.seeks,
    required this.goals,
    required this.bio,
    required this.enabled,
  });

  final String uid;
  final String displayName;
  final String profession;
  final String industry;
  final String location;
  final String photoUrl;
  final List<String> offers; // confident_skills
  final List<String> seeks; // desired_skills
  final List<String> goals; // business_goals
  final String bio;
  final bool enabled;

  /// Subtitle under the name — `Profession · Industry` (either part may be empty).
  String get subtitle {
    final parts = [profession, industry].where((s) => s.trim().isNotEmpty);
    return parts.join(' · ');
  }

  String get initials {
    final parts = displayName.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    return parts.take(2).map((p) => p[0].toUpperCase()).join();
  }

  static List<String> _strList(dynamic v) {
    if (v is List) {
      return v.whereType<String>().map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
    }
    return const [];
  }

  static String _str(dynamic v) => v is String ? v.trim() : '';

  factory NetworkingProfile.fromMap(String uid, Map<String, dynamic> d) {
    return NetworkingProfile(
      uid: _str(d['uid']).isNotEmpty ? _str(d['uid']) : uid,
      displayName: _str(d['displayName']).isNotEmpty ? _str(d['displayName']) : 'Member',
      profession: _str(d['profession']),
      industry: _str(d['industry']),
      location: _str(d['location']),
      photoUrl: _str(d['photoUrl']),
      offers: _strList(d['offers']),
      seeks: _strList(d['seeks']),
      goals: _strList(d['goals']),
      bio: _str(d['bio']),
      enabled: d['enabled'] != false, // default true when missing
    );
  }

  factory NetworkingProfile.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    return NetworkingProfile.fromMap(doc.id, doc.data() ?? const {});
  }
}

/// How far a match has actually got as a conversation — the distinction Tim and
/// Jazmine asked for ("matched, but have not talked to").
///
/// Derived from who has spoken in the DM thread rather than from the message
/// count: a match seeds an opener from whoever swiped second, so a thread with
/// one message is still nobody having really said anything back.
enum MatchTalkState {
  /// Thread empty — nothing sent either way.
  silent,

  /// Only the current user has spoken; waiting on the other person.
  awaitingThem,

  /// Only the other person has spoken; the ball is with the current user.
  awaitingMe,

  /// Both have spoken — a real conversation.
  talking,
}

/// A mutual match — mirrors `conferences/{id}/matches/{pairId}`, joined to the
/// other person's networking profile and the state of the seeded DM thread.
class ConferenceMatch {
  const ConferenceMatch({
    required this.otherUid,
    required this.reason,
    required this.dmThreadId,
    required this.createdAt,
    this.profile,
    this.talkState = MatchTalkState.silent,
  });

  final String otherUid;
  final String? reason;
  final String dmThreadId;
  final DateTime? createdAt;

  /// Null while the profile snapshot is still loading, or if the other person
  /// has since turned discoverability off.
  final NetworkingProfile? profile;
  final MatchTalkState talkState;

  bool get hasTalked => talkState == MatchTalkState.talking;

  String get displayName => profile?.displayName ?? 'Member';

  ConferenceMatch copyWith({NetworkingProfile? profile, MatchTalkState? talkState}) {
    return ConferenceMatch(
      otherUid: otherUid,
      reason: reason,
      dmThreadId: dmThreadId,
      createdAt: createdAt,
      profile: profile ?? this.profile,
      talkState: talkState ?? this.talkState,
    );
  }

  /// Returns null when [me] is not one of the two participants (which would
  /// mean the rules let through a doc they shouldn't have).
  static ConferenceMatch? fromDoc(DocumentSnapshot<Map<String, dynamic>> doc, String me) {
    final d = doc.data() ?? const {};
    final users = (d['users'] as List<dynamic>?)?.whereType<String>().toList() ?? const [];
    if (users.length != 2 || !users.contains(me)) return null;
    final other = users.firstWhere((u) => u != me, orElse: () => '');
    if (other.isEmpty) return null;
    final created = d['createdAt'];
    return ConferenceMatch(
      otherUid: other,
      reason: _str(d['reason']).isEmpty ? null : _str(d['reason']),
      dmThreadId: _str(d['dmThreadId']).isEmpty ? doc.id : _str(d['dmThreadId']),
      createdAt: created is Timestamp ? created.toDate() : null,
    );
  }

  static String _str(dynamic v) => v is String ? v.trim() : '';
}

/// Someone who swiped right on the current user before the current user has
/// swiped on them — surfaced by the `listConferenceInboundLikes` callable.
class InboundLike {
  const InboundLike({required this.profile, required this.reason});

  final NetworkingProfile profile;
  final String? reason;

  static InboundLike? fromMap(Map<String, dynamic> m) {
    final uid = m['uid'];
    if (uid is! String || uid.isEmpty) return null;
    final raw = m['profile'];
    final profileMap = raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{};
    final reason = m['reason'];
    return InboundLike(
      profile: NetworkingProfile.fromMap(uid, profileMap),
      reason: reason is String && reason.trim().isNotEmpty ? reason.trim() : null,
    );
  }
}

/// A ranked deck card: a [NetworkingProfile] plus the locally-computed match
/// score and the strongest "why you should meet" reason (may be null).
class NetworkingCandidate {
  const NetworkingCandidate({
    required this.profile,
    required this.matchScore,
    required this.reason,
  });

  final NetworkingProfile profile;
  final int matchScore; // 0..100
  final String? reason;
}
