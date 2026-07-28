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
    this.logoUrl,
    this.brandColor,
    this.brandColorSecondary,
    this.heroSponsorName,
    this.heroSponsorLogoUrl,
    this.mapImageUrl,
    this.attendeeCount = 0,
    this.checkInTotal = 0,
    this.priceCents = 0,
    this.currency = 'usd',
    this.activeFrom,
    this.activeUntil,
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
  /// Landscape key art shown behind the lobby header, under a scrim.
  final String? heroImageUrl;

  /// Square event mark; replaces the generic sparkle beside the name.
  final String? logoUrl;

  /// Hex (`#RRGGBB`) driving the ambient background wash. Controls stay
  /// [ConferenceColors.gold] regardless, so this may be dark or saturated.
  final String? brandColor;

  /// Second stop in the wash gradient. Falls back to [brandColor] when unset.
  final String? brandColorSecondary;

  final String? heroSponsorName;
  final String? heroSponsorLogoUrl;
  final String? mapImageUrl;
  final int attendeeCount;

  /// All-time cumulative check-ins across all days (server-maintained).
  final int checkInTotal;

  /// Ticket price in cents (0 = free). Charged via Stripe in a later phase.
  final int priceCents;
  final String currency;

  /// Active window: a ticket code only unlocks entry between these bounds.
  final DateTime? activeFrom;
  final DateTime? activeUntil;

  bool get isClosed {
    if (status == 'closed') return true;
    final exp = expiresAt;
    return exp != null && exp.isBefore(DateTime.now());
  }

  bool get isFree => priceCents <= 0;

  /// Whether the ticket-code window is currently open (mirrors the server
  /// check in `conferenceTickets.checkConferenceWindow`).
  bool get isTicketWindowOpen {
    if (status == 'closed') return false;
    final now = DateTime.now();
    if (activeFrom != null && now.isBefore(activeFrom!)) return false;
    if (activeUntil != null && now.isAfter(activeUntil!)) return false;
    return true;
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
      logoUrl: data['logoUrl'] as String?,
      brandColor: data['brandColor'] as String?,
      brandColorSecondary: data['brandColorSecondary'] as String?,
      heroSponsorName: heroSponsor?['name'] as String?,
      heroSponsorLogoUrl: heroSponsor?['logoUrl'] as String?,
      mapImageUrl: data['mapImageUrl'] as String?,
      attendeeCount: (data['attendeeCount'] as num?)?.toInt() ?? 0,
      checkInTotal: (data['checkInTotal'] as num?)?.toInt() ?? 0,
      priceCents: (data['priceCents'] as num?)?.toInt() ?? 0,
      currency: data['currency'] as String? ?? 'usd',
      activeFrom: _toDate(data['activeFrom']),
      activeUntil: _toDate(data['activeUntil']),
    );
  }

  static DateTime? _toDate(Object? value) {
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    return null;
  }
}
