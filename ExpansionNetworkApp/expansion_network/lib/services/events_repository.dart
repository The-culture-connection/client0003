import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../models/community_event.dart';

/// Reads and updates `events` (digital curriculum schema).
class EventsRepository {
  EventsRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  CollectionReference<Map<String, dynamic>> get _events =>
      _db.collection('events');

  /// All documents in `events` (including those without a `date` field — `orderBy` would omit them).
  Stream<List<CommunityEvent>> watchEvents() {
    return _events.snapshots().map((snap) {
      final list = snap.docs.map((d) => CommunityEvent.fromDoc(d.id, d.data())).toList();
      list.sort((a, b) {
        final da = a.date;
        final db = b.date;
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da.compareTo(db);
      });
      return list;
    });
  }

  /// Alias for [watchEvents].
  Stream<List<CommunityEvent>> watchAllEvents() => watchEvents();

  Future<CommunityEvent?> getEvent(String eventId) async {
    final doc = await _events.doc(eventId).get();
    if (!doc.exists) return null;
    return CommunityEvent.fromDoc(doc.id, doc.data()!);
  }

  /// Register current user using `registered_users` array + optional [available_spots].
  Future<void> register(String eventId) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');

    await _db.runTransaction((tx) async {
      final ref = _events.doc(eventId);
      final snap = await tx.get(ref);
      if (!snap.exists) throw StateError('Event not found');
      final data = snap.data()!;
      final ru = (data['registered_users'] as List?)?.whereType<String>().toList() ?? [];
      if (ru.contains(uid)) return;

      final total = _i(data['total_spots']);
      if (total != null && total > 0 && ru.length >= total) {
        throw StateError('Event is full');
      }

      final update = <String, dynamic>{
        'registered_users': FieldValue.arrayUnion([uid]),
        'updated_at': FieldValue.serverTimestamp(),
      };
      if (total != null && total > 0) {
        update['available_spots'] = total - ru.length - 1;
      }
      tx.update(ref, update);
    });
  }

  Future<void> unregister(String eventId) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');

    await _db.runTransaction((tx) async {
      final ref = _events.doc(eventId);
      final snap = await tx.get(ref);
      if (!snap.exists) throw StateError('Event not found');
      final data = snap.data()!;
      final ru = (data['registered_users'] as List?)?.whereType<String>().toList() ?? [];
      if (!ru.contains(uid)) return;

      final total = _i(data['total_spots']);
      final update = <String, dynamic>{
        'registered_users': FieldValue.arrayRemove([uid]),
        'updated_at': FieldValue.serverTimestamp(),
      };
      if (total != null && total > 0) {
        update['available_spots'] = total - (ru.length - 1);
      }
      tx.update(ref, update);
    });
  }

  static int? _i(dynamic v) {
    if (v is int) return v;
    if (v is num) return v.round();
    return null;
  }
}
