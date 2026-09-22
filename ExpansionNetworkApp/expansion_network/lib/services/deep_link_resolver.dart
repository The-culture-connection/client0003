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

/// Hosts whose `https://` links this app claims.
///
/// Derived from the configured origins so a `--dart-define=…` build stays
/// consistent with the native App Link / Universal Link config, rather than
/// drifting from a second hard-coded list.
///
/// Both the public link origin and the Digital Curriculum origin are included:
/// the two serve the same site, and links to it exist on both in the wild.
/// `www.` is claimed alongside the bare public host because a person typing or
/// a tool rewriting the URL will produce it, and a link that silently stops
/// opening the app is worse than one extra entry.
///
/// **Every host here must also serve `/.well-known/assetlinks.json` and
/// `/.well-known/apple-app-site-association`**, and be listed in
/// `AndroidManifest.xml` and `Runner.entitlements`. A host claimed here but
/// missing from those places will not open the app; a host in those places but
/// missing here will open the app and then be ignored.
Set<String> get _claimedHosts {
  final hosts = <String>{};
  for (final origin in <String>[
    AppLinks.publicLinkOrigin,
    AppLinks.digitalCurriculum,
  ]) {
    final host = Uri.tryParse(origin)?.host.toLowerCase();
    if (host == null || host.isEmpty) continue;
    hosts.add(host);
    if (!host.startsWith('www.')) hosts.add('www.$host');
  }
  return hosts;
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
/// Built on [AppLinks.publicLinkOrigin], not the Digital Curriculum origin:
/// this is the URL that ends up on printed material and in other people's
/// messages, so it should be the public-facing domain. Both hosts resolve to
/// the same flow, so an older link built the other way keeps working.
///
/// [conferenceId] targets one event; omit it for the general "what's on" link.
String ticketsShareUrl({String? conferenceId}) {
  final base = AppLinks.publicLinkOrigin.replaceAll(RegExp(r'/$'), '');
  final id = conferenceId?.trim();
  if (id == null || id.isEmpty || !_conferenceIdPattern.hasMatch(id)) {
    return '$base$kTicketsPath';
  }
  return '$base$kTicketsPath?$kConferenceQueryParam=$id';
}
