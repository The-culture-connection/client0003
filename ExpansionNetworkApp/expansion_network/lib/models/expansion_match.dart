import 'package:cloud_firestore/cloud_firestore.dart';

/// `users/{uid}/expansion_matches/{matchedUserId}` — from [runExpansionUserMatching].
class ExpansionMatch {
  const ExpansionMatch({
    required this.matchedUserId,
    required this.score,
    required this.rawTotal,
    required this.skillScore,
    required this.goalScore,
    required this.contextScore,
    required this.mutualSkillBonus,
    required this.aNeedsFromB,
    required this.bNeedsFromA,
    required this.goalMatches,
    required this.sameCity,
    required this.sameIndustry,
    required this.algorithmVersion,
    this.updatedAt,
  });

  final String matchedUserId;
  final int score;
  final int rawTotal;
  final int skillScore;
  final int goalScore;
  final int contextScore;
  final int mutualSkillBonus;
  final List<String> aNeedsFromB;
  final List<String> bNeedsFromA;
  final List<String> goalMatches;
  final bool sameCity;
  final bool sameIndustry;
  final int algorithmVersion;
  final DateTime? updatedAt;

  static ExpansionMatch fromDoc(String docId, Map<String, dynamic> data) {
    final mid = data['matchedUserId'] is String ? data['matchedUserId'] as String : docId;
    return ExpansionMatch(
      matchedUserId: mid,
      score: _i(data['score']) ?? 0,
      rawTotal: _i(data['rawTotal']) ?? 0,
      skillScore: _i(data['skillScore']) ?? 0,
      goalScore: _i(data['goalScore']) ?? 0,
      contextScore: _i(data['contextScore']) ?? 0,
      mutualSkillBonus: _i(data['mutualSkillBonus']) ?? 0,
      aNeedsFromB: _stringList(data['aNeedsFromB']),
      bNeedsFromA: _stringList(data['bNeedsFromA']),
      goalMatches: _stringList(data['goalMatches']),
      sameCity: data['sameCity'] == true,
      sameIndustry: data['sameIndustry'] == true,
      algorithmVersion: _i(data['algorithmVersion']) ?? 0,
      updatedAt: _ts(data['updatedAt']),
    );
  }

  static int? _i(dynamic v) {
    if (v is int) return v;
    if (v is num) return v.round();
    return null;
  }

  static List<String> _stringList(dynamic v) {
    if (v is! List) return [];
    return v.whereType<String>().where((s) => s.isNotEmpty).toList();
  }

  static DateTime? _ts(dynamic v) {
    if (v is Timestamp) return v.toDate();
    return null;
  }

  /// Plain-language "Why you matched" lines for a match card.
  List<String> get whyLines {
    final lines = <String>[];
    for (final g in goalMatches) {
      if (lines.length >= 5) break;
      lines.add(g);
    }
    if (aNeedsFromB.isNotEmpty) {
      lines.add('You could strengthen: ${aNeedsFromB.take(4).join(', ')}');
    }
    if (bNeedsFromA.isNotEmpty) {
      lines.add('They could learn from you: ${bNeedsFromA.take(4).join(', ')}');
    }
    if (mutualSkillBonus > 0) {
      lines.add('Mutual skill overlap boost applied');
    }
    if (sameCity) lines.add('Same city');
    if (sameIndustry) lines.add('Same tribe');
    if (lines.isEmpty) {
      lines.add('Strong complementary fit from your profiles.');
    }
    return lines;
  }
}
