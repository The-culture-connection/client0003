import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../models/community_event.dart';
import '../models/mortar_info_post.dart';
import 'mortarverse_popup.dart';

/// Turns live app data into at most one Mortarverse popup, and remembers what
/// the user has already dismissed.
///
/// Opens no new queries: announcements, events and waiting conversations are
/// already streamed by the Mortarverse screen, so the caller passes in what it
/// has rather than this starting a second set.
///
/// Seen state lives in a map on the user's **own** document,
/// `users/{uid}.mortarverse_popups`. That rides the existing owner-update rule
/// — a deny-list of privileged fields, not a key allow-list — so it needs no
/// rules change, and unlike `shared_preferences` it follows the user across
/// devices: a popup dismissed on a phone stays dismissed on a tablet.
class MortarversePopupService {
  MortarversePopupService({FirebaseFirestore? firestore, FirebaseAuth? auth})
      : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  /// Field on `users/{uid}` holding `{ seen: {key: Timestamp}, last_shown_at }`.
  static const String field = 'mortarverse_popups';

  /// How close an event has to be before it is worth interrupting for.
  static const Duration eventHorizon = Duration(hours: 48);

  /// One popup per app launch, process-wide.
  ///
  /// Mirrors the `remember`/`consume` shape used by `PendingDeepLink` and
  /// `AuthController.welcomeIntroPending`. Static because the guarantee is
  /// per-launch, not per-widget: the chooser rebuilds on every return to the
  /// Mortarverse, and an instance field would let the popup fire again each
  /// time someone backed out of a planet.
  static bool _shownThisLaunch = false;

  static bool get shownThisLaunch => _shownThisLaunch;

  /// Marks the launch as spent. Called when a popup is actually shown.
  static void markShownThisLaunch() => _shownThisLaunch = true;

  /// Clears the guard. Called on sign-out so the next account starts fresh.
  static void resetLaunchGuard() => _shownThisLaunch = false;

  /// Keys this user has already dismissed.
  ///
  /// Returns empty on failure. That errs toward showing a popup the user may
  /// have already dismissed, which is recoverable; the alternative — treating
  /// a read failure as "seen everything" — would silently disable the feature.
  Future<Set<String>> loadSeenKeys() async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return <String>{};
    try {
      final snap = await _db.collection('users').doc(uid).get();
      return readSeen(snap.data()).keys.toSet();
    } catch (_) {
      return <String>{};
    }
  }

  /// Records [seenKey] as dismissed, pruning anything long expired.
  ///
  /// Best-effort: a failed write costs one repeated popup, not worth surfacing
  /// an error over. Uses `set(merge: true)` rather than `update` so it works on
  /// a user document that has never held this field.
  Future<void> markSeen(String seenKey) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return;
    final now = DateTime.now();
    try {
      final ref = _db.collection('users').doc(uid);
      final snap = await ref.get();
      final seen = pruneMortarversePopupSeen(readSeen(snap.data()), now)
        ..[seenKey] = now;
      await ref.set(
        <String, dynamic>{
          field: <String, dynamic>{
            'seen': seen.map((k, v) => MapEntry(k, Timestamp.fromDate(v))),
            'last_shown_at': Timestamp.fromDate(now),
          },
        },
        SetOptions(merge: true),
      );
    } catch (_) {
      // Ignored by design.
    }
  }

  /// Extracts the seen map from a raw user document.
  static Map<String, DateTime> readSeen(Map<String, dynamic>? userData) {
    final raw = userData?[field];
    if (raw is! Map) return <String, DateTime>{};
    final seen = raw['seen'];
    if (seen is! Map) return <String, DateTime>{};
    final out = <String, DateTime>{};
    seen.forEach((k, v) {
      if (k is String && v is Timestamp) out[k] = v.toDate();
    });
    return out;
  }

  /// Builds every candidate the current data supports.
  ///
  /// Ranking and filtering happen in [selectMortarversePopup]; this only maps
  /// models to candidates, so the decision itself stays testable.
  List<MortarversePopupCandidate> buildCandidates({
    required List<MortarInfoPost> posts,
    required List<CommunityEvent> events,
    required List<String> waitingPartnerIds,
    required DateTime now,
    String? uid,
  }) {
    final userId = uid ?? _auth.currentUser?.uid;
    final out = <MortarversePopupCandidate>[];

    for (final p in posts) {
      if (!p.popupActiveAt(now)) continue;
      out.add(MortarversePopupCandidate(
        kind: MortarversePopupKind.announcement,
        seenKey: 'announcement:${p.id}',
        eyebrow: 'NEW FROM MORTAR',
        headline: p.title.isEmpty ? 'A note from MORTAR' : p.title,
        body: summarise(p.body),
        ctaLabel: 'Read it',
        route: '/mortar-info/${p.id}',
        expiresAt: p.popupExpiresAt,
        sortAt: p.createdAt,
      ));
    }

    if (userId != null) {
      for (final e in events) {
        final date = e.date;
        if (date == null) continue;
        if (!e.isRegistered(userId)) continue;
        // Already started, or too far out to be worth interrupting for.
        if (date.isBefore(now) || date.difference(now) > eventHorizon) continue;
        out.add(MortarversePopupCandidate(
          kind: MortarversePopupKind.event,
          seenKey: 'event:${e.id}',
          eyebrow: 'COMING UP',
          headline: e.title,
          body: eventWhen(e.time, date, now),
          ctaLabel: 'View details',
          route: '/events/${e.id}',
          // Stops mattering the moment it starts.
          expiresAt: date,
          sortAt: date,
        ));
      }
    }

    if (waitingPartnerIds.isNotEmpty) {
      final n = waitingPartnerIds.length;
      out.add(MortarversePopupCandidate(
        kind: MortarversePopupKind.message,
        seenKey: mortarverseMessagesSeenKey(waitingPartnerIds),
        eyebrow: 'WAITING ON YOU',
        headline:
            n == 1 ? 'You have a reply' : 'You have $n conversations waiting',
        body: n == 1
            ? 'Someone messaged you and has not heard back.'
            : '$n people messaged you and have not heard back.',
        ctaLabel: 'Open messages',
        route: '/commons/messages',
        // No sortAt: there is only ever one message candidate, so nothing to
        // tie-break against.
      ));
    }

    return out;
  }

  /// First ~120 characters of a post body, for the popup's one-line summary.
  static String summarise(String body, {int max = 120}) {
    final flat = body.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (flat.length <= max) return flat;
    final cut = flat.substring(0, max);
    final lastSpace = cut.lastIndexOf(' ');
    final trimmed = lastSpace > 40 ? cut.substring(0, lastSpace) : cut;
    return '$trimmed...';
  }

  /// Human phrasing for how soon an event starts.
  static String eventWhen(String rawTime, DateTime date, DateTime now) {
    final time = rawTime.trim();
    final hours = date.difference(now).inHours;
    final when = hours < 1
        ? 'Starting soon'
        : hours < 24
            ? 'In $hours ${hours == 1 ? 'hour' : 'hours'}'
            : 'Tomorrow';
    final tail = time.isEmpty ? '' : ' at $time';
    return '$when$tail - you are registered.';
  }
}
