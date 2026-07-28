/// Payload codec for a sponsor booth QR — the code printed on booth signage.
///
/// Mirrors [buildMemberCardPayload] in `member_card_link.dart`: same registered
/// scheme, same versioned shape, different host. Scanning one credits a booth
/// visit and opens that sponsor's CTA.
///
/// Only the sponsor id is encoded. The sponsor's name, CTA and perks are read
/// fresh from Firestore on scan, so reprinting signage is never required when
/// those change.
library;

import 'member_card_link.dart' show kMemberCardScheme;

/// Host segment identifying a booth payload.
const String kBoothHost = 'booth';

/// Current payload version.
const String kBoothVersion = 'v1';

/// Firestore ids are alphanumeric; the bound is a sanity check, not a spec.
final RegExp _sponsorIdPattern = RegExp(r'^[A-Za-z0-9_-]{1,128}$');

/// Builds the string encoded into a sponsor's booth QR.
///
/// Returns `mortaralumni://booth/v1/<sponsorId>`.
String buildBoothPayload(String sponsorId) =>
    '$kMemberCardScheme://$kBoothHost/$kBoothVersion/$sponsorId';

/// Extracts the sponsor id from a scanned QR value.
///
/// Returns `null` for anything that is not a well-formed booth payload —
/// including a *member card* payload, which shares the scheme but uses a
/// different host. Callers should treat `null` as "not a booth code".
String? parseBoothPayload(String? raw) {
  final value = raw?.trim();
  if (value == null || value.isEmpty) return null;

  final Uri uri;
  try {
    uri = Uri.parse(value);
  } on FormatException {
    return null;
  }

  if (uri.scheme.toLowerCase() != kMemberCardScheme) return null;
  if (uri.host.toLowerCase() != kBoothHost) return null;

  final segments = uri.pathSegments;
  if (segments.length != 2) return null;
  if (segments.first != kBoothVersion) return null;

  final sponsorId = segments.last;
  if (!_sponsorIdPattern.hasMatch(sponsorId)) return null;
  return sponsorId;
}
