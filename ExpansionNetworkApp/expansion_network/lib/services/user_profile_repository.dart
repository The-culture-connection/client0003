import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../constants/alumni_network_constants.dart';
import '../models/network_member_hit.dart';
import '../profile/profile_utils.dart';
import '../utils/content_suspension.dart';
import 'alumni_access_repository.dart';

/// Persists `users/{uid}` using the **digital curriculum** profile shape (snake_case fields).
class UserProfileRepository {
  UserProfileRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  CollectionReference<Map<String, dynamic>> get _users =>
      _db.collection('users');

  /// Records the first time this Firebase user passes the Expansion app gate (mobile app “account exists”).
  ///
  /// Idempotent: [kUserFieldExpansionMobileAppAccountCreatedAt] is only set when the flag was previously unset.
  Future<void> recordExpansionMobileAppGatePassed({
    required String uid,
    String? email,
  }) async {
    final ref = _users.doc(uid);
    await _db.runTransaction((transaction) async {
      final snap = await transaction.get(ref);
      final alreadyCreated =
          snap.data()?[kUserFieldExpansionMobileAppAccountCreated] == true;
      final payload = <String, dynamic>{
        'uid': uid,
        kUserFieldExpansionMobileAppAccountCreated: true,
        'updated_at': FieldValue.serverTimestamp(),
      };
      if (email != null && email.trim().isNotEmpty) {
        payload['email'] = email.trim();
      }
      if (!alreadyCreated) {
        payload[kUserFieldExpansionMobileAppAccountCreatedAt] =
            FieldValue.serverTimestamp();
      }
      transaction.set(ref, payload, SetOptions(merge: true));
    });
  }

  Future<Map<String, dynamic>?> getUserDoc(String uid) async {
    final snap = await _users.doc(uid).get();
    return snap.data();
  }

  /// First + last name from `users/{uid}` (falls back to [profileDisplayName] / Member).
  Future<String> getDisplayNameForUser(String uid) async {
    final d = await getUserDoc(uid);
    if (d == null) return 'Member';
    return profileDisplayName(d);
  }

  /// City + state for in-person posting location (Expansion / curriculum `users` doc).
  Future<String?> getCityStateLineForUser(String uid) async {
    final d = await getUserDoc(uid);
    if (d == null) return null;
    final city = profileString(d['city']);
    final state = profileString(d['state']);
    if (city != null && state != null) return '$city, $state';
    if (city != null) return city;
    if (state != null) return state;
    return null;
  }

  /// Live updates for profile UIs (e.g. Profile tab).
  Stream<DocumentSnapshot<Map<String, dynamic>>> watchUserDoc(String uid) =>
      _users.doc(uid).snapshots();

  Future<bool> isContentSuspended(String uid) async {
    final d = await getUserDoc(uid);
    return isProfileContentSuspended(d);
  }

