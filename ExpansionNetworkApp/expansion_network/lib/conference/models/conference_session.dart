import 'package:cloud_firestore/cloud_firestore.dart';

/// `conferences/{conferenceId}/sessions/{sessionId}`.
class ConferenceSession {
  const ConferenceSession({
    required this.id,
    required this.title,
    required this.description,
    required this.speakerNames,
    this.startTime,
    this.endTime,
    this.roomLabel,
    this.capacity,
  });

  final String id;
  final String title;
  final String description;
  final List<String> speakerNames;
  final DateTime? startTime;
  final DateTime? endTime;
  final String? roomLabel;
  final int? capacity;

  static ConferenceSession? fromDoc(String id, Map<String, dynamic>? data) {
    if (data == null) return null;
    return ConferenceSession(
      id: id,
      title: data['title'] as String? ?? 'Untitled Session',
      description: data['description'] as String? ?? '',
      speakerNames: (data['speakerNames'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      startTime: _toDate(data['startTime']),
      endTime: _toDate(data['endTime']),
      roomLabel: data['roomLabel'] as String?,
      capacity: (data['capacity'] as num?)?.toInt(),
    );
  }

  static DateTime? _toDate(Object? value) {
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    return null;
  }
}
