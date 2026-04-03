import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../profile/profile_utils.dart';

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

  /// Live updates for profile UIs (e.g. Profile tab).
  Stream<DocumentSnapshot<Map<String, dynamic>>> watchUserDoc(String uid) =>
      _users.doc(uid).snapshots();

  /// `false` if Expansion onboarding or curriculum onboarding is already complete.
  Future<bool> needsExpansionOnboarding(String uid) async {
    final data = await getUserDoc(uid);
    if (data == null) return true;
    if (data['expansionOnboardingComplete'] == true) return false;
    if (data['onboarding_status'] == 'complete') return false;
    return true;
  }

  /// Full save after onboarding — matches curriculum `users/{uid}` schema.
  ///
  /// **New document:** sets `roles: ['Alumni']`, default `badges`, `membership`, `points`, `permissions`.
  /// **Existing document:** updates without `roles` or `created_at`.
  Future<void> saveExpansionProfile({
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
    required String industry,
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
    final uid = user.uid;
    final email = user.email ?? '';
    final ref = _users.doc(uid);
    final existing = await ref.get();

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
      'industry': industry,
      'work_structure': workStructure,
      'profile_links': profileLinks,
      'onboarding_status': 'complete',
      'profile_completed': true,
      'expansionOnboardingComplete': true,
      'expansionOnboardingCompletedAt': FieldValue.serverTimestamp(),
      'updated_at': FieldValue.serverTimestamp(),
    };

    if (!notInCohort) {
      payload['cohort_id'] = (cohortId ?? '').trim();
    }

    if (!existing.exists) {
      await ref.set({
        ...payload,
        'display_name': null,
        'photo_url': null,
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
        'roles': <String>['Alumni'],
        'created_at': FieldValue.serverTimestamp(),
      });
    } else {
      final updatePayload = Map<String, dynamic>.from(payload);
      if (notInCohort) {
        updatePayload['cohort_id'] = FieldValue.delete();
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
    required String industry,
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
      'industry': industry,
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
}