  Future<void> assertCallerNotContentSuspended() async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    if (await isContentSuspended(uid)) {
      throw StateError(kContentSuspendedUserMessage);
    }
  }

  /// `false` if Expansion onboarding or curriculum onboarding is already complete.
  Future<bool> needsExpansionOnboarding(String uid) async {
    final data = await getUserDoc(uid);
    if (data == null) return true;
    if (data['onboardingComplete'] == true && data['profileCreated'] == true) {
      return false;
    }
    if (data['expansionOnboardingComplete'] == true) return false;
    if (data['onboarding_status'] == 'complete') return false;
    return true;
  }

  /// Full save after onboarding — matches curriculum `users/{uid}` schema.
  ///
  /// **New document:** sets [roles] (from alumni allowlist), default `badges`, `membership`, `points`, `permissions`.
  /// **Existing document:** updates without `roles` or `created_at`.
  Future<void> saveExpansionProfile({
    required List<String> roles,
    required String firstName,
    required String lastName,
    required bool notInCohort,
    String? cohortId,
    required String bio,
    required String profession,
    required String city,
    required String state,
    required List<String> businessGoals,
    required List<String> confidentSkills,
    required List<String> desiredSkills,
    required String tribe,
    required int workFlexibility,
    required int weeklyHours,
    required int workOwnership,
    required String linkedin,
    required String portfolio,
    required String instagram,
    required String facebook,
    required String tiktok,
    String? photoUrl,
    String? businessLogoUrl,
    String? graduatedCityProgram,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw StateError('Not signed in');
    final uid = user.uid;
    final email = user.email ?? '';
    final sanitizedRoles = AlumniAccessRepository.filterAllowedRoles(roles);
    if (sanitizedRoles.isEmpty) {
      throw StateError(
        'No allowed Expansion Network roles. Expected one of: '
        '${kExpansionNetworkAllowedRoles.join(", ")}.',
      );
    }
    final ref = _users.doc(uid);
    final existing = await ref.get();
    final alreadyAppRegistered =
        existing.exists && existing.data()?['expansion_app_registered'] == true;

    final profileLinks = <String, dynamic>{
      'linkedin': linkedin.trim(),
      'portfolio': portfolio.trim(),
      'instagram': instagram.trim(),
      'facebook': facebook.trim(),
      'tiktok': tiktok.trim(),
    };

    final workStructure = <String, dynamic>{
      'flexibility': workFlexibility.clamp(1, 10),
      'weekly_hours': weeklyHours.clamp(20, 80),
      'ownership': workOwnership.clamp(1, 10),
    };

    final payload = <String, dynamic>{
      'uid': uid,
      'email': email,
      'email_verified': user.emailVerified,
      'first_name': firstName.trim(),
      'last_name': lastName.trim(),
      'city': city.trim(),
      'state': state.trim(),
      'bio': bio.trim(),
      'profession': profession.trim(),
      'not_in_cohort': notInCohort,
      'business_goals': businessGoals,
      'confident_skills': confidentSkills,
      'desired_skills': desiredSkills,
      'tribe': tribe,
      'industry': tribe,
      'work_structure': workStructure,
      'profile_links': profileLinks,
      'onboarding_status': 'complete',
      'profile_completed': true,
      'expansionOnboardingComplete': true,
      'expansionOnboardingCompletedAt': FieldValue.serverTimestamp(),
      'profileCreated': true,
      'onboardingComplete': true,
      'updated_at': FieldValue.serverTimestamp(),
      'expansion_app_registered': true,
      if (!alreadyAppRegistered)
        'expansion_app_registered_at': FieldValue.serverTimestamp(),
      if (photoUrl != null && photoUrl.trim().isNotEmpty) 'photo_url': photoUrl.trim(),
      if (businessLogoUrl != null && businessLogoUrl.trim().isNotEmpty)
        'business_logo_url': businessLogoUrl.trim(),
    };

    if (!notInCohort) {
      payload['cohort_id'] = (cohortId ?? '').trim();
    }

    final gcp = graduatedCityProgram?.trim();
    if (gcp != null && gcp.isNotEmpty) {
      payload['graduated_city_program'] = gcp;
    }

    if (!existing.exists) {
      await ref.set({
        ...payload,
        'display_name': null,
        if (photoUrl == null || photoUrl.trim().isEmpty) 'photo_url': null,
        'badges': <String, dynamic>{
          'earned': <String>[],
          'visible': <String>[],
        },
        'membership': <String, dynamic>{
          'status': 'active',
          'paid_modules': <String>[],
        },
        'points': <String, dynamic>{
          'balance': 0,
          'history_summary': <dynamic>[],
        },
        'permissions': <String, dynamic>{
          'hidden_videos': <String>[],
        },
        'roles': sanitizedRoles,
        'created_at': FieldValue.serverTimestamp(),
      });
    } else {
      final updatePayload = Map<String, dynamic>.from(payload);
      if (notInCohort) {
        updatePayload['cohort_id'] = FieldValue.delete();
      }
      if (alreadyAppRegistered) {
        updatePayload.remove('expansion_app_registered_at');
      }
      await ref.update(updatePayload);
    }
  }

  /// Updates curriculum profile fields from Edit Profile (document must exist).
  /// Does not set `roles`, `created_at`, or `expansionOnboardingCompletedAt`.
  Future<void> updateProfile({
    required String firstName,
    required String lastName,
    required bool notInCohort,
    String? cohortId,
    required String bio,
    required String profession,
    required String city,
    required String state,
    required List<String> businessGoals,
    required List<String> confidentSkills,
    required List<String> desiredSkills,
    required String tribe,
    required int workFlexibility,
    required int weeklyHours,
    required int workOwnership,
    required String linkedin,
    required String portfolio,
    required String instagram,
    required String facebook,
    required String tiktok,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw StateError('Not signed in');
    final ref = _users.doc(user.uid);
    final existing = await ref.get();
    if (!existing.exists) {
      throw StateError('No profile document. Complete onboarding first.');
    }

    final profileLinks = <String, dynamic>{
      'linkedin': linkedin.trim(),
      'portfolio': portfolio.trim(),
      'instagram': instagram.trim(),
      'facebook': facebook.trim(),
      'tiktok': tiktok.trim(),
    };

    final workStructure = <String, dynamic>{
      'flexibility': workFlexibility.clamp(1, 10),
      'weekly_hours': weeklyHours.clamp(20, 80),
      'ownership': workOwnership.clamp(1, 10),
    };

    final payload = <String, dynamic>{
      'uid': user.uid,
      'email': user.email ?? '',
      'email_verified': user.emailVerified,
      'first_name': firstName.trim(),
      'last_name': lastName.trim(),
      'city': city.trim(),
      'state': state.trim(),
      'bio': bio.trim(),
      'profession': profession.trim(),
      'not_in_cohort': notInCohort,
      'business_goals': businessGoals,
      'confident_skills': confidentSkills,
      'desired_skills': desiredSkills,
      'tribe': tribe,
      'industry': tribe,
      'work_structure': workStructure,
      'profile_links': profileLinks,
      'onboarding_status': 'complete',
      'profile_completed': true,
      'updated_at': FieldValue.serverTimestamp(),
    };

    if (!notInCohort) {
      payload['cohort_id'] = (cohortId ?? '').trim();
    }

    final updatePayload = Map<String, dynamic>.from(payload);
    if (notInCohort) {
      updatePayload['cohort_id'] = FieldValue.delete();
    }
    await ref.update(updatePayload);
  }

  /// Network Search: match [first_name] / [last_name] using Firestore prefix ranges on
  /// `first_name` and `last_name`, then client-side token match (case-insensitive).
  /// Requires at least **2** characters in [query]. Excludes [excludeUid] (e.g. self).
  Future<List<NetworkMemberHit>> searchMembersByName(
    String query, {
    String? excludeUid,
    int maxResults = 40,
  }) async {
    final raw = query.trim();
    if (raw.length < 2) return [];

    final tokens = raw
        .toLowerCase()
        .split(RegExp(r'\s+'))
        .where((t) => t.isNotEmpty)
        .toList();
    if (tokens.isEmpty) return [];

    final candidates = <String, Map<String, dynamic>>{};

    Future<void> mergeRange(String field, String prefix) async {
      if (prefix.length < 2) return;
      final end = '$prefix\uf8ff';
      try {
        final snap = await _users
            .orderBy(field)
            .startAt([prefix])
            .endAt([end])
            .limit(50)
            .get();
        for (final d in snap.docs) {
          candidates[d.id] = d.data();
        }
      } catch (_) {
        // Missing field / index — skip this range
      }
    }

    String titlePrefix(String t) {
      if (t.isEmpty) return t;
      return '${t[0].toUpperCase()}${t.length > 1 ? t.substring(1).toLowerCase() : ''}';
    }

    for (final t in tokens.take(2)) {
      await mergeRange('first_name', t);
      await mergeRange('first_name', titlePrefix(t));
      await mergeRange('last_name', t);
      await mergeRange('last_name', titlePrefix(t));
    }

    bool matchesName(Map<String, dynamic> d) {
      final fn = (profileString(d['first_name']) ?? profileString(d['firstName']) ?? '').toLowerCase();
      final ln = (profileString(d['last_name']) ?? profileString(d['lastName']) ?? '').toLowerCase();
      final full = '$fn $ln'.replaceAll(RegExp(r'\s+'), ' ').trim();
      for (final t in tokens) {
        if (!fn.contains(t) && !ln.contains(t) && !full.contains(t)) {
          return false;
        }
      }
      return true;
    }

    final hits = <NetworkMemberHit>[];
    for (final e in candidates.entries) {
      if (excludeUid != null && e.key == excludeUid) continue;
      if (!matchesName(e.value)) continue;
      final d = e.value;
      final city = profileString(d['city']);
      final state = profileString(d['state']);
      String? loc;
      if (city != null && state != null) {
        loc = '$city, $state';
      } else {
        loc = city ?? state;
      }
      hits.add(
        NetworkMemberHit(
          uid: e.key,
          displayName: profileDisplayName(d),
          profession: profileString(d['profession']),
          locationLine: loc,
        ),
      );
    }

    hits.sort((a, b) => a.displayName.toLowerCase().compareTo(b.displayName.toLowerCase()));
    if (hits.length > maxResults) {
      return hits.sublist(0, maxResults);
    }
    return hits;
  }
}
