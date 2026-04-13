import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/mortar_info_post.dart';

/// Mortar-owned announcements: `mortar_info_posts`.
class MortarInfoRepository {
  MortarInfoRepository({FirebaseFirestore? firestore}) : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> get _col => _db.collection('mortar_info_posts');

  /// Published posts, newest first (requires composite index: `published` + `created_at`).
  Stream<List<MortarInfoPost>> watchPublishedPosts({int limit = 20}) {
    return _col
        .where('published', isEqualTo: true)
        .orderBy('created_at', descending: true)
        .limit(limit)
        .snapshots()
        .map((snap) => snap.docs.map((d) => MortarInfoPost.fromDoc(d.id, d.data())).toList());
  }

  Future<MortarInfoPost?> getPost(String postId) async {
    final doc = await _col.doc(postId).get();
    if (!doc.exists) return null;
    final p = MortarInfoPost.fromDoc(doc.id, doc.data()!);
    if (!p.published) return null;
    return p;
  }
}
