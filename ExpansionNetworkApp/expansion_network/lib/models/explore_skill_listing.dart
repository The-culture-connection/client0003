import 'package:cloud_firestore/cloud_firestore.dart';

/// `expansion_skills/{id}` — user skill offerings for Explore (distinct from onboarding “skills”).
class ExploreSkillListing {
  const ExploreSkillListing({
    required this.id,
    required this.title,
    this.summary,
    required this.authorId,
    this.authorName,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String title;
  final String? summary;
  final String authorId;
  final String? authorName;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  static ExploreSkillListing? fromDoc(String id, Map<String, dynamic> d) {
    final title = d['title'];
    final author = d['author_id'];
    if (title is! String || author is! String) return null;
    return ExploreSkillListing(
      id: id,
      title: title,
      summary: _s(d['summary']),
      authorId: author,
      authorName: _s(d['author_name']),
      createdAt: _ts(d['created_at']),
      updatedAt: _ts(d['updated_at']),
    );
  }

  static String? _s(dynamic v) => v is String ? v : null;

  static DateTime? _ts(dynamic v) {
    if (v is Timestamp) return v.toDate();
    return null;
  }
}
