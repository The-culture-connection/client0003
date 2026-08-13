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

  /// Emoji reactions keyed by reactor uid (`reactions: {uid: emoji}`).
  final Map<String, String> reactions;

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
    v.forEach((k, e) {
      if (k is String && e is String && e.isNotEmpty) out[k] = e;
    });
    return out;
  }

  static String? _s(dynamic v) => v is String ? v : null;

  static DateTime? _ts(dynamic v) {
    if (v is Timestamp) return v.toDate();
    return null;
  }
}
