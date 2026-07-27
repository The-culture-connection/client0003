import 'package:cloud_firestore/cloud_firestore.dart';

/// `conferences/{id}/sessions/{sessionId}/messages/{msgId}` — one chat message.
class SessionMessage {
  const SessionMessage({
    required this.id,
    required this.senderId,
    required this.authorName,
    required this.text,
    this.createdAt,
  });

  final String id;
  final String senderId;
  final String authorName;
  final String text;
  final DateTime? createdAt;

  static SessionMessage? fromDoc(String id, Map<String, dynamic>? data) {
    if (data == null) return null;
    final sender = data['sender_id'];
    final text = data['text'];
    if (sender is! String || text is! String) return null;
    final created = data['created_at'];
    return SessionMessage(
      id: id,
      senderId: sender,
      authorName: (data['author_name'] as String?)?.trim().isNotEmpty == true
          ? data['author_name'] as String
          : 'Member',
      text: text,
      createdAt: created is Timestamp ? created.toDate() : null,
    );
  }
}
