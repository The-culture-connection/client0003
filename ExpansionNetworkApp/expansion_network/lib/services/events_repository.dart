import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../models/community_event.dart';

/// Expansion app uses Firestore `events_mobile`. Curriculum web uses `events`.
/// Admin "both" writes the same [eventId] to both; RSVP updates both when [distribution] == `both`.
class EventsRepository {
  EventsRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  CollectionReference<Map<String, dynamic>> get _eventsMobile =>
      _db.collection('events_mobile');

  CollectionReference<Map<String, dynamic>> get _eventsCurriculum =>
      _db.collection('events');

  /// All documents in `events_mobile`.
  Stream<List<CommunityEvent>> watchEvents() {
    return _eventsMobile.snapshots().map((snap) {
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

  /// Feed and member lists: approved or legacy events only.
  Stream<List<CommunityEvent>> watchPublishedEvents() {
    return watchEvents().map((list) => list.where((e) => e.isPublished).toList());
  }

  /// Admin queue: user-submitted events awaiting review (`events_mobile` only).
  Stream<List<CommunityEvent>> watchPendingUserEvents() {
    return _eventsMobile.where('approval_status', isEqualTo: 'pending').snapshots().map(
          (snap) => snap.docs.map((d) => CommunityEvent.fromDoc(d.id, d.data())).toList(),
        );
  }

  /// Events this user created in `events_mobile` (any approval status).
  Stream<List<CommunityEvent>> watchEventsCreatedBy(String uid) {
    return _eventsMobile.where('created_by', isEqualTo: uid).snapshots().map(
          (snap) {
            final list = snap.docs.map((d) => CommunityEvent.fromDoc(d.id, d.data())).toList();
            list.sort((a, b) {
              final ca = a.createdAt;
              final cb = b.createdAt;
              if (ca == null && cb == null) return 0;
              if (ca == null) return 1;
              if (cb == null) return -1;
              return cb.compareTo(ca);
            });
            return list;
          },
        );
  }

  /// Alias for [watchEvents].
  Stream<List<CommunityEvent>> watchAllEvents() => watchEvents();

  Future<CommunityEvent?> getEvent(String eventId) async {
    final doc = await _eventsMobile.doc(eventId).get();
    if (!doc.exists) return null;
    return CommunityEvent.fromDoc(doc.id, doc.data()!);
  }

  /// Member-submitted event in `events_mobile`; staff publishes or declines in **Digital Curriculum**.
  Future<String> submitUserEventForApproval({
    required String title,
    DateTime? date,
    required String time,
    required String location,
    required String details,
    String eventType = 'In-person',
    String? imageUrl,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');

    final ref = _eventsMobile.doc();
    await ref.set({
      'title': title,
      if (date != null) 'date': Timestamp.fromDate(date),
      'time': time,
      'location': location,
      'details': details,
      'event_type': eventType,
      if (imageUrl != null && imageUrl.isNotEmpty) 'image_url': imageUrl,
      'registered_users': <String>[],
      'approval_status': 'pending',
      'created_by': uid,
      'created_at': FieldValue.serverTimestamp(),
      'updated_at': FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  /// Publish or reject a pending user event (`events_mobile`). Used by **Digital Curriculum**
  /// admin tools — not called from the Expansion app.
  Future<void> setEventApproval({
    required String eventId,
    required bool approve,
    String? rejectionReason,
  }) async {
    final ref = _eventsMobile.doc(eventId);
    await ref.update({
      'approval_status': approve ? 'approved' : 'rejected',
      if (!approve && rejectionReason != null && rejectionReason.isNotEmpty) 'rejection_reason': rejectionReason,
      if (approve) 'rejection_reason': FieldValue.delete(),
      'updated_at': FieldValue.serverTimestamp(),
    });
  }

  /// Register current user; when [distribution] is `both`, also updates `events/{eventId}`.
  Future<void> register(String eventId) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');

    await _db.runTransaction((tx) async {
      final mRef = _eventsMobile.doc(eventId);
      final mSnap = await tx.get(mRef);
      if (!mSnap.exists) throw StateError('Event not found');
      final data = mSnap.data()!;
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
      tx.update(mRef, update);

      final dist = data['distribution'] as String?;
      if (dist == 'both') {
        final eRef = _eventsCurriculum.doc(eventId);
        final eSnap = await tx.get(eRef);
        if (eSnap.exists) {
          tx.update(eRef, update);
        }
      }
    });
  }

  Future<void> unregister(String eventId) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');

    await _db.runTransaction((tx) async {
      final mRef = _eventsMobile.doc(eventId);
      final mSnap = await tx.get(mRef);
      if (!mSnap.exists) throw StateError('Event not found');
      final data = mSnap.data()!;
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
      tx.update(mRef, update);

      final dist = data['distribution'] as String?;
      if (dist == 'both') {
        final eRef = _eventsCurriculum.doc(eventId);
        final eSnap = await tx.get(eRef);
        if (eSnap.exists) {
          tx.update(eRef, update);
        }
      }
    });
  }

  static int? _i(dynamic v) {
    if (v is int) return v;
    if (v is num) return v.round();
    return null;
  }
}
