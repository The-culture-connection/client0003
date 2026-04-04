import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../data/group_categories.dart';
import '../models/group_thread_firestore.dart';
import 'user_profile_repository.dart';

/// Firestore collection for Expansion app communities (curriculum web keeps using `Groups`).
const String kGroupsMobileCollection = 'groups_mobile';

/// Sort mode for `groups_mobile/{groupId}/threads` queries (indexes: single-field orderBy).
enum GroupThreadSort {
  newest,
  top,
  helpful,
}

/// Communities work like subreddits: each `groups_mobile/{id}` is a group; `threads` are posts (threads).
class GroupThreadRepository {
  GroupThreadRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
    UserProfileRepository? users,
    FirebaseFunctions? functions,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance,
        _users = users ?? UserProfileRepository(),
        _functions = functions ?? FirebaseFunctions.instanceFor(region: 'us-central1');

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;
  final UserProfileRepository _users;
  final FirebaseFunctions _functions;

  CollectionReference<Map<String, dynamic>> get _groups => _db.collection(kGroupsMobileCollection);

  CollectionReference<Map<String, dynamic>> _threads(String groupId) =>
      _groups.doc(groupId).collection('threads');

  CollectionReference<Map<String, dynamic>> _comments(String groupId, String threadId) =>
      _threads(groupId).doc(threadId).collection('comments');

  DocumentReference<Map<String, dynamic>> _threadVoteRef(
    String groupId,
    String threadId,
    String uid,
  ) =>
      _threads(groupId).doc(threadId).collection('votes').doc(uid);

  DocumentReference<Map<String, dynamic>> _commentVoteRef(
    String groupId,
    String threadId,
    String commentId,
    String uid,
  ) =>
      _comments(groupId, threadId).doc(commentId).collection('votes').doc(uid);

  /// All groups (same visibility as web: any signed-in user can browse).
  Stream<List<FsGroup>> watchGroups() {
    return _groups.snapshots().map(
          (snap) => snap.docs
              .map((d) => FsGroup.fromDoc(d.id, d.data()))
              .whereType<FsGroup>()
              .toList(),
        );
  }

  Stream<FsGroup?> watchGroup(String groupId) {
    return _groups.doc(groupId).snapshots().map((s) {
      if (!s.exists) return null;
      return FsGroup.fromDoc(s.id, s.data()!);
    });
  }

  Query<Map<String, dynamic>> _threadsQuery(String groupId, GroupThreadSort sort) {
    final col = _threads(groupId);
    switch (sort) {
      case GroupThreadSort.newest:
        return col.orderBy('created_at', descending: true);
      case GroupThreadSort.top:
        return col.orderBy('score', descending: true);
      case GroupThreadSort.helpful:
        return col.orderBy('helpful_score', descending: true);
    }
  }

