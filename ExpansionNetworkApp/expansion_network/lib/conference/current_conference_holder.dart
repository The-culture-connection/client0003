import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';

import 'models/conference.dart';
import 'services/conference_repository.dart';

/// Ambient "which conference is currently open" holder, and the single source
/// of truth for whether the user is allowed to be inside it.
///
/// `StatefulShellRoute` requires every branch's default location to be a
/// parameter-free route (go_router assertion in `RouteConfiguration`), so
/// `conferenceId` can't live in the `/conference/lobby` etc. paths themselves.
/// This holds it instead: set when entering the Conference app (from the
/// Mortarverse chooser, or resolved from the active conference on a cold deep
/// link) and read by [ConferenceShell] / the session detail screen.
///
/// Entry is deliberately split in two. [target] only says *which* conference
/// the gate is gating — it grants nothing. [enter] is the only way to become
/// "inside", and it demands a loaded [Conference] that passes
/// [Conference.isOpenForEntry]. The router reads [isOpenForEntry] on every
/// navigation, so a conference that fails the check can never be routed into.
///
/// Once inside, the conference doc is watched. If an admin closes it, or its
/// `activeUntil` passes while the user sits in the lobby, [isOpenForEntry]
/// flips to false and [notifyListeners] fires — the router is wired to this,
/// so the user is ejected to the gate rather than left in a dead conference.
class CurrentConferenceHolder extends ChangeNotifier {
  CurrentConferenceHolder._();

  static final CurrentConferenceHolder instance = CurrentConferenceHolder._();

  final ConferenceRepository _repo = ConferenceRepository();
  StreamSubscription<Conference?>? _sub;
  Timer? _expiryTimer;

  String? _conferenceId;
  Conference? _conference;
  bool _admitted = false;

  /// The conference the app is pointed at — set by [target] or [enter]. Being
  /// non-null does **not** mean the user may enter; check [isOpenForEntry].
  String? get conferenceId => _conferenceId;

  /// The live conference doc, once one has been loaded.
  Conference? get conference => _conference;

  /// Whether the user may currently be inside the conference.
  ///
  /// Fails closed: this is false until a conference doc has actually been read
  /// and shown to be open. An unknown conference is a closed one, so a cold
  /// deep link into `/conference/lobby` lands on the gate to resolve properly
  /// rather than slipping through on a null check.
  bool get isOpenForEntry =>
      _admitted && (_conference?.isOpenForEntry ?? false);

  /// Message explaining a refusal, for the gate to show.
  String? get entryBlockedReason {
    final c = _conference;
    if (c == null || c.isOpenForEntry) return null;
    return c.entryBlockedReason;
  }

  /// Point the app at [conferenceId] without granting entry.
  ///
  /// Used by the Mortarverse tile and the gate: it tells the gate which
  /// conference to gate, nothing more.
  void target(String? conferenceId) {
    if (_conferenceId == conferenceId && !_admitted) return;
    _cancelWatch();
    _conferenceId = conferenceId;
    _conference = null;
    _admitted = false;
    _notify();
  }

  /// Admit the user to [conference] — the only way to become "inside".
  ///
  /// Returns false and admits nothing when the conference isn't open, so a
  /// caller that forgets to check still can't let anyone in.
  bool enter(Conference conference) {
    if (!conference.isOpenForEntry) {
      // Keep the id so the gate can explain itself, but revoke admission.
      _cancelWatch();
      _conferenceId = conference.id;
      _conference = conference;
      _admitted = false;
      _notify();
      return false;
    }
    _conferenceId = conference.id;
    _conference = conference;
    _admitted = true;
    _watch(conference.id);
    _armExpiry();
    _notify();
    return true;
  }

  /// Leave the conference entirely (used when switching, or signing out).
  void clear() {
    _cancelWatch();
    _conferenceId = null;
    _conference = null;
    _admitted = false;
    _notify();
  }

  /// Track the doc so a conference closing mid-session ejects the user.
  void _watch(String conferenceId) {
    _cancelWatch();
    _sub = _repo.watchConference(conferenceId).listen((conf) {
      if (conf == null) {
        // Deleted out from under us — treat as closed.
        _conference = null;
        _admitted = false;
        _notify();
        return;
      }
      final wasOpen = isOpenForEntry;
      _conference = conf;
      if (!conf.isOpenForEntry) _admitted = false;
      _armExpiry();
      if (wasOpen != isOpenForEntry) _notify();
    });
  }

  /// A conference can lapse purely by the clock: `activeUntil` passing writes
  /// nothing to Firestore, so [_watch] would never hear about it. Arm a timer
  /// on the nearest deadline so someone sitting in the lobby is ejected the
  /// moment it lands.
  ///
  /// This is belt-and-braces rather than the primary defence —
  /// [Conference.isOpenForEntry] recomputes against the wall clock on every
  /// read, so any navigation re-evaluates correctly even if this never fires.
  void _armExpiry() {
    _expiryTimer?.cancel();
    _expiryTimer = null;
    final c = _conference;
    if (c == null || !_admitted) return;

    final deadlines = <DateTime>[
      if (c.activeUntil != null) c.activeUntil!,
      if (c.expiresAt != null) c.expiresAt!,
    ]..sort();
    if (deadlines.isEmpty) return;

    final delay = deadlines.first.difference(DateTime.now());
    if (delay.isNegative) return;
    // A second past the boundary, so the re-check reads as expired.
    _expiryTimer = Timer(delay + const Duration(seconds: 1), () {
      _admitted = false;
      _notify();
    });
  }

  void _cancelWatch() {
    _sub?.cancel();
    _sub = null;
    _expiryTimer?.cancel();
    _expiryTimer = null;
  }

  /// Notify, but never in the middle of a frame.
  ///
  /// go_router listens to this and re-runs its redirect when it fires. Some
  /// callers legitimately run during build — the gate calls [clear] from
  /// `initState` in switch mode — and re-entering routing inside a build is
  /// how you get "setState during build" crashes, so defer to the next frame.
  void _notify() {
    if (SchedulerBinding.instance.schedulerPhase ==
        SchedulerPhase.persistentCallbacks) {
      SchedulerBinding.instance.addPostFrameCallback((_) => notifyListeners());
      return;
    }
    notifyListeners();
  }
}
