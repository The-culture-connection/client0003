import '../badge/badge_platform_utils.dart';

/// `badge_definitions/{badgeId}` — read-only for signed-in users (writes staff-only).
class BadgeDefinition {
  BadgeDefinition({
    required this.id,
    required this.name,
    required this.description,
    this.iconAssetKey,
    this.imageUrl,
    this.platform = kBadgePlatformBoth,
    this.tier,
    this.displayOrder = 0,
    this.criteria,
  });

  final String id;
  final String name;
  final String description;
  final String? iconAssetKey;
  /// Staff-hosted image URL (Digital Curriculum admin / badge bank).
  final String? imageUrl;
  /// `digital_curriculum` | `expansion_mobile` | `both` (normalized).
  final String platform;
  final String? tier;
  final int displayOrder;
  final Map<String, dynamic>? criteria;

  static BadgeDefinition? fromDoc(String id, Map<String, dynamic> d) {
    final name = d['name'] as String? ?? '';
    if (name.isEmpty) return null;
    return BadgeDefinition(
      id: id,
      name: name,
      description: (d['description'] as String?)?.trim() ?? '',
      iconAssetKey: d['icon_asset_key'] as String?,
      imageUrl: _optionalImageUrl(d['image_url']),
      platform: effectiveBadgePlatform(d['platform'] as String?),
      tier: d['tier'] as String?,
      displayOrder: _int(d['display_order']),
      criteria: d['criteria'] is Map ? Map<String, dynamic>.from(d['criteria'] as Map) : null,
    );
  }
}

int _int(dynamic v) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  return 0;
}

String? _optionalImageUrl(dynamic v) {
  if (v is! String) return null;
  final t = v.trim();
  return t.isEmpty ? null : t;
}

/// Helpers for `users/{uid}.gamification.counters`.
class UserGamificationCounters {
  UserGamificationCounters({this.postsCreated = 0, this.commentsCreated = 0});

  final int postsCreated;
  final int commentsCreated;

  static UserGamificationCounters fromUserData(Map<String, dynamic>? data) {
    final g = data?['gamification'];
    if (g is! Map) return UserGamificationCounters();
    final c = g['counters'];
    if (c is! Map) return UserGamificationCounters();
    return UserGamificationCounters(
      postsCreated: _int(c['posts_created']),
      commentsCreated: _int(c['comments_created']),
    );
  }
}