  Stream<List<FsGroupThread>> watchThreads(
    String groupId, {
    GroupThreadSort sort = GroupThreadSort.newest,
    int limit = 100,
  }) {
    return _threadsQuery(groupId, sort)
        .limit(limit)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((d) => FsGroupThread.fromDoc(d.id, d.data()))
              .whereType<FsGroupThread>()
              .toList(),
        );
  }

  /// Paginated fetch for infinite scroll (pass [cursor] from previous page’s last snapshot).
  Future<GroupThreadPage> fetchThreadsPage({
    required String groupId,
    GroupThreadSort sort = GroupThreadSort.newest,
    int limit = 15,
    QueryDocumentSnapshot<Map<String, dynamic>>? cursor,
  }) async {
    Query<Map<String, dynamic>> q = _threadsQuery(groupId, sort).limit(limit);
    if (cursor != null) {
      q = q.startAfterDocument(cursor);
    }
    final snap = await q.get();
    final list = snap.docs
        .map((d) => FsGroupThread.fromDoc(d.id, d.data()))
        .whereType<FsGroupThread>()
        .toList();
    final last = snap.docs.isEmpty ? null : snap.docs.last;
    return GroupThreadPage(threads: list, lastDoc: last);
  }

  Stream<List<FsGroupComment>> watchComments(String groupId, String threadId) {
    return _comments(groupId, threadId)
        .orderBy('created_at', descending: false)
        .snapshots()
        .map(
          (snap) => snap.docs.map((d) => FsGroupComment.fromDoc(d.id, d.data())).toList(),
        );
  }

  /// Sum of vote values (+1 / -1) for thread score.
  Stream<int> watchThreadScore(String groupId, String threadId) {
    return _threads(groupId).doc(threadId).collection('votes').snapshots().map((s) {
      var sum = 0;
      for (final d in s.docs) {
        final v = d.data()['value'];
        if (v is int) sum += v;
      }
      return sum;
    });
  }

  /// Current user's vote: `1`, `-1`, or `null` if none.
  Stream<int?> watchMyThreadVote(String groupId, String threadId) {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return Stream.value(null);
    return _threadVoteRef(groupId, threadId, uid).snapshots().map((s) {
      if (!s.exists) return null;
      final v = s.data()?['value'];
      return v is int ? v : null;
    });
  }

  Stream<int> watchCommentScore(String groupId, String threadId, String commentId) {
    return _comments(groupId, threadId).doc(commentId).collection('votes').snapshots().map((s) {
      var sum = 0;
      for (final d in s.docs) {
        final v = d.data()['value'];
        if (v is int) sum += v;
      }
      return sum;
    });
  }

  Stream<int?> watchMyCommentVote(String groupId, String threadId, String commentId) {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return Stream.value(null);
    return _commentVoteRef(groupId, threadId, commentId, uid).snapshots().map((s) {
      if (!s.exists) return null;
      final v = s.data()?['value'];
      return v is int ? v : null;
    });
  }

  Future<void> setThreadVote(String groupId, String threadId, int direction) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    if (direction != 1 && direction != -1) throw ArgumentError('direction');
    final ref = _threadVoteRef(groupId, threadId, uid);
    await _db.runTransaction((tx) async {
      final cur = await tx.get(ref);
      final prev = cur.data()?['value'] as int?;
      if (prev == direction) {
        tx.delete(ref);
      } else {
        tx.set(ref, {
          'value': direction,
          'updated_at': FieldValue.serverTimestamp(),
        });
      }
    });
  }

  Future<void> setCommentVote(
    String groupId,
    String threadId,
    String commentId,
    int direction,
  ) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    if (direction != 1 && direction != -1) throw ArgumentError('direction');
    final ref = _commentVoteRef(groupId, threadId, commentId, uid);
    await _db.runTransaction((tx) async {
      final cur = await tx.get(ref);
      final prev = cur.data()?['value'] as int?;
      if (prev == direction) {
        tx.delete(ref);
      } else {
        tx.set(ref, {
          'value': direction,
          'updated_at': FieldValue.serverTimestamp(),
        });
      }
    });
  }

  /// Creates a new open community; caller becomes the only member and `createdBy`.
  Future<String> createGroup({
    required String name,
    String? description,
    String? rulesText,
    String? category,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    final trimmed = name.trim();
    if (trimmed.isEmpty) throw ArgumentError('Name required');
    if (trimmed.length > 120) throw ArgumentError('Name too long');
    final cat = category?.trim();
    if (cat != null && cat.isNotEmpty && !isAllowedGroupCategory(cat)) {
      throw ArgumentError('Invalid category');
    }
    final ref = await _groups.add({
      'Name': trimmed,
      'Status': 'Open',
      'Created': FieldValue.serverTimestamp(),
      'GroupMembers': <String>[uid],
      'PendingMembers': <String>[],
      'createdBy': uid,
      'memberCount': 1,
      'threadCount': 0,
      if (description != null && description.trim().isNotEmpty) 'description': description.trim(),
      if (rulesText != null && rulesText.trim().isNotEmpty) 'rulesText': rulesText.trim(),
      if (cat != null && cat.isNotEmpty) 'category': cat,
    });
    return ref.id;
  }

  /// Creator or staff (custom claims): metadata only — do not touch membership counters here.
  Future<void> updateGroupMetadata({
    required String groupId,
    required String name,
    String description = '',
    String category = '',
    String rulesText = '',
    String status = 'Open',
  }) async {
    if (_auth.currentUser == null) throw StateError('Not signed in');
    final trimmed = name.trim();
    if (trimmed.isEmpty) throw ArgumentError('Name required');
    if (trimmed.length > 120) throw ArgumentError('Name too long');
    final cat = category.trim();
    if (cat.isNotEmpty && !isAllowedGroupCategory(cat)) throw ArgumentError('Invalid category');
    if (status != 'Open' && status != 'Closed') throw ArgumentError('Invalid status');
    await _groups.doc(groupId).update({
      'Name': trimmed,
      'description': description.trim().isEmpty ? FieldValue.delete() : description.trim(),
      'category': cat.isEmpty ? FieldValue.delete() : cat,
      'rulesText': rulesText.trim().isEmpty ? FieldValue.delete() : rulesText.trim(),
      'Status': status,
    });
  }

  Future<void> deleteGroup(String groupId) async {
    if (_auth.currentUser == null) throw StateError('Not signed in');
    final callable = _functions.httpsCallable('deleteMobileGroup');
    await callable.call<Map<String, dynamic>>({'groupId': groupId});
  }

  Future<String> createThread({
    required String groupId,
    String? title,
    required String body,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    final name = await _users.getDisplayNameForUser(uid);
    final role = await _authorRoleHint(uid);
    final ref = await _threads(groupId).add({
      if (title != null && title.trim().isNotEmpty) 'title': title.trim(),
      'body': body.trim(),
      'author_id': uid,
      'author_name': name,
      if (role != null) 'author_role': role,
      'created_at': FieldValue.serverTimestamp(),
      'updated_at': FieldValue.serverTimestamp(),
      'score': 0,
      'helpful_score': 0,
      'reply_count': 0,
    });
    return ref.id;
  }

  Future<String> createComment({
    required String groupId,
    required String threadId,
    required String body,
    String? parentCommentId,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    final name = await _users.getDisplayNameForUser(uid);
    final ref = await _comments(groupId, threadId).add({
      'body': body.trim(),
      'author_id': uid,
      'author_name': name,
      if (parentCommentId != null && parentCommentId.isNotEmpty) 'parent_comment_id': parentCommentId,
      'created_at': FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  Future<String?> _authorRoleHint(String uid) async {
    final d = await _users.getUserDoc(uid);
    if (d == null) return null;
    final roles = d['roles'];
    if (roles is List && roles.isNotEmpty) {
      final r = roles.first;
      if (r is String) return r;
    }
    return null;
  }

  /// Join open group or request on closed (`Status != Open`) via [joinGroup] callable.
  Future<({bool success, bool pending})> joinGroup(String groupId) async {
    if (_auth.currentUser == null) throw StateError('Not signed in');
    final callable = _functions.httpsCallable('joinGroup');
    final res = await callable.call<Map<String, dynamic>>({
      'groupId': groupId,
      'scope': 'mobile',
    });
    final m = res.data;
    return (
      success: m['success'] == true,
      pending: m['pending'] == true,
    );
  }

  Future<void> leaveGroup(String groupId) async {
    if (_auth.currentUser == null) throw StateError('Not signed in');
    final callable = _functions.httpsCallable('leaveGroup');
    await callable.call<Map<String, dynamic>>({
      'groupId': groupId,
      'scope': 'mobile',
    });
  }
}

class GroupThreadPage {
  GroupThreadPage({required this.threads, required this.lastDoc});

  final List<FsGroupThread> threads;
  final QueryDocumentSnapshot<Map<String, dynamic>>? lastDoc;
}
