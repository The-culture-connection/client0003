/// `conference_missions/{missionId}` — an admin-authored challenge.
///
/// Missions reuse the badge rules engine: the `rule` map is the same shape the
/// analytics badge evaluator reads, and completing a mission awards
/// [badgeId], which then appears on the normal badge wall.
class ConferenceMission {
  const ConferenceMission({
    required this.id,
    required this.conferenceId,
    required this.title,
    required this.badgeId,
    required this.target,
    this.description,
    this.iconKey,
    this.displayOrder = 0,
    this.active = true,
  });

  final String id;
  final String conferenceId;
  final String title;
  final String? description;

  /// Badge granted on completion — the mission is meaningless without one.
  final String badgeId;

  /// Denominator for the progress bar, from `rule.threshold`.
  final int target;

  /// Optional icon name understood by [missionIconFor].
  final String? iconKey;

  final int displayOrder;
  final bool active;

  static ConferenceMission? fromDoc(String id, Map<String, dynamic>? d) {
    if (d == null) return null;
    final conferenceId = _str(d['conference_id']);
    final title = _str(d['title']) ?? _str(d['name']);
    final badgeId = _str(d['badge_id']);
    if (conferenceId == null || title == null || badgeId == null) return null;

    final rule = d['rule'];
    if (rule is! Map) return null;
    final threshold = rule['threshold'];
    final target = threshold is num ? threshold.toInt() : 0;
    if (target <= 0) return null;

    return ConferenceMission(
      id: id,
      conferenceId: conferenceId,
      title: title,
      description: _str(d['description']),
      badgeId: badgeId,
      target: target,
      iconKey: _str(d['icon_key']),
      displayOrder: (d['display_order'] as num?)?.toInt() ?? 0,
      active: d['active'] != false,
    );
  }
}

/// One mission's progress for the signed-in user, from
/// `mission_progress/{uid}.by_badge[missionId]`.
class MissionProgress {
  const MissionProgress({required this.value, required this.completed});

  final int value;
  final bool completed;

  static const empty = MissionProgress(value: 0, completed: false);

  static MissionProgress fromMap(Map<String, dynamic>? m) {
    if (m == null) return empty;
    final v = m['metric_value'];
    return MissionProgress(
      value: v is num ? v.toInt() : 0,
      completed: m['completed'] == true ||
          ((m['times_awarded'] as num?)?.toInt() ?? 0) > 0,
    );
  }
}

String? _str(dynamic v) {
  if (v is String && v.trim().isNotEmpty) return v.trim();
  return null;
}
