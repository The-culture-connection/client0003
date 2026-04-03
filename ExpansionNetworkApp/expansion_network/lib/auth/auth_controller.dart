import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../constants/alumni_network_constants.dart';
import '../services/alumni_access_repository.dart';
import '../services/user_profile_repository.dart';

/// Listens to Firebase Auth, enforces in-person cohort access, and loads Expansion onboarding state.
///
/// **Account routes:** (1) User already has a Firebase session (e.g. signed in on device) — no password
/// step in this app; [AuthController] runs and sends them to onboarding when needed. (2) User is
/// signed out — they use Create account / Sign in, then the same gate and onboarding apply.
class AuthController extends ChangeNotifier {
  AuthController({
    UserProfileRepository? profileRepository,
    AlumniAccessRepository? alumniAccessRepository,
    FirebaseAuth? auth,
  })  : _profileRepository = profileRepository ?? UserProfileRepository(),
        _alumniAccessRepository = alumniAccessRepository ?? AlumniAccessRepository(),
        _auth = auth ?? FirebaseAuth.instance {
    _sub = _auth.authStateChanges().listen(_onAuthChanged);
  }

  final UserProfileRepository _profileRepository;
  final AlumniAccessRepository _alumniAccessRepository;
  final FirebaseAuth _auth;
  StreamSubscription<User?>? _sub;

  User? _user;
  bool _loading = true;
  bool? _needsExpansionOnboarding;
  String? _accessDeniedMessage;

  /// Roles to write when creating `users/{uid}` in onboarding.
  List<String>? _expansionOnboardingRoles;

  /// From `expansion_cohort_emails` when the user joined via in-person cohort CSV.
  String? _provisionedCohortId;

  User? get user => _user;
  bool get loading => _loading;
  bool? get needsExpansionOnboarding => _needsExpansionOnboarding;

  /// Non-empty after access check passed; use when saving onboarding.
  List<String> get expansionOnboardingRoles =>
      List<String>.unmodifiable(_expansionOnboardingRoles ?? const <String>[]);

  /// Cohort ID (admin cohort title) prefilled for onboarding; null for admin bypass.
  String? get provisionedCohortId => _provisionedCohortId;

  /// One-shot message for UI after sign-in/sign-up was rejected.
  String? takeAccessDeniedMessage() {
    final m = _accessDeniedMessage;
    _accessDeniedMessage = null;
    return m;
  }

  Future<void> _onAuthChanged(User? user) async {
    _user = user;
    if (user == null) {
      _needsExpansionOnboarding = null;
      _expansionOnboardingRoles = null;
      _provisionedCohortId = null;
      _loading = false;
      notifyListeners();
      return;
    }

    _loading = true;
    _expansionOnboardingRoles = null;
    _provisionedCohortId = null;
    notifyListeners();

    AlumniAccessResult access;
    try {
      access = await _alumniAccessRepository.evaluate(
        uid: user.uid,
        email: user.email,
      );
    } catch (e, st) {
      debugPrint('AuthController: alumni access check failed: $e\n$st');
      _accessDeniedMessage =
          'Could not verify alumni access. Check your connection and try again.';
      try {
        await _auth.signOut();
      } catch (_) {}
      _user = null;
      _needsExpansionOnboarding = null;
      _expansionOnboardingRoles = null;
      _provisionedCohortId = null;
      _loading = false;
      notifyListeners();
      return;
    }

    if (!access.granted) {
      _accessDeniedMessage = kAlumniNetworkAccessDeniedMessage;
      _expansionOnboardingRoles = null;
      _provisionedCohortId = null;
      final existingProfile = await _profileRepository.getUserDoc(user.uid);
      try {
        if (existingProfile == null) {
          try {
            await user.delete();
          } catch (_) {
            await _auth.signOut();
          }
        } else {
          await _auth.signOut();
        }
      } catch (e, st) {
        debugPrint('AuthController: could not revoke session after access denial: $e\n$st');
        await _auth.signOut();
      }
      _user = null;
      _needsExpansionOnboarding = null;
      _loading = false;
      notifyListeners();
      return;
    }

    _expansionOnboardingRoles = List<String>.from(access.rolesForUserProfile);
    _provisionedCohortId = access.provisionedCohortId;

    try {
      _needsExpansionOnboarding =
          await _profileRepository.needsExpansionOnboarding(user.uid);
    } catch (e, st) {
      debugPrint('AuthController: profile load failed: $e\n$st');
      _needsExpansionOnboarding = true;
    }

    _loading = false;
    notifyListeners();
  }

  /// Call after saving onboarding so router redirects without waiting on auth stream.
  void markExpansionOnboardingComplete() {
    _needsExpansionOnboarding = false;
    notifyListeners();
  }

  Future<void> reloadProfileGate() async {
    final u = _user;
    if (u == null) return;
    _loading = true;
    notifyListeners();
    try {
      _needsExpansionOnboarding =
          await _profileRepository.needsExpansionOnboarding(u.uid);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}
