import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../theme/cosmic.dart';
import '../conference_analytics.dart';
import '../current_conference_holder.dart';
import '../models/conference.dart';
import '../services/conference_repository.dart';
import '../theme/conference_colors.dart';

/// The one destination a ticket link or QR code resolves to (`/tickets`).
///
/// It decides nothing about tickets itself — it works out *which of three
/// places* the person who followed the link belongs in, then forwards:
///
/// * **Not signed in** — never reaches here. `app_router`'s redirect stashes
///   the location in `PendingDeepLink` and sends them to the landing screen to
///   sign in or create an account; the stash brings them back once auth
///   resolves.
/// * **Signed in, already an attendee of a conference that is open** — the
///   card reveal animation, then their scannable member card. Someone already
///   holding a ticket wants their badge, not a shop.
/// * **Signed in, no ticket** (or the conference is not open yet) — the
///   Conference Center gate, which already handles browse / buy / register /
///   redeem.
///
/// It is a routing screen, so it shows only a brief hold state: it is on
/// screen for one Firestore round trip and then replaced. Every exit uses `go`
/// rather than `push`, so the back button never returns to a spinner that
/// would immediately re-resolve and bounce the user forward again.
class ConferenceTicketEntryScreen extends StatefulWidget {
  const ConferenceTicketEntryScreen({super.key, this.conferenceId});

  /// Optional target from `?c=` — a QR printed for one specific event. When
  /// null the screen resolves against every conference the user can enter.
  final String? conferenceId;

  @override
  State<ConferenceTicketEntryScreen> createState() =>
      _ConferenceTicketEntryScreenState();
}

class _ConferenceTicketEntryScreenState
    extends State<ConferenceTicketEntryScreen> {
  final ConferenceRepository _repo = ConferenceRepository();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      unawaited(_resolve());
    });
  }

  /// Sends the user on. Every failure path ends at the gate: it is the screen
  /// that can explain itself (and recover) whatever the real state turns out
  /// to be, so a lookup that throws must never strand anyone here.
  Future<void> _resolve() async {
    final targeted = widget.conferenceId != null;
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) {
      // The redirect should have caught this; if auth vanished mid-flight the
      // gate's own guards take over.
      _toGate(targeted);
      return;
    }

    try {
      final admitted = await _admittedConference(uid);
      if (!mounted) return;

      // `enter` is the authority on whether a conference is admitting right
      // now — a redeemed ticket for one that has closed is not a way in.
      if (admitted == null || !CurrentConferenceHolder.instance.enter(admitted)) {
        _toGate(targeted);
        return;
      }

      unawaited(ConferenceAnalytics.ticketLinkOpened(
        destination: 'card',
        targeted: targeted,
      ));
      if (!mounted) return;
      context.go('/conference/card-reveal');
    } catch (_) {
      if (!mounted) return;
      _toGate(targeted);
    }
  }

  /// The conference this user already holds entry access to and that is open
  /// for entry right now, or null.
  Future<Conference?> _admittedConference(String uid) async {
    final targetId = widget.conferenceId;

    // A link naming an event answers only for that event. Falling back to
    // "some other conference they happen to hold" would be a surprise — they
    // scanned a code at a specific door.
    if (targetId != null) {
      final conference = await _repo.fetchConference(targetId);
      if (conference == null || !conference.isOpenForEntry) return null;
      final hasAccess = await _repo.hasAttendeeAccess(targetId, uid);
      return hasAccess ? conference : null;
    }

    final upcoming = await _repo.fetchUpcomingConferences();
    final open = upcoming.where((c) => c.isOpenForEntry).toList();
    if (open.isEmpty) return null;

    final accessible =
        await _repo.accessibleConferenceIds(uid, open.map((c) => c.id));
    if (accessible.isEmpty) return null;

    // `fetchUpcomingConferences` is soonest-first, so the first match is the
    // one happening now (or next) rather than an arbitrary one.
    for (final c in open) {
      if (accessible.contains(c.id)) return c;
    }
    return null;
  }

  void _toGate(bool targeted) {
    final targetId = widget.conferenceId;
    if (targetId != null) {
      // Pre-selects the conference so the gate opens focused on the event the
      // link named, rather than the top of a generic list.
      CurrentConferenceHolder.instance.target(targetId);
    }
    unawaited(ConferenceAnalytics.ticketLinkOpened(
      destination: 'gate',
      targeted: targeted,
    ));
    context.go('/conference/gate');
  }

  @override
  Widget build(BuildContext context) {
    // Matches the gate's atmosphere so the hand-off does not flash a different
    // world between the link opening and the screen it resolves to.
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  ConferenceColors.atmosphere,
                  Colors.black,
                  Colors.black,
                ],
              ),
            ),
          ),
          const Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  height: 26,
                  width: 26,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: ConferenceColors.gold,
                  ),
                ),
                SizedBox(height: 20),
                Text(
                  'Checking your ticket…',
                  style: TextStyle(color: Cosmic.textMuted, fontSize: 14),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
