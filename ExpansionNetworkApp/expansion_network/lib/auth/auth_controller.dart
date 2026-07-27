import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart'
    show ChangeNotifier, TargetPlatform, debugPrint, defaultTargetPlatform;

import '../analytics/expansion_analytics.dart';
import '../constants/alumni_network_constants.dart';
import '../expansion_release_trace.dart';
import '../services/expansion_session_service.dart';
import '../services/push_notifications_service.dart';
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
    PushNotificationsService? pushNotificationsService,
    FirebaseAuth? auth,
  })  : _profileRepository = profileRepository ?? UserProfileRepository(),
        _sessionService = sessionService ?? ExpansionSessionService(),
        _pushNotificationsService =
            pushNotificationsService ?? PushNotificationsService(),
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
  final PushNotificationsService _pushNotificationsService;
  final FirebaseAuth _auth;
  StreamSubscription<User?>? _sub;

  /// Cleared on sign-out. Used to run the iOS keychain settle delay only once per uid.
  String? _iosSessionSettleUid;

  User? _user;
  bool _loading = true;
  bool? _needsExpansionOnboarding;
  bool _hasExpansionAccess = false;
  String? _accessDeniedMessage;

  List<String>? _expansionOnboardingRoles;
  String? _provisionedCohortId;

  User? get user => _user;
  bool get loading => _loading;
  bool? get needsExpansionOnboarding => _needsExpansionOnboarding;

  /// True only once `initializeUserSession` returns `READY_FOR_HOME` /
  /// `REQUIRES_ONBOARDING` (an Expansion-eligible account). False — but still
  /// signed in, not revoked — for `NO_EXPANSION_ACCESS` (any other account:
  /// open sign-up, or Conference-only). [needsExpansionOnboarding] is only
  /// meaningful when this is true.
  bool get hasExpansionAccess => _hasExpansionAccess;

  List<String> get expansionOnboardingRoles =>
      List<String>.unmodifiable(_expansionOnboardingRoles ?? const <String>[]);

  String? get provisionedCohortId => _provisionedCohortId;

  String? takeAccessDeniedMessage() {
    final m = _accessDeniedMessage;
    _accessDeniedMessage = null;
    return m;
  }

  /// Set when the user has just *actively* signed in or claimed an invite, so
  /// `/session` sends them through the Mortarverse welcome animation once.
  ///
  /// Deliberately not derived from [FirebaseAuth.authStateChanges]: that stream
  /// also fires when a persisted session is restored on a cold start, which is
  /// exactly the case the intro should skip. Only the auth screens set it.
  /// (Finishing onboarding does not need it — the last step routes to
  /// `/welcome-intro` directly.)
  bool _welcomeIntroPending = false;

  bool get welcomeIntroPending => _welcomeIntroPending;

  void markWelcomeIntroPending() {
    _welcomeIntroPending = true;
  }

  /// Reads and clears the flag. Called by the intro screen once it is on
  /// screen, so a redirect that runs twice cannot swallow it early.
  bool consumeWelcomeIntroPending() {
    final v = _welcomeIntroPending;
    _welcomeIntroPending = false;
    return v;
  }

  Future<void> _onAuthChanged(User? user) async {
    _user = user;
    if (user == null) {
      _iosSessionSettleUid = null;
      _welcomeIntroPending = false;
      _needsExpansionOnboarding = null;
      _hasExpansionAccess = false;
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
    await _pushNotificationsService.syncTokenForCurrentUser();
    _loading = false;
    notifyListeners();
  }

  Future<void> _applySessionForUser(User user) async {
    await ExpansionAnalytics.log(
      'session_initialize_backend_started',
      entityId: user.uid,
      sourceScreen: 'session',
    );
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
        await ExpansionAnalytics.log(
          'session_initialize_backend_unauthorized',
          entityId: user.uid,
          sourceScreen: 'session',
          extra: <String, Object?>{'reason': reason ?? ''},
        );
        await _revokeAfterDenial(user);
        return;
      }

      if (state == 'NO_EXPANSION_ACCESS') {
        // Signed in fine — this account just isn't Expansion-eligible (yet).
        // Unlike UNAUTHORIZED, do NOT sign out: the Mortarverse chooser and
        // Conference app remain open; only entering the Expansion Network
        // itself is gated (via the "Enter invite code" screen). Onboarding
        // (the shared profile questionnaire) still applies universally —
        // it is not an Expansion-only gate.
        expansionReleaseTrace('session: NO_EXPANSION_ACCESS reason=$reason');
        _hasExpansionAccess = false;
        _expansionOnboardingRoles = null;
        _provisionedCohortId = null;
        _needsExpansionOnboarding = await _profileRepository.needsExpansionOnboarding(user.uid);
        await ExpansionAnalytics.log(
          'session_initialize_backend_no_expansion_access',
          entityId: user.uid,
          sourceScreen: 'session',
          extra: <String, Object?>{'reason': reason ?? ''},
        );
        return;
      }

      _hasExpansionAccess = true;
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

      await ExpansionAnalytics.log(
        'session_initialize_backend_succeeded',
        entityId: user.uid,
        sourceScreen: 'session',
      );
    } catch (e, st) {
      debugPrint('AuthController: initializeUserSession failed: $e\n$st');
      expansionReleaseTrace('session: initializeUserSession error → revokeAfterDenial');
      await ExpansionAnalytics.log(
        'session_initialize_backend_failed',
        entityId: user.uid,
        sourceScreen: 'session',
        extra: ExpansionAnalytics.errorExtras(e, code: 'initializeUserSession'),
      );
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
