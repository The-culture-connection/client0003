import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../models/feed_post.dart';
import 'user_profile_repository.dart';

/// Community feed posts: `feed_posts/{postId}` with `likes` and `replies` subcollections.
class FeedPostsRepository {
  FeedPostsRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
    UserProfileRepository? users,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance,
        _users = users ?? UserProfileRepository();

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;
  final UserProfileRepository _users;

  CollectionReference<Map<String, dynamic>> get _posts =>
      _db.collection('feed_posts');

  Stream<List<FeedPost>> watchPosts({int limit = 50}) {
    return _posts
        .orderBy('created_at', descending: true)
        .limit(limit)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((d) => FeedPost.fromDoc(d.id, d.data()))
              .toList(),
        );
  }

  Future<FeedPost?> getPost(String postId) async {
    final doc = await _posts.doc(postId).get();
    if (!doc.exists) return null;
    return FeedPost.fromDoc(doc.id, doc.data()!);
  }

  Future<String> createPost({
    required String postCategory,
    required String postTitle,
    required String postDetails,
    required String authorName,
    String? imageUrl,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    await _users.assertCallerNotContentSuspended();

    final data = <String, dynamic>{
      'post_category': postCategory.trim(),
      'post_title': postTitle.trim(),
      'post_details': postDetails.trim(),
      'author_id': uid,
      'author_name': authorName.trim(),
      'created_at': FieldValue.serverTimestamp(),
      'updated_at': FieldValue.serverTimestamp(),
    };
    final img = imageUrl?.trim();
    if (img != null && img.isNotEmpty) {
      data['image_url'] = img;
    }

    final ref = await _posts.add(data);
    return ref.id;
  }

  Future<void> deletePost(String postId) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    final doc = await _posts.doc(postId).get();
    if (!doc.exists) return;
    final author = doc.data()?['author_id'];
    if (author != uid) throw StateError('Only the author can delete this post');
    await _posts.doc(postId).delete();
  }

  /// Whether the current user has liked the post (`feed_posts/{id}/likes/{uid}`).
  Stream<bool> watchPostLikedByMe(String postId) {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return Stream.value(false);
    return _posts.doc(postId).collection('likes').doc(uid).snapshots().map((s) => s.exists);
  }

  Stream<int> watchPostLikeCount(String postId) {
    return _posts.doc(postId).collection('likes').snapshots().map((s) => s.docs.length);
  }

  Future<void> togglePostLike(String postId) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    final likeRef = _posts.doc(postId).collection('likes').doc(uid);
    await _db.runTransaction((tx) async {
      final snap = await tx.get(likeRef);
      if (snap.exists) {
        tx.delete(likeRef);
      } else {
        tx.set(likeRef, {
          'created_at': FieldValue.serverTimestamp(),
        });
      }
    });
  }

  Stream<List<FeedPostReply>> watchReplies(String postId) {
    return _posts
        .doc(postId)
        .collection('replies')
        .orderBy('created_at', descending: false)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((d) => FeedPostReply.fromDoc(d.id, d.data()))
              .toList(),
        );
  }

  Stream<int> watchReplyCount(String postId) {
    return _posts.doc(postId).collection('replies').snapshots().map((s) => s.docs.length);
  }

  Future<void> addReply(
    String postId,
    String body, {
    String? parentReplyId,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    await _users.assertCallerNotContentSuspended();
    final authorName = await _users.getDisplayNameForUser(uid);

    final data = <String, dynamic>{
      'author_id': uid,
      'author_name': authorName,
      'body': body.trim(),
      'created_at': FieldValue.serverTimestamp(),
    };
    final p = parentReplyId?.trim();
    if (p != null && p.isNotEmpty) {
      data['parent_reply_id'] = p;
    }
    await _posts.doc(postId).collection('replies').add(data);
  }

  Stream<bool> watchReplyLikedByMe(String postId, String replyId) {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return Stream.value(false);
    return _posts
        .doc(postId)
        .collection('replies')
        .doc(replyId)
        .collection('likes')
        .doc(uid)
        .snapshots()
        .map((s) => s.exists);
  }

  Stream<int> watchReplyLikeCount(String postId, String replyId) {
    return _posts
        .doc(postId)
        .collection('replies')
        .doc(replyId)
        .collection('likes')
        .snapshots()
        .map((s) => s.docs.length);
  }

  Future<void> toggleReplyLike(String postId, String replyId) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    final likeRef = _posts
        .doc(postId)
        .collection('replies')
        .doc(replyId)
        .collection('likes')
        .doc(uid);
    await _db.runTransaction((tx) async {
      final snap = await tx.get(likeRef);
      if (snap.exists) {
        tx.delete(likeRef);
      } else {
        tx.set(likeRef, {'created_at': FieldValue.serverTimestamp()});
      }
    });
  }
}
