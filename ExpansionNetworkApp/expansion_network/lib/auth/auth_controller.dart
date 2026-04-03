import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../services/user_profile_repository.dart';

/// Listens to Firebase Auth and loads whether Expansion onboarding is done.
class AuthController extends ChangeNotifier {
  AuthController({UserProfileRepository? profileRepository})
      : _profileRepository = profileRepository ?? UserProfileRepository() {
    _sub = FirebaseAuth.instance.authStateChanges().listen(_onAuthChanged);
  }

  final UserProfileRepository _profileRepository;
  StreamSubscription<User?>? _sub;

  User? _user;
  bool _loading = true;
  bool? _needsExpansionOnboarding;

  User? get user => _user;
  bool get loading => _loading;
  bool? get needsExpansionOnboarding => _needsExpansionOnboarding;

  Future<void> _onAuthChanged(User? user) async {
    _user = user;
    if (user == null) {
      _needsExpansionOnboarding = null;
      _loading = false;
      notifyListeners();
      return;
    }
    _loading = true;
    notifyListeners();
    try {
      _needsExpansionOnboarding = await _profileRepository.needsExpansionOnboarding(user.uid);
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
      _needsExpansionOnboarding = await _profileRepository.needsExpansionOnboarding(u.uid);
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
