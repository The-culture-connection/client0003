import 'package:cloud_firestore/cloud_firestore.dart';

/// `feed_posts/{postId}`
class FeedPost {
  const FeedPost({
    required this.id,
    required this.postCategory,
    required this.postTitle,
    required this.postDetails,
    required this.authorId,
    required this.authorName,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String postCategory;
  final String postTitle;
  final String postDetails;
  final String authorId;
  final String authorName;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  static FeedPost fromDoc(String id, Map<String, dynamic> data) {
    return FeedPost(
      id: id,
      postCategory: _s(data['post_category']) ?? 'General',
      postTitle: _s(data['post_title']) ?? '',
      postDetails: _s(data['post_details']) ?? '',
      authorId: _s(data['author_id']) ?? '',
      authorName: _s(data['author_name']) ?? 'Member',
      createdAt: _ts(data['created_at']),
      updatedAt: _ts(data['updated_at']),
    );
  }

  static String? _s(dynamic v) => v is String ? v : null;

  static DateTime? _ts(dynamic v) {
    if (v is Timestamp) return v.toDate();
    return null;
  }
}

/// `feed_posts/{postId}/replies/{replyId}`
class FeedPostReply {
  const FeedPostReply({
    required this.id,
    required this.authorId,
    required this.authorName,
    required this.body,
    this.createdAt,
    this.parentReplyId,
  });

  final String id;
  final String authorId;
  final String authorName;
  final String body;
  final DateTime? createdAt;
  /// Set when this reply is nested under another reply.
  final String? parentReplyId;

  static FeedPostReply fromDoc(String id, Map<String, dynamic> data) {
    return FeedPostReply(
      id: id,
      authorId: _s(data['author_id']) ?? '',
      authorName: _s(data['author_name']) ?? 'Member',
      body: _s(data['body']) ?? '',
      createdAt: _ts(data['created_at']),
      parentReplyId: _s(data['parent_reply_id']),
    );
  }

  static String? _s(dynamic v) => v is String ? v : null;

  static DateTime? _ts(dynamic v) {
    if (v is Timestamp) return v.toDate();
    return null;
  }
}
