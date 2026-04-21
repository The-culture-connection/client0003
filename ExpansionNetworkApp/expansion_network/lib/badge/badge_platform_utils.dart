/// Firestore `badge_definitions.platform`: where the badge is meant to surface in client UIs.
const String kBadgePlatformDigitalCurriculum = 'digital_curriculum';
const String kBadgePlatformExpansionMobile = 'expansion_mobile';
const String kBadgePlatformBoth = 'both';

String effectiveBadgePlatform(String? raw) {
  final p = (raw ?? '').trim();
  if (p == kBadgePlatformDigitalCurriculum ||
      p == kBadgePlatformExpansionMobile ||
      p == kBadgePlatformBoth) {
    return p;
  }
  return kBadgePlatformBoth;
}

bool badgeVisibleOnExpansionMobile(String? platform) {
  final p = effectiveBadgePlatform(platform);
  return p == kBadgePlatformExpansionMobile || p == kBadgePlatformBoth;
}
