/// What the Mortarverse popup shows, and the rules for choosing it.
///
/// Deliberately free of Flutter and Firestore imports. Everything here is
/// plain Dart over plain values, so the selection rules — which are the part
/// with real edge cases — can be exercised directly. The Firestore reads and
/// the widget live in `mortarverse_popup_service.dart` and
/// `widgets/mortarverse_popup_card.dart`.
library;

/// The three things worth surfacing, in the order they win.
///
/// Order is the priority order, and `index` is what [selectMortarversePopup]
/// compares — so reordering this enum reorders the product behaviour.
///
/// * [announcement] leads because a human deliberately flagged it to interrupt.
/// * [event] next: time-bound, and only ever for something already registered.
/// * [message] last. The focus card already surfaces waiting conversations
///   continuously, so a popup adds the least here.
enum MortarversePopupKind { announcement, event, message }

/// One thing that *could* be shown. Built from live data by the service, then
/// filtered and ranked by [selectMortarversePopup].
class MortarversePopupCandidate {
  const MortarversePopupCandidate({
    required this.kind,
    required this.seenKey,
    required this.eyebrow,
    required this.headline,
    required this.body,
    required this.ctaLabel,
    required this.route,
    this.expiresAt,
    this.sortAt,
  });

  final MortarversePopupKind kind;

  /// Stable identity for "this exact thing", used to remember a dismissal.
  ///
  /// `announcement:<postId>` and `event:<eventId>` are fixed for the life of
  /// the item. `messages:<latestThreadUpdatedAtMillis>` deliberately changes
  /// when a newer message lands, so a genuinely new conversation can surface
  /// again while the same unread backlog stays quiet.
  final String seenKey;

  final String eyebrow;
  final String headline;
  final String body;
  final String ctaLabel;

  /// In-app route opened on tap.
  final String route;

  /// Hard cutoff. Past this the candidate is never shown, whether or not it
  /// has been seen.
  final DateTime? expiresAt;

  /// Tie-break within a kind — newest first. Null sorts last.
  final DateTime? sortAt;
}

/// Picks the single popup to show, or null when nothing qualifies.
///
/// Only one is ever returned: the screen shows at most one per app launch, and
/// choosing here rather than at the call site keeps that guarantee in one place.
MortarversePopupCandidate? selectMortarversePopup({
  required List<MortarversePopupCandidate> candidates,
  required Set<String> seenKeys,
  required DateTime now,
}) {
  final eligible = candidates.where((c) {
    if (seenKeys.contains(c.seenKey)) return false;
    final expiry = c.expiresAt;
    // `isAfter` rather than `!isBefore`: an item expiring exactly now is over.
    if (expiry != null && !now.isBefore(expiry)) return false;
    return true;
  }).toList();

  if (eligible.isEmpty) return null;

  eligible.sort((a, b) {
    final byKind = a.kind.index.compareTo(b.kind.index);
    if (byKind != 0) return byKind;
    final aAt = a.sortAt;
    final bAt = b.sortAt;
    if (aAt == null && bAt == null) return 0;
    if (aAt == null) return 1;
    if (bAt == null) return -1;
    return bAt.compareTo(aAt); // newest first
  });

  return eligible.first;
}

/// How long a dismissal is remembered before it is forgotten as clutter.
///
/// The map lives on the user's own document, so it must not grow without
/// bound. Long enough that nothing realistically re-surfaces: the items it
/// keys are posts and events, which stop being eligible on their own well
/// before this.
const Duration kMortarversePopupSeenRetention = Duration(days: 90);

/// Drops entries older than [kMortarversePopupSeenRetention].
///
/// Returns a new map; the input is not modified. Called before every write, so
/// the stored map is pruned as a side effect of normal use rather than needing
/// a migration.
Map<String, DateTime> pruneMortarversePopupSeen(
  Map<String, DateTime> seen,
  DateTime now, {
  Duration retention = kMortarversePopupSeenRetention,
}) {
  final cutoff = now.subtract(retention);
  return <String, DateTime>{
    for (final e in seen.entries)
      if (e.value.isAfter(cutoff)) e.key: e.value,
  };
}

/// Builds the seen key for the waiting-messages popup.
///
/// Keyed on **who** is waiting, not on how many messages or when the last one
/// landed. The alternatives are both worse: a timestamp re-fires every time
/// another message arrives in a conversation the user has already chosen to
/// ignore, and a fixed key never re-fires at all. Keying on the set means a
/// genuinely new person gets one nudge, while an existing backlog stays quiet
/// however much it grows.
///
/// Sorted so the key does not depend on query order, and capped so it cannot
/// outgrow a Firestore map key on an account with a large inbox.
String mortarverseMessagesSeenKey(List<String> waitingPartnerIds) {
  const cap = 8;
  final sorted = [...waitingPartnerIds]..sort();
  if (sorted.length <= cap) return 'messages:${sorted.join(",")}';
  return 'messages:${sorted.take(cap).join(",")}+${sorted.length - cap}';
}
