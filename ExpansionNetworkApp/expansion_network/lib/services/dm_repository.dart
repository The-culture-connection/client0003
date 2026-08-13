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

  /// Records that the current user has seen this thread now.
  ///
  /// Written as `last_read.<uid>` on the thread doc; the Mortarverse
  /// "conversations waiting" badge compares it against `updated_at` so an
  /// opened-but-unanswered thread stops counting as waiting.
  Future<void> markThreadRead({required String partnerUid}) async {
    final me = _auth.currentUser?.uid;
    if (me == null) return;
    final threadId = dmThreadIdForUsers(me, partnerUid);
    try {
      await _threads.doc(threadId).update({
        'last_read.$me': FieldValue.serverTimestamp(),
      });
    } catch (_) {
      // Best-effort: the thread may not exist yet (brand-new conversation),
      // and a read receipt is never worth surfacing an error for.
    }
  }

  /// Emoji a message can be reacted with — the picker's row, in order.
  static const List<String> reactionChoices = ['👍', '❤️', '😂', '🎉', '🙌', '😮', '😢'];

  /// Sets, replaces, or clears the current user's reaction on a message.
  ///
  /// Passing null (or the emoji already selected — the caller toggles) removes
  /// it. Written with dotted-path field updates so only this user's key is
  /// touched, matching what the security rules will accept: a whole-map `set`
  /// would look like an edit of the other participant's reaction and be denied.
  Future<void> setReaction({
    required String partnerUid,
    required String messageId,
    required String? emoji,
  }) async {
    final me = _auth.currentUser?.uid;
    if (me == null) throw StateError('Not signed in');
    final threadId = dmThreadIdForUsers(me, partnerUid);
    final ref = _threads.doc(threadId).collection('messages').doc(messageId);
    await ref.update({
      'reactions.$me': emoji ?? FieldValue.delete(),
    });
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
