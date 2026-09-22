/// Holds a deep-link destination across an interruption — today, across
/// sign-in.
///
/// A link like `https://…/tickets` can land on a signed-out app. The router's
/// redirect bounces anyone signed out to the landing screen, which would
/// silently drop where they were trying to go: they sign in and arrive at the
/// Mortarverse chooser with no idea the ticket link did anything. Stashing the
/// destination here lets `postAuthDestination()` in `app_router.dart` hand them
/// straight to it once auth resolves.
///
/// Deliberately a plain singleton rather than state on [AuthController]: it is
/// written from the router's `redirect` callback, which must not mutate a
/// [ChangeNotifier] (notifying mid-redirect re-enters the router). Nothing
/// listens to this — it is read exactly once, by the redirect that consumes it.
library;

class PendingDeepLink {
  PendingDeepLink._();

  static final PendingDeepLink instance = PendingDeepLink._();

  String? _location;

  /// Whether a destination is waiting to be resumed.
  bool get hasPending => _location != null;

  /// Remembers [location] (an in-app route, e.g. `/tickets?c=abc`).
  ///
  /// First write wins. A single tap can run the router's redirect more than
  /// once, and the deep link that started the journey is the one worth
  /// resuming — not whatever internal hop the redirect was evaluating when it
  /// ran again.
  void remember(String location) {
    _location ??= location;
  }

  /// Reads and clears the destination. Returns null when nothing is pending.
  String? consume() {
    final v = _location;
    _location = null;
    return v;
  }

  /// Drops any pending destination — e.g. on sign-out, so a link stashed by
  /// one account is never resumed into another's session.
  void clear() {
    _location = null;
  }
}
