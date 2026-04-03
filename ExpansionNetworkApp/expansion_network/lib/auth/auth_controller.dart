import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../constants/alumni_network_constants.dart';
import '../services/expansion_session_service.dart';
import '../services/user_profile_repository.dart';

/// Firebase Auth + Cloud Function [initializeUserSession] drive routing.
///
/// Routes: existing session → session init; new users → invite claim (callable) then custom token sign-in.
class AuthController extends ChangeNotifier {
  AuthController({
    UserProfileRepository? profileRepository,
    ExpansionSessionService? sessionService,
    FirebaseAuth? auth,
  })  : _profileRepository = profileRepository ?? UserProfileRepository(),
        _sessionService = sessionService ?? ExpansionSessionService(),
        _auth = auth ?? FirebaseAuth.instance {
    _sub = _auth.authStateChanges().listen(_onAuthChanged);
  }

  final UserProfileRepository _profileRepository;
  final ExpansionSessionService _sessionService;
  final FirebaseAuth _auth;
  StreamSubscription<User?>? _sub;

  User? _user;
  bool _loading = true;
  bool? _needsExpansionOnboarding;
  String? _accessDeniedMessage;

  List<String>? _expansionOnboardingRoles;
  String? _provisionedCohortId;

  User? get user => _user;
  bool get loading => _loading;
  bool? get needsExpansionOnboarding => _needsExpansionOnboarding;

  List<String> get expansionOnboardingRoles =>
      List<String>.unmodifiable(_expansionOnboardingRoles ?? const <String>[]);

  String? get provisionedCohortId => _provisionedCohortId;

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

    await _applySessionForUser(user);
    _loading = false;
    notifyListeners();
  }

  Future<void> _applySessionForUser(User user) async {
    try {
      final data = await _sessionService.initializeUserSession();
      final state = data['state'] as String?;
      final reason = data['reason'] as String?;

      if (state == 'UNAUTHORIZED') {
        _accessDeniedMessage = reason == 'no_network_access'
            ? kSessionNoNetworkAccessMessage
            : kSessionNotAuthorizedMessage;
        await _revokeAfterDenial(user);
        return;
      }

      final role = data['role'] as String?;
      if (role != null && kExpansionNetworkAllowedRoles.contains(role)) {
        _expansionOnboardingRoles = [role];
      } else if (role != null) {
        _expansionOnboardingRoles = [role];
      }

      final cohort = data['cohortId'];
      _provisionedCohortId =
          cohort is String && cohort.isNotEmpty ? cohort : null;

      if (state == 'READY_FOR_HOME') {
        _needsExpansionOnboarding = false;
      } else if (state == 'REQUIRES_ONBOARDING') {
        _needsExpansionOnboarding = true;
      } else {
        _needsExpansionOnboarding = true;
      }

      if (_needsExpansionOnboarding == false) {
        final stillNeeds = await _profileRepository.needsExpansionOnboarding(
          user.uid,
        );
        if (stillNeeds) {
          _needsExpansionOnboarding = true;
        }
      }
    } catch (e, st) {
      debugPrint('AuthController: initializeUserSession failed: $e\n$st');
      _accessDeniedMessage =
          'Could not verify alumni network access. Check your connection, or ensure Cloud Functions are deployed (initializeUserSession).';
      await _revokeAfterDenial(user);
    }
  }

  Future<void> _revokeAfterDenial(User user) async {
    _expansionOnboardingRoles = null;
    _provisionedCohortId = null;
    _needsExpansionOnboarding = null;
    try {
      final existingProfile = await _profileRepository.getUserDoc(user.uid);
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
      debugPrint('AuthController: revoke after denial: $e\n$st');
      await _auth.signOut();
    }
    _user = null;
  }

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
      await _applySessionForUser(u);
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
