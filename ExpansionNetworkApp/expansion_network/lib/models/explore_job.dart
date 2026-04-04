import 'package:cloud_firestore/cloud_firestore.dart';

/// `expansion_jobs/{id}` — user-posted jobs for Explore.
class ExploreJob {
  const ExploreJob({
    required this.id,
    required this.title,
    this.company,
    this.location,
    this.description,
    required this.authorId,
    this.authorName,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String title;
  final String? company;
  final String? location;
  final String? description;
  final String authorId;
  final String? authorName;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  static ExploreJob? fromDoc(String id, Map<String, dynamic> d) {
    final title = d['title'];
    final author = d['author_id'];
    if (title is! String || author is! String) return null;
    return ExploreJob(
      id: id,
      title: title,
      company: _s(d['company']),
      location: _s(d['location']),
      description: _s(d['description']),
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
