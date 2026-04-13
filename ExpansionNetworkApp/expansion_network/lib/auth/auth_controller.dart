import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart'
    show ChangeNotifier, TargetPlatform, debugPrint, defaultTargetPlatform;

import '../constants/alumni_network_constants.dart';
import '../expansion_release_trace.dart';
import '../services/expansion_session_service.dart';
import '../services/user_profile_repository.dart';

/// Lets native Firebase Auth finish **Keychain** persistence before we call
/// [initializeUserSession] (which forces another token / Keychain path). On iOS,
/// overlapping Swift concurrency work there has produced `swift_task_dealloc`
/// crashes (FirebaseAuth `AuthKeychainStorageReal.update`); see [ApplicationNotes].
const Duration _kIosAuthKeychainSettleBeforeSession = Duration(milliseconds: 600);

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
        _auth = auth ?? FirebaseAuth.instance;

  /// Subscribes to [FirebaseAuth.authStateChanges]. Call once after the first frame
  /// ([ExpansionNetworkApp] does this) so Profile/Release cold start does not race native
  /// Keychain persistence with the first token/session work.
  void attachAuthListener() {
    if (_sub != null) return;
    _sub = _auth.authStateChanges().listen(_onAuthChanged);
  }

  final UserProfileRepository _profileRepository;
  final ExpansionSessionService _sessionService;
  final FirebaseAuth _auth;
  StreamSubscription<User?>? _sub;

  /// Cleared on sign-out. Used to run the iOS keychain settle delay only once per uid.
  String? _iosSessionSettleUid;

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
      _iosSessionSettleUid = null;
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
      if (defaultTargetPlatform == TargetPlatform.iOS &&
          _iosSessionSettleUid != user.uid) {
        _iosSessionSettleUid = user.uid;
        expansionReleaseTrace(
          'session: iOS ${_kIosAuthKeychainSettleBeforeSession.inMilliseconds}ms settle before initializeUserSession uid=${user.uid}',
        );
        await Future<void>.delayed(_kIosAuthKeychainSettleBeforeSession);
      }
      expansionReleaseTrace('session: calling initializeUserSession uid=${user.uid}');
      final data = await _sessionService.initializeUserSession();
      final state = data['state'] as String?;
      final reason = data['reason'] as String?;
      expansionReleaseTrace(
        'session: initializeUserSession returned state=$state reason=$reason',
      );

      if (state == 'UNAUTHORIZED') {
        _accessDeniedMessage = reason == 'no_network_access'
            ? kSessionNoNetworkAccessMessage
            : reason == 'account_banned'
                ? kSessionAccountBannedMessage
                : reason == 'account_disabled'
                    ? kSessionAccountDisabledMessage
                    : kSessionNotAuthorizedMessage;
        expansionReleaseTrace('session: UNAUTHORIZED → revokeAfterDenial');
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
        expansionReleaseTrace(
          'session: profile gate needsExpansionOnboarding check uid=${user.uid}',
        );
        final stillNeeds = await _profileRepository.needsExpansionOnboarding(
          user.uid,
        );
        if (stillNeeds) {
          _needsExpansionOnboarding = true;
        }
      }
    } catch (e, st) {
      debugPrint('AuthController: initializeUserSession failed: $e\n$st');
      expansionReleaseTrace('session: initializeUserSession error → revokeAfterDenial');
      _accessDeniedMessage = firebaseNativeBridgeLostUserMessage(e) ??
          'Could not verify alumni network access. Check your connection, or '
          'ensure Cloud Functions are deployed (initializeUserSession).';
      await _revokeAfterDenial(user);
    }
  }

  Future<void> _revokeAfterDenial(User user) async {
    _expansionOnboardingRoles = null;
    _provisionedCohortId = null;
    _needsExpansionOnboarding = null;
    try {
      expansionReleaseTrace('revoke: getUserDoc uid=${user.uid}');
      final existingProfile = await _profileRepository.getUserDoc(user.uid);
      if (existingProfile == null) {
        // On iOS, Auth user.delete() has triggered native SIGABRT in some Firebase/Xcode
        // combinations right after sign-in. Sign out only; orphan Auth users can be
        // cleaned in Console or via a callable if needed.
        if (defaultTargetPlatform == TargetPlatform.iOS) {
          expansionReleaseTrace('revoke: iOS signOut (no profile)');
          await _auth.signOut();
        } else {
          try {
            await user.delete();
          } catch (_) {
            await _auth.signOut();
          }
        }
      } else {
        expansionReleaseTrace('revoke: signOut (has profile)');
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
