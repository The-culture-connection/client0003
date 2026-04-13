import 'package:cloud_firestore/cloud_firestore.dart';

/// `events_mobile/{eventId}` (Expansion) — same fields as curriculum `events` where applicable.
/// [approvalStatus] null or missing in Firestore means published (legacy curriculum events).
class CommunityEvent {
  const CommunityEvent({
    required this.id,
    required this.title,
    this.date,
    required this.time,
    required this.location,
    required this.details,
    this.eventType = 'In-person',
    this.imageUrl,
    this.registeredUsers = const [],
    this.totalSpots,
    this.availableSpots,
    this.createdAt,
    this.updatedAt,
    this.approvalStatus,
    this.createdBy,
    this.rejectionReason,
    this.distribution,
  });

  final String id;
  final String title;
  final DateTime? date;
  final String time;
  final String location;
  final String details;
  final String eventType;
  final String? imageUrl;
  final List<String> registeredUsers;
  final int? totalSpots;
  final int? availableSpots;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  /// `pending` | `approved` | `rejected`, or null for legacy published events.
  final String? approvalStatus;
  final String? createdBy;
  final String? rejectionReason;
  /// `curriculum` | `mobile` | `both` on admin-created docs; omitted on member submissions.
  final String? distribution;

  bool get isPublished =>
      approvalStatus == null || approvalStatus == 'approved';

  /// Staff / admin portal → `events_mobile` with `distribution: mobile` or `both`.
  bool get isMortarHostedEvent {
    final d = distribution?.trim().toLowerCase();
    return d == 'mobile' || d == 'both';
  }

  /// Same as [isMortarHostedEvent] (kept for call sites that used this name).
  bool get isMortarEvent => isMortarHostedEvent;

  /// Member-submitted event with `created_by` — show poster row (not staff `distribution` posts).
  bool get showsMemberPoster =>
      !isMortarHostedEvent &&
      createdBy != null &&
      createdBy!.trim().isNotEmpty;

  bool isRegistered(String uid) => registeredUsers.contains(uid);

  int get registeredCount => registeredUsers.length;

  bool get isFull {
    final cap = totalSpots;
    if (cap == null || cap <= 0) return false;
    return registeredCount >= cap;
  }

  /// Short status for the submitter in the Expansion app (reviews happen in Digital Curriculum).
  String get memberSubmissionStatusLabel {
    if (isPublished) return 'Live on feed';
    switch (approvalStatus) {
      case 'pending':
        return 'Submitted — under review';
      case 'rejected':
        return 'Not published';
      default:
        return 'Not published';
    }
  }

  static CommunityEvent fromDoc(String id, Map<String, dynamic> data) {
    final ru = data['registered_users'];
    List<String> users = [];
    if (ru is List) {
      users = ru.whereType<String>().toList();
    }
    return CommunityEvent(
      id: id,
      title: _s(data['title']) ?? 'Event',
      date: _ts(data['date']),
      time: _s(data['time']) ?? '',
      location: _s(data['location']) ?? '',
      details: _s(data['details']) ?? '',
      eventType: _s(data['event_type']) ?? 'In-person',
      imageUrl: _s(data['image_url']),
      registeredUsers: users,
      totalSpots: _i(data['total_spots']),
      availableSpots: _i(data['available_spots']),
      createdAt: _ts(data['created_at']),
      updatedAt: _ts(data['updated_at']),
      approvalStatus: _s(data['approval_status']),
      createdBy: _s(data['created_by']),
      rejectionReason: _s(data['rejection_reason']),
      distribution: _s(data['distribution']),
    );
  }

  static String? _s(dynamic v) => v is String ? v : null;

  static int? _i(dynamic v) {
    if (v is int) return v;
    if (v is num) return v.round();
    return null;
  }

  static DateTime? _ts(dynamic v) {
    if (v is Timestamp) return v.toDate();
    return null;
  }
}
