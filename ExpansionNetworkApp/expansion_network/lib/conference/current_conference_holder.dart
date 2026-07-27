/// Ambient "which conference is currently open" holder.
///
/// `StatefulShellRoute` requires every branch's default location to be a
/// parameter-free route (go_router assertion in `RouteConfiguration`), so
/// `conferenceId` can't live in the `/conference/lobby` etc. paths themselves.
/// This holds it instead: set once when entering the Conference app (from the
/// Mortarverse chooser, or resolved from the active conference on a cold
/// deep link) and read by [ConferenceShell] / the session detail screen.
class CurrentConferenceHolder {
  CurrentConferenceHolder._();

  static final CurrentConferenceHolder instance = CurrentConferenceHolder._();

  String? conferenceId;
}
