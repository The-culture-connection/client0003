import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../services/user_profile_repository.dart';
import '../models/conference_session.dart';
import '../models/session_message.dart';

/// Writes for session interactions: RSVP ("going"), personal save/bookmark, and
/// the per-session chat room. Reads that back the UI live via streams here or in
/// [ConferenceRepository] (watchSessions / watchSession).
class ConferenceSessionService {
  ConferenceSessionService({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
    UserProfileRepository? profiles,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance,
        _profiles = profiles ?? UserProfileRepository();

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;
  final UserProfileRepository _profiles;

  CollectionReference<Map<String, dynamic>> _sessions(String conferenceId) =>
      _db.collection('conferences').doc(conferenceId).collection('sessions');

  CollectionReference<Map<String, dynamic>> _savedCol(String uid) =>
      _db.collection('users').doc(uid).collection('saved_sessions');

  // --- Save / bookmark (per-user) ---

  /// Live set of saved sessionIds for the current user in [conferenceId].
  Stream<Set<String>> watchSavedSessionIds(String conferenceId) {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return Stream.value(const <String>{});
    return _savedCol(uid)
        .where('conferenceId', isEqualTo: conferenceId)
        .snapshots()
        .map((snap) => snap.docs.map((d) => d.id).toSet());
  }

  Future<void> setSaved({
    required String conferenceId,
    required ConferenceSession session,
    required bool saved,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Sign in to save sessions.');
    final ref = _savedCol(uid).doc(session.id);
    if (saved) {
      await ref.set({
        'conferenceId': conferenceId,
        'sessionId': session.id,
        'title': session.title,
        'savedAt': FieldValue.serverTimestamp(),
      });
    } else {
      await ref.delete();
    }
  }

  // --- RSVP ("going") — shared registered_users on the session doc ---

  Future<void> setRsvp({
    required String conferenceId,
    required String sessionId,
    required bool going,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Sign in to RSVP.');
    final ref = _sessions(conferenceId).doc(sessionId);
    await _db.runTransaction((tx) async {
      final snap = await tx.get(ref);
      if (!snap.exists) throw StateError('Session not found.');
      final data = snap.data()!;
      final list = (data['registered_users'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? <String>[];
      final capacity = (data['capacity'] as num?)?.toInt();
      if (going) {
        if (list.contains(uid)) return;
        if (capacity != null && capacity > 0 && list.length >= capacity) {
          throw StateError('This session is full.');
        }
        tx.update(ref, {
          'registered_users': FieldValue.arrayUnion([uid]),
          'updated_at': FieldValue.serverTimestamp(),
        });
      } else {
        if (!list.contains(uid)) return;
        tx.update(ref, {
          'registered_users': FieldValue.arrayRemove([uid]),
          'updated_at': FieldValue.serverTimestamp(),
        });
      }
    });
  }

  // --- Chat ---

  Stream<List<SessionMessage>> watchSessionMessages(String conferenceId, String sessionId) {
    return _sessions(conferenceId)
        .doc(sessionId)
        .collection('messages')
        .orderBy('created_at', descending: false)
        .limitToLast(300)
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => SessionMessage.fromDoc(d.id, d.data()))
            .whereType<SessionMessage>()
            .toList());
  }

  Future<void> sendSessionMessage({
    required String conferenceId,
    required String sessionId,
    required String text,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Sign in to chat.');
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;
    final authorName = await _profiles.getDisplayNameForUser(uid);
    await _sessions(conferenceId).doc(sessionId).collection('messages').add({
      'sender_id': uid,
      'author_name': authorName,
      'text': trimmed,
      'created_at': FieldValue.serverTimestamp(),
    });
  }
}
