import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../profile/profile_utils.dart';

/// Fields the profile editor manages, used to compute completeness.
///
/// Deliberately the same set a member can actually fill in from
/// `profile_edit_screen.dart` — a percentage that counts fields the user has no
/// way to set would never reach 100%.
const List<String> kProfileCompletenessFields = [
  'photo_url',
  'profession',
  'city',
  'state',
  'bio',
  'industry',
  'business_goals',
  'confident_skills',
];

/// Live counts behind the Mortarverse focus card and shop tiles.
///
/// Everything here is derived from data the app already stores. There is
/// **no** presence system, so no tile claims who is online. "Waiting"
/// conversations are threads where the other person spoke last and the user
/// has not opened the thread since (`last_read.<uid>` on the thread doc).
class MortarverseSignals {
  const MortarverseSignals({
    this.waitingConversations = 0,
    this.profileCompletion = 0,
    this.badgesEarned = 0,
  });

  /// Threads whose most recent message came from the other participant.
  final int waitingConversations;

  /// 0–100, across [kProfileCompletenessFields].
  final int profileCompletion;

  final int badgesEarned;

  bool get profileIncomplete => profileCompletion < 100;
}

/// Reads the signals above. Streams so the chooser updates live.
class MortarverseSignalsService {
  MortarverseSignalsService({FirebaseFirestore? firestore, FirebaseAuth? auth})
      : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  /// Conversations where the other person sent the last message **and** the
  /// user has not opened the thread since — returned as the partner uid of
  /// each waiting thread so the UI can also say *who* is waiting.
  ///
  /// Read state is `last_read.<uid>` on the thread doc, written by
  /// [DmRepository.markThreadRead] when the chat screen opens/closes. Threads
  /// opened before that field existed clear themselves the next time the user
  /// opens them. This fixes "says I have a message waiting but have opened
  /// them all" — the old logic counted every thread the other person spoke
  /// last in, read or not.
  Stream<List<String>> watchWaitingConversationPartners() {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return Stream.value(const []);
    return _db
        .collection('dm_threads')
        .where('participant_ids', arrayContains: uid)
        .snapshots()
        .map((snap) => snap.docs
            .where((d) {
              final data = d.data();
              final last = data['last_sender_id'];
              // A thread with no messages yet has no sender and isn't waiting.
              if (last is! String || last.isEmpty || last == uid) return false;
              final lastReadMap = data['last_read'];
              final lastRead = lastReadMap is Map ? lastReadMap[uid] : null;
              if (lastRead is Timestamp) {
                final updatedAt = data['updated_at'];
                // Only waiting when there is activity newer than the last
                // time the user opened the thread.
                return updatedAt is Timestamp && updatedAt.compareTo(lastRead) > 0;
              }
              // Never opened (or pre-read-state thread): waiting.
              return true;
            })
            .map((d) => _partnerUidFor(d.data(), uid))
            .whereType<String>()
            .toList());
  }

  static String? _partnerUidFor(Map<String, dynamic> data, String me) {
    final ids = data['participant_ids'];
    if (ids is! List) return null;
    for (final id in ids) {
      if (id is String && id.isNotEmpty && id != me) return id;
    }
    return null;
  }

  /// Count form of [watchWaitingConversationPartners].
  Stream<int> watchWaitingConversations() =>
      watchWaitingConversationPartners().map((l) => l.length);

  /// Profile completeness + earned badges, from the user doc.
  Stream<MortarverseSignals> watchProfileSignals() {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return Stream.value(const MortarverseSignals());
    return _db.collection('users').doc(uid).snapshots().map((snap) {
      final data = snap.data();
      if (data == null) return const MortarverseSignals();
      return MortarverseSignals(
        profileCompletion: profileCompletionPercent(data),
        badgesEarned: earnedBadgeCount(data),
      );
    });
  }
}

/// Percentage of [kProfileCompletenessFields] the user has filled in.
int profileCompletionPercent(Map<String, dynamic> data) {
  var filled = 0;
  for (final key in kProfileCompletenessFields) {
    final value = data[key];
    final present = value is List
        ? value.whereType<String>().any((s) => s.trim().isNotEmpty)
        : profileString(value) != null;
    if (present) filled++;
  }
  return ((filled / kProfileCompletenessFields.length) * 100).round();
}

int earnedBadgeCount(Map<String, dynamic> data) {
  final badges = data['badges'];
  if (badges is! Map) return 0;
  final earned = badges['earned'];
  if (earned is! List) return 0;
  return earned.whereType<String>().where((s) => s.trim().isNotEmpty).length;
}
