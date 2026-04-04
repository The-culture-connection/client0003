import 'package:firebase_auth/firebase_auth.dart';

/// Matches [firestore.rules] `hasStaffClaim()` — token `roles` claim.
Future<bool> currentUserHasStaffClaim() async {
  final u = FirebaseAuth.instance.currentUser;
  if (u == null) return false;
  final t = await u.getIdTokenResult(true);
  final roles = t.claims?['roles'];
  if (roles is List) {
    return roles.contains('Admin') || roles.contains('superAdmin');
  }
  return false;
}

Future<bool> canManageMobileGroup({required String? uid, String? createdBy}) async {
  if (uid == null) return false;
  if (createdBy != null && createdBy == uid) return true;
  return currentUserHasStaffClaim();
}
