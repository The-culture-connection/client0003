/// Translates an inbound link into an in-app route.
///
/// Two very different things arrive at the same handler in `main.dart`:
///
/// * **Push payloads**, which are already in-app paths (`/messages/direct/x`).
///   These pass through unchanged — that is the historical behaviour and the
///   server owns those strings.
/// * **Real URLs** opened from outside: an `https://…` App Link off a QR code
///   or a shared message, or the `mortaralumni://` custom scheme. These are
///   public surface, so only an explicit allow-list is honoured.
///
/// Anything unrecognised returns null and is ignored. That matters: the old
/// handler fed `uri.path` straight to the router, so *any* link the OS handed
/// us — including one crafted by someone else — could drive navigation to an
/// arbitrary in-app route. Resolving through a known set closes that off.
library;

import '../constants/app_links.dart';
import 'member_card_link.dart' show kMemberCardScheme;

/// Public path (web and app agree) for the conference ticket entry flow.
const String kTicketsPath = '/tickets';

/// Query parameter naming a specific conference, so a QR printed for one event
/// lands on that event rather than the general list.
const String kConferenceQueryParam = 'c';

/// Hosts whose `https://` links this app claims. Derived from the configured
/// Digital Curriculum origin so a `--dart-define=DIGITAL_CURRICULUM_URL=…`
/// build stays consistent with the native App Link / Universal Link config.
Set<String> get _claimedHosts {
  final host = Uri.tryParse(AppLinks.digitalCurriculum)?.host.toLowerCase();
  return <String>{if (host != null && host.isNotEmpty) host};
}

/// Conference ids are Firestore document ids; bound the value rather than
/// trusting whatever a link carries into a query string.
final RegExp _conferenceIdPattern = RegExp(r'^[A-Za-z0-9_-]{1,128}$');

/// Resolves [raw] to an in-app route, or null if it should be ignored.
String? resolveDeepLink(String? raw) {
  final value = raw?.trim();
  if (value == null || value.isEmpty) return null;

  // A bare in-app path (push payload) — pass through.
  if (value.startsWith('/')) return value;

  final Uri uri;
  try {
    uri = Uri.parse(value);
  } on FormatException {
    return null;
  }

  final scheme = uri.scheme.toLowerCase();
  final isCustomScheme = scheme == kMemberCardScheme;
  final isClaimedWeb =
      (scheme == 'https' || scheme == 'http') &&
      _claimedHosts.contains(uri.host.toLowerCase());
  if (!isCustomScheme && !isClaimedWeb) return null;

  // `mortaralumni://tickets` puts "tickets" in the host, `https://…/tickets`
  // puts it in the path. Normalise both to a list of segments.
  final segments = <String>[
    if (isCustomScheme && uri.host.isNotEmpty) uri.host.toLowerCase(),
    ...uri.pathSegments.where((s) => s.isNotEmpty),
  ];
  if (segments.isEmpty) return null;

  switch (segments.first) {
    case 'tickets':
      final id = uri.queryParameters[kConferenceQueryParam]?.trim();
      final hasId = id != null && _conferenceIdPattern.hasMatch(id);
      // A trailing segment works too (`/tickets/<id>`), so printed links can
      // stay tidy: `…/tickets/summit26`.
      final pathId = segments.length > 1 ? segments[1] : null;
      final resolvedId = hasId
          ? id
          : (pathId != null && _conferenceIdPattern.hasMatch(pathId)
              ? pathId
              : null);
      return resolvedId == null
          ? kTicketsPath
          : '$kTicketsPath?$kConferenceQueryParam=$resolvedId';
    default:
      // Includes `mortaralumni://card/v1/<uid>` — the member-card QR payload,
      // which is consumed by the in-app scanner only and is deliberately inert
      // when opened by the OS camera. See `member_card_link.dart`.
      return null;
  }
}

/// The shareable https URL for the ticket flow — what goes behind a QR code.
///
/// [conferenceId] targets one event; omit it for the general "what's on" link.
String ticketsShareUrl({String? conferenceId}) {
  final base = AppLinks.digitalCurriculum.replaceAll(RegExp(r'/$'), '');
  final id = conferenceId?.trim();
  if (id == null || id.isEmpty || !_conferenceIdPattern.hasMatch(id)) {
    return '$base$kTicketsPath';
  }
  return '$base$kTicketsPath?$kConferenceQueryParam=$id';
}
