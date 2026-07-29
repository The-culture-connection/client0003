import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tutorial_coach_mark/tutorial_coach_mark.dart';

import '../../widgets/expansion_tour.dart';
import '../theme/conference_colors.dart';

/// Screens the conference walkthrough visits, in order.
enum ConferenceTourChapter { lobby, sponsors, community }

/// Route each chapter runs on.
const Map<ConferenceTourChapter, String> _chapterRoutes = {
  ConferenceTourChapter.lobby: '/conference/lobby',
  ConferenceTourChapter.sponsors: '/conference/sponsors',
  ConferenceTourChapter.community: '/conference/community',
};

/// Seen-state is per conference, not per install: conferences are episodic, and
/// an attendee returning a year later for a different event has forgotten the
/// app and has different missions and sponsors to learn.
String _seenKey(String conferenceId) => 'conference_tour_seen_$conferenceId';

Future<bool> hasSeenConferenceTour(String conferenceId) async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool(_seenKey(conferenceId)) ?? false;
}

Future<void> markConferenceTourSeen(String conferenceId) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setBool(_seenKey(conferenceId), true);
}

/// Drives the multi-screen conference walkthrough.
///
/// Each screen calls [runIfPending] once it has laid out; when that chapter
/// finishes the runner navigates to the next screen, which then runs its own.
/// Screens stay ignorant of each other — they only declare their own steps.
///
/// The tour is abandoned on skip, on any screen failing to present its chapter,
/// or when the user navigates away mid-tour. It is deliberately *not* resumed
/// afterwards: a half-finished spotlight chasing the user around is worse than
/// no tour at all.
class ConferenceTourRunner {
  ConferenceTourRunner._();

  static final ConferenceTourRunner instance = ConferenceTourRunner._();

  ConferenceTourChapter? _pending;
  String? _conferenceId;
  TutorialCoachMark? _active;

  bool get isRunning => _pending != null;

  /// Begins the walkthrough for [conferenceId] unless it has already been seen.
  ///
  /// Safe to call on every lobby build — it no-ops when already seen or running.
  Future<void> maybeStart(String conferenceId) async {
    if (isRunning) return;
    if (await hasSeenConferenceTour(conferenceId)) return;
    _conferenceId = conferenceId;
    _pending = ConferenceTourChapter.lobby;
  }

  /// Abandons the tour, leaving it un-seen so it can run again next visit.
  void abandon() {
    _active?.finish();
    _active = null;
    _pending = null;
    _conferenceId = null;
  }

  /// Called by a screen once its targets are laid out.
  ///
  /// Does nothing unless this screen's chapter is the pending one. [steps] whose
  /// key has no laid-out widget are dropped, so a target that is conditionally
  /// rendered (an empty Sponsor Hall, say) can't stall the tour.
  void runIfPending(
    BuildContext context,
    ConferenceTourChapter chapter,
    List<TourStep> Function() buildSteps,
  ) {
    if (_pending != chapter) return;
    // A second overlay would sit on top of the first and eat its taps, which
    // looks exactly like a frozen tour.
    if (_active != null) return;

    final steps = buildSteps().where((s) => s.key.currentContext != null).toList();
    if (steps.isEmpty) {
      // Nothing to point at here — move on rather than showing an empty overlay.
      _advance(context, chapter);
      return;
    }

    // onSkip fires before onDone, so by the time onDone runs we know which of
    // the two ended the chapter.
    var skipped = false;
    final tour = buildExpansionTour(
      steps: steps,
      accent: ConferenceColors.gold,
      onAccent: Colors.black,
      onSkip: () => skipped = true,
      onDone: () {
        _active = null;
        if (skipped) {
          abandon();
          return;
        }
        if (!context.mounted) {
          abandon();
          return;
        }
        _advance(context, chapter);
      },
    );
    _active = tour;
    tour.show(context: context);
  }

  void _advance(BuildContext context, ConferenceTourChapter finished) {
    final next = _nextAfter(finished);
    if (next == null) {
      final id = _conferenceId;
      _pending = null;
      _conferenceId = null;
      if (id != null) markConferenceTourSeen(id);
      // Land back where the tour started.
      if (context.mounted) context.go('/conference/lobby');
      return;
    }
    _pending = next;
    if (context.mounted) context.go(_chapterRoutes[next]!);
  }

  ConferenceTourChapter? _nextAfter(ConferenceTourChapter c) {
    final all = ConferenceTourChapter.values;
    final i = all.indexOf(c);
    return i >= 0 && i + 1 < all.length ? all[i + 1] : null;
  }
}
