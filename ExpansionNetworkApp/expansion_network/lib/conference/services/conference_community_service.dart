import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../services/user_profile_repository.dart';
import '../models/community_post.dart';

/// Community Hub — an open forum under `conferences/{id}/community_posts`,
/// where any attendee can post a message and reply to anyone else's.
class ConferenceCommunityService {
  ConferenceCommunityService({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
    UserProfileRepository? profiles,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance,
        _profiles = profiles ?? UserProfileRepository();

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;
  final UserProfileRepository _profiles;

  /// Matches the cap enforced in `firestore.rules`.
  static const int maxBodyLength = 5000;

  CollectionReference<Map<String, dynamic>> _posts(String conferenceId) =>
      _db.collection('conferences').doc(conferenceId).collection('community_posts');

  CollectionReference<Map<String, dynamic>> _replies(
    String conferenceId,
    String postId,
  ) =>
      _posts(conferenceId).doc(postId).collection('replies');

  /// Author name + byline, denormalised onto every post and reply so the feed
  /// renders from a single query instead of one profile read per row.
  Future<({String name, String? subtitle})> _identity(String uid) async {
    final name = await _profiles.getDisplayNameForUser(uid);
    try {
      final doc = await _profiles.getUserDoc(uid);
      final parts = <String>[
        for (final key in ['profession', 'industry'])
          if (doc?[key] is String && (doc![key] as String).trim().isNotEmpty)
            (doc[key] as String).trim(),
      ];
      return (name: name, subtitle: parts.isEmpty ? null : parts.join(' · '));
    } catch (_) {
      // A byline is cosmetic — never block posting on it.
      return (name: name, subtitle: null);
    }
  }

  // --- Posts ---

  /// A single post, for the detail screen. Emits null once it is deleted.
  Stream<CommunityPost?> watchPost(String conferenceId, String postId) {
    return _posts(conferenceId)
        .doc(postId)
        .snapshots()
        .map((d) => d.exists ? CommunityPost.fromDoc(d.id, d.data()) : null);
  }

  /// Newest first.
  Stream<List<CommunityPost>> watchPosts(String conferenceId, {int limit = 100}) {
    return _posts(conferenceId)
        .orderBy('created_at', descending: true)
        .limit(limit)
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => CommunityPost.fromDoc(d.id, d.data()))
            .whereType<CommunityPost>()
            .toList());
  }

  Future<void> createPost({
    required String conferenceId,
    required String body,
    String? tag,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Sign in to post.');
    final trimmed = body.trim();
    if (trimmed.isEmpty) return;
    if (trimmed.length > maxBodyLength) {
      throw StateError('That message is too long (max $maxBodyLength characters).');
    }
    // Surfaces a suspension as a clear message here rather than as an opaque
    // permission-denied from the rules.
    await _profiles.assertCallerNotContentSuspended();
    final identity = await _identity(uid);
    final normalizedTag = normalizeCommunityTag(tag);

    await _posts(conferenceId).add({
      'author_id': uid,
      'author_name': identity.name,
      if (identity.subtitle != null) 'author_subtitle': identity.subtitle,
      'body': trimmed,
      if (normalizedTag != null) 'tag': normalizedTag,
      'reply_count': 0,
      'created_at': FieldValue.serverTimestamp(),
    });
  }

  /// Removes the post and every reply under it.
  ///
  /// Firestore does not cascade subcollection deletes, so the replies are
  /// cleared explicitly — otherwise they would linger as orphans and keep
  /// counting against the collection.
  Future<void> deletePost({
    required String conferenceId,
    required String postId,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Sign in to delete.');
    final postRef = _posts(conferenceId).doc(postId);
    final snap = await postRef.get();
    if (!snap.exists) return;
    if (snap.data()?['author_id'] != uid) {
      throw StateError('Only the author can delete this message.');
    }

    final replies = await _replies(conferenceId, postId).get();
    // Batches cap at 500 writes; chunk so a busy thread cannot exceed it.
    const chunk = 400;
    for (var i = 0; i < replies.docs.length; i += chunk) {
      final batch = _db.batch();
      for (final d in replies.docs.skip(i).take(chunk)) {
        batch.delete(d.reference);
      }
      await batch.commit();
    }
    await postRef.delete();
  }

  // --- Replies ---

  /// Oldest first, so a thread reads top to bottom.
  Stream<List<CommunityReply>> watchReplies(String conferenceId, String postId) {
    return _replies(conferenceId, postId)
        .orderBy('created_at', descending: false)
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => CommunityReply.fromDoc(d.id, d.data()))
            .whereType<CommunityReply>()
            .toList());
  }

  Future<void> addReply({
    required String conferenceId,
    required String postId,
    required String body,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Sign in to reply.');
    final trimmed = body.trim();
    if (trimmed.isEmpty) return;
    if (trimmed.length > maxBodyLength) {
      throw StateError('That reply is too long (max $maxBodyLength characters).');
    }
    await _profiles.assertCallerNotContentSuspended();
    final identity = await _identity(uid);

    final postRef = _posts(conferenceId).doc(postId);
    final replyRef = _replies(conferenceId, postId).doc();

    // Reply and counter move together so the feed's "N replies" cannot drift.
    final batch = _db.batch();
    batch.set(replyRef, {
      'author_id': uid,
      'author_name': identity.name,
      if (identity.subtitle != null) 'author_subtitle': identity.subtitle,
      'body': trimmed,
      'created_at': FieldValue.serverTimestamp(),
    });
    batch.update(postRef, {'reply_count': FieldValue.increment(1)});
    await batch.commit();
  }

  Future<void> deleteReply({
    required String conferenceId,
    required String postId,
    required String replyId,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Sign in to delete.');
    final replyRef = _replies(conferenceId, postId).doc(replyId);
    final snap = await replyRef.get();
    if (!snap.exists) return;
    if (snap.data()?['author_id'] != uid) {
      throw StateError('Only the author can delete this reply.');
    }

    final batch = _db.batch();
    batch.delete(replyRef);
    batch.update(_posts(conferenceId).doc(postId), {
      'reply_count': FieldValue.increment(-1),
    });
    await batch.commit();
  }
}
