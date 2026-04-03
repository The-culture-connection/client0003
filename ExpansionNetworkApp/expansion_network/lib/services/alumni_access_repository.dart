import 'package:cloud_firestore/cloud_firestore.dart';

import '../constants/alumni_network_constants.dart';

/// Outcome of checking whether the user may use Expansion Network.
class AlumniAccessResult {
  const AlumniAccessResult._({
    required this.granted,
    required this.rolesForUserProfile,
    this.provisionedCohortId,
  });

  const AlumniAccessResult.granted(
    List<String> roles, {
    String? provisionedCohortId,
  }) : this._(
          granted: true,
          rolesForUserProfile: roles,
          provisionedCohortId: provisionedCohortId,
        );

  const AlumniAccessResult.denied()
      : this._(
          granted: false,
          rolesForUserProfile: const [],
          provisionedCohortId: null,
        );

  final bool granted;

  /// Roles to store on `users/{uid}` when creating the profile in onboarding.
  final List<String> rolesForUserProfile;

  /// From `expansion_cohort_emails/{email}` → `cohort_id` (in-person cohort title).
  final String? provisionedCohortId;
}

/// Gate: in-person cohort upload (`expansion_cohort_emails`) or admin (`Admin` / `superAdmin` on `users/{uid}`).
class AlumniAccessRepository {
  AlumniAccessRepository({FirebaseFirestore? firestore})
      : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  static List<String> filterAllowedRoles(Iterable<dynamic>? raw) {
    if (raw == null) return [];
    return raw
        .map((e) => e?.toString().trim() ?? '')
        .where((r) => r.isNotEmpty && kExpansionNetworkAllowedRoles.contains(r))
        .toList();
  }

  static List<String> _rolesFromUserData(Map<String, dynamic>? data) {
    if (data == null) return [];
    return List<String>.from(
      (data['roles'] as List<dynamic>?)
              ?.map((e) => e?.toString().trim() ?? '')
              .where((r) => r.isNotEmpty) ??
          const [],
    );
  }

  /// [email] should match Firebase Auth (e.g. [User.email]).
  Future<AlumniAccessResult> evaluate({
    required String uid,
    required String? email,
  }) async {
    final userSnap = await _db.collection('users').doc(uid).get();
    final userData = userSnap.data();
    final userRoles = _rolesFromUserData(userData);

    final hasAdminBypass = userRoles.contains('Admin') ||
        userRoles.contains('superAdmin');
    if (hasAdminBypass) {
      final allowed = filterAllowedRoles(userRoles);
      if (allowed.isNotEmpty) {
        return AlumniAccessResult.granted(allowed);
      }
    }

    final trimmed = email?.trim();
    if (trimmed == null || trimmed.isEmpty) {
      return const AlumniAccessResult.denied();
    }

    final emailLower = trimmed.toLowerCase();
    final cohortSnap = await _db
        .collection(kExpansionCohortEmailsCollection)
        .doc(emailLower)
        .get();

    if (!cohortSnap.exists) {
      return const AlumniAccessResult.denied();
    }

    final cohortId = (cohortSnap.data()?['cohort_id'] as String?)?.trim();
    if (cohortId == null || cohortId.isEmpty) {
      return const AlumniAccessResult.denied();
    }

    return AlumniAccessResult.granted(
      const ['Alumni'],
      provisionedCohortId: cohortId,
    );
  }

  /// Reserves [emailLower] for [uid] on `expansion_cohort_emails/{email}`.
  ///
  /// Returns `false` if another uid already claimed this email (duplicate mobile profile).
  /// Admins can clear [kCohortEmailFieldLinkedFirebaseUid] in Firestore if a user must re-link after Auth reset.
  Future<bool> claimExpansionCohortEmailForUid({
    required String emailLower,
    required String uid,
  }) async {
    final ref =
        _db.collection(kExpansionCohortEmailsCollection).doc(emailLower);
    try {
      return await _db.runTransaction<bool>((transaction) async {
        final snap = await transaction.get(ref);
        if (!snap.exists) return false;
        final linked =
            snap.data()?[kCohortEmailFieldLinkedFirebaseUid] as String?;
        if (linked != null && linked.isNotEmpty && linked != uid) {
          return false;
        }
        transaction.set(
          ref,
          {
            kCohortEmailFieldLinkedFirebaseUid: uid,
            'expansion_linked_at': FieldValue.serverTimestamp(),
          },
          SetOptions(merge: true),
        );
        return true;
      });
    } catch (_) {
      return false;
    }
  }
}
