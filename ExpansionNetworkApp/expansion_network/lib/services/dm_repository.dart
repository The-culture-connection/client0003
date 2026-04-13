import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../models/dm_message.dart';
import 'user_profile_repository.dart';

/// Deterministic id for a 1:1 thread between two UIDs (lexicographic order).
String dmThreadIdForUsers(String uidA, String uidB) {
  return uidA.compareTo(uidB) < 0 ? '${uidA}_$uidB' : '${uidB}_$uidA';
}

List<String> _sortedParticipants(String a, String b) {
  return a.compareTo(b) < 0 ? [a, b] : [b, a];
}

/// `dm_threads` + `messages` subcollection.
class DmRepository {
  DmRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
    UserProfileRepository? users,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance,
        _users = users ?? UserProfileRepository();

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;
  final UserProfileRepository _users;

  CollectionReference<Map<String, dynamic>> get _threads => _db.collection('dm_threads');

  Stream<List<DmMessage>> watchMessages(String threadId) {
    return _threads
        .doc(threadId)
        .collection('messages')
        .orderBy('created_at', descending: false)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((d) => DmMessage.fromDoc(d.id, d.data()))
              .whereType<DmMessage>()
              .toList(),
        );
  }

  /// Threads the current user participates in, newest activity first.
  Stream<List<DocumentSnapshot<Map<String, dynamic>>>> watchMyThreadDocs() {
    final uid = _auth.currentUser?.uid;
    if (uid == null) {
      return const Stream.empty();
    }
    return _threads
        .where('participant_ids', arrayContains: uid)
        .orderBy('updated_at', descending: true)
        .snapshots()
        .map((s) => s.docs);
  }

  Future<void> sendMessage({
    required String partnerUid,
    required String text,
    String? attachmentType,
    String? attachmentId,
  }) async {
    final me = _auth.currentUser?.uid;
    if (me == null) throw StateError('Not signed in');
    await _users.assertCallerNotContentSuspended();
    final threadId = dmThreadIdForUsers(me, partnerUid);
    final participants = _sortedParticipants(me, partnerUid);
    final threadRef = _threads.doc(threadId);
    final msgRef = threadRef.collection('messages').doc();
    final preview = text.length > 120 ? '${text.substring(0, 120)}…' : text;

    final existing = await threadRef.get();
    final batch = _db.batch();
    if (!existing.exists) {
      batch.set(threadRef, {
        'participant_ids': participants,
        'created_at': FieldValue.serverTimestamp(),
        'updated_at': FieldValue.serverTimestamp(),
        'last_preview': preview,
        'last_sender_id': me,
      });
    } else {
      batch.update(threadRef, {
        'updated_at': FieldValue.serverTimestamp(),
        'last_preview': preview,
        'last_sender_id': me,
      });
    }
    batch.set(msgRef, {
      'sender_id': me,
      'text': text,
      'created_at': FieldValue.serverTimestamp(),
      if (attachmentType != null && attachmentType.isNotEmpty) 'attachment_type': attachmentType,
      if (attachmentId != null && attachmentId.isNotEmpty) 'attachment_id': attachmentId,
    });
    await batch.commit();
  }
}
