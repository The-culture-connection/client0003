import 'package:cloud_firestore/cloud_firestore.dart';

/// `conferences/{conferenceId}`.
class Conference {
  const Conference({
    required this.id,
    required this.name,
    required this.description,
    required this.status,
    this.startDate,
    this.endDate,
    this.expiresAt,
    this.timezone,
    this.location,
    this.heroImageUrl,
    this.heroSponsorName,
    this.heroSponsorLogoUrl,
    this.mapImageUrl,
    this.attendeeCount = 0,
  });

  final String id;
  final String name;
  final String description;
  final String status; // 'draft' | 'active' | 'closed'
  final DateTime? startDate;
  final DateTime? endDate;
  final DateTime? expiresAt;
  final String? timezone;
  final String? location;
  final String? heroImageUrl;
  final String? heroSponsorName;
  final String? heroSponsorLogoUrl;
  final String? mapImageUrl;
  final int attendeeCount;

  bool get isClosed {
    if (status == 'closed') return true;
    final exp = expiresAt;
    return exp != null && exp.isBefore(DateTime.now());
  }

  static Conference? fromDoc(String id, Map<String, dynamic>? data) {
    if (data == null) return null;
    final heroSponsor = data['heroSponsor'] as Map<String, dynamic>?;
    return Conference(
      id: id,
      name: data['name'] as String? ?? 'Untitled Conference',
      description: data['description'] as String? ?? '',
      status: data['status'] as String? ?? 'draft',
      startDate: _toDate(data['startDate']),
      endDate: _toDate(data['endDate']),
      expiresAt: _toDate(data['expiresAt']),
      timezone: data['timezone'] as String?,
      location: data['location'] as String?,
      heroImageUrl: data['heroImageUrl'] as String?,
      heroSponsorName: heroSponsor?['name'] as String?,
      heroSponsorLogoUrl: heroSponsor?['logoUrl'] as String?,
      mapImageUrl: data['mapImageUrl'] as String?,
      attendeeCount: (data['attendeeCount'] as num?)?.toInt() ?? 0,
    );
  }

  static DateTime? _toDate(Object? value) {
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    return null;
  }
}
