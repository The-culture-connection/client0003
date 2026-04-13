import 'package:cloud_firestore/cloud_firestore.dart';

/// Staff-authored announcements in `mortar_info_posts` (Digital Curriculum admin).
class MortarInfoPost {
  const MortarInfoPost({
    required this.id,
    required this.title,
    required this.body,
    required this.published,
    this.media = const [],
    this.createdAt,
    this.updatedAt,
    this.newsletterUrl,
    this.newsletterLabel,
  });

  final String id;
  final String title;
  final String body;
  final bool published;
  final List<MortarInfoMediaItem> media;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  /// Optional https link (e.g. newsletter) shown as a LinkedIn-style link card.
  final String? newsletterUrl;
  final String? newsletterLabel;

  bool get hasNewsletterLink =>
      newsletterUrl != null && newsletterUrl!.trim().isNotEmpty && newsletterUrl!.trim().startsWith('https://');

  static MortarInfoPost fromDoc(String id, Map<String, dynamic> data) {
    final raw = data['media'];
    final List<MortarInfoMediaItem> items = [];
    if (raw is List) {
      for (final e in raw) {
        final m = _parseMedia(e);
        if (m != null) items.add(m);
      }
    }
    final titleRaw = _s(data['title']);
    final bodyRaw = _s(data['body']) ?? '';

    return MortarInfoPost(
      id: id,
      title: (titleRaw ?? '').trim(),
      body: bodyRaw,
      published: data['published'] == true,
      media: items,
      createdAt: _ts(data['created_at']),
      updatedAt: _ts(data['updated_at']),
      newsletterUrl: _s(data['newsletter_url']),
      newsletterLabel: _s(data['newsletter_label']),
    );
  }

  static MortarInfoMediaItem? _parseMedia(dynamic e) {
    if (e is! Map) return null;
    final m = Map<String, dynamic>.from(e);
    final url = _s(m['url']);
    if (url == null || url.isEmpty) return null;
    final t = _s(m['type'])?.toLowerCase();
    final isVideo = t == 'video';
    return MortarInfoMediaItem(url: url, isVideo: isVideo);
  }

  static String? _s(dynamic v) => v is String ? v : null;

  static DateTime? _ts(dynamic v) {
    if (v is Timestamp) return v.toDate();
    return null;
  }
}

class MortarInfoMediaItem {
  const MortarInfoMediaItem({required this.url, required this.isVideo});

  final String url;
  final bool isVideo;
}
