/// Payload codec for the member "business card" QR.
///
/// The QR encodes **only** the uid, wrapped in a namespaced URI so the scanner
/// can tell one of our cards from a foreign QR (a Wi-Fi code, a URL) and reject
/// it cleanly instead of misbehaving. Profile fields are fetched fresh from
/// `users/{uid}` on scan, so a card is never stale and no PII is baked into a
/// screenshot-able image.
///
/// The scheme is [kMemberCardScheme] — the app's registered URL scheme (see
/// `ios/Runner/Info.plist` `CFBundleURLSchemes`) rather than an invented one,
/// so the payload stays valid if we later register it for real deep linking.
/// Today nothing outside the app parses it: [MemberCardScanScreen] is the only
/// consumer, so scanning with the OS camera app does nothing by design.
library;

/// The app's registered URL scheme.
const String kMemberCardScheme = 'mortaralumni';

/// Host segment identifying a member card payload.
const String kMemberCardHost = 'card';

/// Current payload version. Bump when the shape changes so old apps can reject
/// what they cannot read rather than guessing.
const String kMemberCardVersion = 'v1';

/// Firebase Auth uids are alphanumeric; the bound is a sanity check, not a spec.
final RegExp _uidPattern = RegExp(r'^[A-Za-z0-9_-]{1,128}$');

/// Builds the string encoded into the QR on the back of [uid]'s card.
///
/// Returns `mortaralumni://card/v1/<uid>`.
String buildMemberCardPayload(String uid) =>
    '$kMemberCardScheme://$kMemberCardHost/$kMemberCardVersion/$uid';

/// Extracts the uid from a scanned QR value.
///
/// Returns `null` for anything that is not a well-formed member card payload —
/// a foreign QR, a different scheme, an unknown version, or a malformed uid.
/// Callers should treat `null` as "not an Expansion card" rather than an error.
String? parseMemberCardPayload(String? raw) {
  final value = raw?.trim();
  if (value == null || value.isEmpty) return null;

  final Uri uri;
  try {
    uri = Uri.parse(value);
  } on FormatException {
    return null;
  }

  if (uri.scheme.toLowerCase() != kMemberCardScheme) return null;
  if (uri.host.toLowerCase() != kMemberCardHost) return null;

  final segments = uri.pathSegments;
  if (segments.length != 2) return null;
  if (segments.first != kMemberCardVersion) return null;

  final uid = segments.last;
  if (!_uidPattern.hasMatch(uid)) return null;
  return uid;
}
