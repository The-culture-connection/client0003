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
