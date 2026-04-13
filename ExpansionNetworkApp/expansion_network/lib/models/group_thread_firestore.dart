import 'package:cloud_firestore/cloud_firestore.dart';

import '../utils/relative_time.dart';

/// `Groups/{groupId}` — aligns with Digital Curriculum [groups.ts] + optional UI fields.
class FsGroup {
  FsGroup({
    required this.id,
    required this.name,
    required this.status,
    this.description,
    this.category,
    this.imageUrl,
    required this.memberIds,
    required this.pendingIds,
    this.created,
    this.isFeatured = false,
    this.featuredRank = 0,
    this.rulesText,
    this.lastActivitySnippet,
    this.lastActivityAt,
    this.threadCount,
    this.memberCountDenorm,
    this.createdBy,
    this.visibility = 'public',
  });

  final String id;
  final String name;
  final String status;
  final String? description;
  final String? category;
  final String? imageUrl;
  final List<String> memberIds;
  final List<String> pendingIds;
  final Timestamp? created;
  final bool isFeatured;
  final int featuredRank;
  final String? rulesText;
  final String? lastActivitySnippet;
  final Timestamp? lastActivityAt;
  final int? threadCount;
  final int? memberCountDenorm;
  final String? createdBy;

  /// `public` (default) or `private` (self-join blocked server-side).
  final String visibility;

  bool get isPrivateCommunity => visibility == 'private';

  bool isMember(String? uid) => uid != null && memberIds.contains(uid);
  bool isPending(String? uid) => uid != null && pendingIds.contains(uid);

  int get memberCount => memberCountDenorm ?? memberIds.length;

  /// Active if there was activity in the last 48 hours (UI hint).
  bool get looksActiveRecently {
    final t = lastActivityAt;
    if (t == null) return false;
    return DateTime.now().difference(t.toDate()).inHours < 48;
  }

  static FsGroup? fromDoc(String id, Map<String, dynamic> d) {
    final name = d['Name'] as String? ?? d['name'] as String? ?? 'Group';
    final status = d['Status'] as String? ?? 'Open';
    final members = List<String>.from(d['GroupMembers'] as List? ?? const []);
    final pending = List<String>.from(d['PendingMembers'] as List? ?? const []);
    final isFeatured = d['isFeatured'] == true;
    final fr = d['featuredRank'];
    final visRaw = (d['visibility'] as String?)?.toLowerCase().trim();
    final visibility = visRaw == 'private' ? 'private' : 'public';
    return FsGroup(
      id: id,
      name: name,
      status: status,
      description: d['Description'] as String? ?? d['description'] as String?,
      category: d['Category'] as String? ?? d['category'] as String?,
      imageUrl: d['image'] as String? ?? d['ImageUrl'] as String? ?? d['imageUrl'] as String?,
      memberIds: members,
      pendingIds: pending,
      created: d['Created'] as Timestamp?,
      isFeatured: isFeatured,
      featuredRank: fr is int ? fr : (fr is num ? fr.toInt() : 0),
      rulesText: d['rulesText'] as String? ?? d['RulesText'] as String?,
      lastActivitySnippet: d['lastActivitySnippet'] as String?,
      lastActivityAt: d['lastActivityAt'] as Timestamp?,
      threadCount: _intOrNull(d['threadCount']),
      memberCountDenorm: _intOrNull(d['memberCount']),
      createdBy: d['createdBy'] as String?,
      visibility: visibility,
    );
  }
}

int? _intOrNull(dynamic v) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  return null;
}

/// `Groups/{groupId}/threads/{threadId}`
class FsGroupThread {
  FsGroupThread({
    required this.id,
    this.title,
    required this.body,
    required this.authorId,
    required this.authorName,
    this.authorRole,
    required this.createdAt,
    this.score = 0,
    this.helpfulScore = 0,
    this.replyCount = 0,
  });

  final String id;
  final String? title;
  final String body;
  final String authorId;
  final String authorName;
  final String? authorRole;
  final Timestamp? createdAt;
  final int score;
  final int helpfulScore;
  final int replyCount;

  String get timeLabel => formatRelativeTime(createdAt?.toDate());

  String get initials {
    final p = authorName.trim().split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
    if (p.isEmpty) return '?';
    if (p.length == 1) return p[0].substring(0, p[0].length.clamp(0, 2)).toUpperCase();
    return '${p[0][0]}${p[1][0]}'.toUpperCase();
  }

  static FsGroupThread? fromDoc(String id, Map<String, dynamic> d) {
    final body = d['body'] as String? ?? '';
    if (body.isEmpty) return null;
    return FsGroupThread(
      id: id,
      title: d['title'] as String?,
      body: body,
      authorId: d['author_id'] as String? ?? '',
      authorName: (d['author_name'] as String?)?.trim().isNotEmpty == true
          ? (d['author_name'] as String).trim()
          : 'Member',
      authorRole: d['author_role'] as String?,
      createdAt: d['created_at'] as Timestamp?,
      score: _intOrNull(d['score']) ?? 0,
      helpfulScore: _intOrNull(d['helpful_score']) ?? 0,
      replyCount: _intOrNull(d['reply_count']) ?? 0,
    );
  }
}

/// `Groups/{groupId}/threads/{threadId}/comments/{commentId}`
class FsGroupComment {
  FsGroupComment({
    required this.id,
    required this.body,
    required this.authorId,
    required this.authorName,
    this.parentCommentId,
    required this.createdAt,
    this.score = 0,
  });

  final String id;
  final String body;
  final String authorId;
  final String authorName;
  final String? parentCommentId;
  final Timestamp? createdAt;
  final int score;

  String get timeLabel => formatRelativeTime(createdAt?.toDate());

  String get initials {
    final p = authorName.trim().split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
    if (p.isEmpty) return '?';
    if (p.length == 1) return p[0].substring(0, p[0].length.clamp(0, 2)).toUpperCase();
    return '${p[0][0]}${p[1][0]}'.toUpperCase();
  }

  static FsGroupComment fromDoc(String id, Map<String, dynamic> d) {
    return FsGroupComment(
      id: id,
      body: d['body'] as String? ?? '',
      authorId: d['author_id'] as String? ?? '',
      authorName: (d['author_name'] as String?)?.trim().isNotEmpty == true
          ? (d['author_name'] as String).trim()
          : 'Member',
      parentCommentId: d['parent_comment_id'] as String?,
      createdAt: d['created_at'] as Timestamp?,
      score: _intOrNull(d['score']) ?? 0,
    );
  }
}

/// Build nested comment trees from a flat list (oldest first).
List<FsGroupComment> rootsOfComments(List<FsGroupComment> flat) {
  final byParent = <String?, List<FsGroupComment>>{};
  for (final c in flat) {
    byParent.putIfAbsent(c.parentCommentId, () => []).add(c);
  }
  return byParent[null] ?? [];
}

List<FsGroupComment> childrenOf(List<FsGroupComment> flat, String parentId) {
  return flat.where((c) => c.parentCommentId == parentId).toList();
}
