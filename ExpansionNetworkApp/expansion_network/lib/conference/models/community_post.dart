import 'package:cloud_firestore/cloud_firestore.dart';

/// Longest tag we store, after the leading `#` is stripped.
const int kCommunityTagMaxLength = 24;

/// Normalises a free-text tag: strips a leading `#`, collapses whitespace,
/// trims to [kCommunityTagMaxLength]. Returns null when nothing usable is left,
/// so an untagged message simply omits the field.
String? normalizeCommunityTag(String? raw) {
  if (raw == null) return null;
  var t = raw.trim();
  while (t.startsWith('#')) {
    t = t.substring(1).trim();
  }
  t = t.replaceAll(RegExp(r'\s+'), ' ');
  if (t.isEmpty) return null;
  if (t.length > kCommunityTagMaxLength) {
    t = t.substring(0, kCommunityTagMaxLength).trim();
  }
  return t.isEmpty ? null : t;
}

/// `conferences/{id}/community_posts/{postId}` — one open-forum message.
///
/// Body + optional free-text tag. [authorName] and [authorSubtitle] are
/// denormalised at write time so the feed renders from one query instead of a
/// profile read per row.
class CommunityPost {
  const CommunityPost({
    required this.id,
    required this.authorId,
    required this.authorName,
    required this.body,
    required this.replyCount,
    this.authorSubtitle,
    this.tag,
    this.createdAt,
  });

  final String id;
  final String authorId;
  final String authorName;

  /// e.g. "Product Manager · Fintech". Null when the profile has neither.
  final String? authorSubtitle;

  final String body;

  /// Free-text, stored without the leading `#`; displayed uppercased.
  final String? tag;

  /// Denormalised so the feed does not need a listener per row.
  final int replyCount;

  final DateTime? createdAt;

  static CommunityPost? fromDoc(String id, Map<String, dynamic>? data) {
    if (data == null) return null;
    final author = data['author_id'];
    final body = data['body'];
    if (author is! String || body is! String) return null;
    final created = data['created_at'];
    return CommunityPost(
      id: id,
      authorId: author,
      authorName: _str(data['author_name']) ?? 'Member',
      authorSubtitle: _str(data['author_subtitle']),
      body: body,
      tag: _str(data['tag']),
      replyCount: (data['reply_count'] as num?)?.toInt() ?? 0,
      createdAt: created is Timestamp ? created.toDate() : null,
    );
  }
}

/// `conferences/{id}/community_posts/{postId}/replies/{replyId}`.
///
/// Replies are flat — one level under a post. Threading replies-to-replies was
/// deliberately left out; the thread reads as a conversation, not a tree.
class CommunityReply {
  const CommunityReply({
    required this.id,
    required this.authorId,
    required this.authorName,
    required this.body,
    this.authorSubtitle,
    this.createdAt,
  });

  final String id;
  final String authorId;
  final String authorName;
  final String? authorSubtitle;
  final String body;
  final DateTime? createdAt;

  static CommunityReply? fromDoc(String id, Map<String, dynamic>? data) {
    if (data == null) return null;
    final author = data['author_id'];
    final body = data['body'];
    if (author is! String || body is! String) return null;
    final created = data['created_at'];
    return CommunityReply(
      id: id,
      authorId: author,
      authorName: _str(data['author_name']) ?? 'Member',
      authorSubtitle: _str(data['author_subtitle']),
      body: body,
      createdAt: created is Timestamp ? created.toDate() : null,
    );
  }
}

String? _str(dynamic v) {
  if (v is String && v.trim().isNotEmpty) return v.trim();
  return null;
}
