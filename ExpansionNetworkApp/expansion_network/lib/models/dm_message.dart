import 'package:cloud_firestore/cloud_firestore.dart';

/// `dm_threads/{threadId}/messages/{msgId}`.
class DmMessage {
  const DmMessage({
    required this.id,
    required this.senderId,
    required this.text,
    this.createdAt,
    this.attachmentType,
    this.attachmentId,
    this.reactions = const {},
  });

  final String id;
  final String senderId;
  final String text;
  final DateTime? createdAt;
  final String? attachmentType;
  final String? attachmentId;

  /// uid → emoji. One reaction per person; the rules let a participant write
  /// only their own key, so this can never carry someone else's edit.
  final Map<String, String> reactions;

  /// Emoji → how many people picked it, in first-seen order.
  Map<String, int> get reactionCounts {
    final counts = <String, int>{};
    for (final emoji in reactions.values) {
      counts[emoji] = (counts[emoji] ?? 0) + 1;
    }
    return counts;
  }

  String? reactionOf(String uid) => reactions[uid];

  static DmMessage? fromDoc(String id, Map<String, dynamic> d) {
    final sender = d['sender_id'];
    final text = d['text'];
    if (sender is! String || text is! String) return null;
    return DmMessage(
      id: id,
      senderId: sender,
      text: text,
      createdAt: _ts(d['created_at']),
      attachmentType: _s(d['attachment_type']),
      attachmentId: _s(d['attachment_id']),
      reactions: _reactions(d['reactions']),
    );
  }

  static Map<String, String> _reactions(dynamic v) {
    if (v is! Map) return const {};
    final out = <String, String>{};
    v.forEach((key, value) {
      if (key is String && value is String && value.isNotEmpty) out[key] = value;
    });
    return out;
  }

  static String? _s(dynamic v) => v is String ? v : null;

  static DateTime? _ts(dynamic v) {
    if (v is Timestamp) return v.toDate();
    return null;
  }
}
