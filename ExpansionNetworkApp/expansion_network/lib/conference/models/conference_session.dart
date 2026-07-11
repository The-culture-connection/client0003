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
    this.track,
    this.level,
    this.speakerTitle,
    this.speakerPhotoUrl,
    this.registeredCount,
    this.registeredUsers = const [],
  });

  final String id;
  final String title;
  final String description;
  final List<String> speakerNames;
  final DateTime? startTime;
  final DateTime? endTime;
  final String? roomLabel;
  final int? capacity;

  /// Optional presentation fields (shown when present) — e.g. "AI/ML",
  /// "Intermediate", the speaker's role, and how many have registered.
  final String? track;
  final String? level;
  final String? speakerTitle;
  final String? speakerPhotoUrl;
  final int? registeredCount;

  /// Uids who have RSVP'd ("going"). Client-toggled (see ConferenceSessionService).
  final List<String> registeredUsers;

  String? get primarySpeaker => speakerNames.isNotEmpty ? speakerNames.first : null;

  /// Live count of attendees going — prefers the RSVP array, falls back to the
  /// admin-set display count.
  int get goingCount => registeredUsers.isNotEmpty ? registeredUsers.length : (registeredCount ?? 0);

  bool isGoing(String? uid) => uid != null && registeredUsers.contains(uid);
  bool get isFull => capacity != null && capacity! > 0 && goingCount >= capacity!;

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
      track: data['track'] as String?,
      level: data['level'] as String?,
      speakerTitle: data['speakerTitle'] as String?,
      speakerPhotoUrl: data['speakerPhotoUrl'] as String?,
      registeredCount: (data['registeredCount'] as num?)?.toInt(),
      registeredUsers: (data['registered_users'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
    );
  }

  static DateTime? _toDate(Object? value) {
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    return null;
  }
}
