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

  /// Whether a signed-in attendee may be inside this conference *right now*.
  ///
  /// Mirrors `conferenceTickets.checkConferenceWindow` on the server exactly,
  /// so the app never walks someone into a place the backend would reject.
  /// Holding a redeemed ticket is necessary but **not** sufficient: a ticket
  /// redeemed while the window was open must stop working once it shuts.
  bool get isOpenForEntry {
    if (status != 'active') return false;
    final now = DateTime.now();
    final exp = expiresAt;
    if (exp != null && exp.isBefore(now)) return false;
    final from = activeFrom;
    if (from != null && now.isBefore(from)) return false;
    final until = activeUntil;
    if (until != null && now.isAfter(until)) return false;
    return true;
  }

  /// Why entry was refused, for the message shown at the gate.
  String get entryBlockedReason {
    if (status == 'closed') return 'This conference has closed.';
    if (status != 'active') return 'This conference isn\'t open.';
    final now = DateTime.now();
    final exp = expiresAt;
    if (exp != null && exp.isBefore(now)) return 'This conference has ended.';
    final from = activeFrom;
    if (from != null && now.isBefore(from)) {
      return 'This conference hasn\'t opened yet.';
    }
    return 'This conference has ended.';
  }

  /// Whether code entry is over for good — the conference closed, or its
  /// active window has run out.
  ///
  /// Deliberately narrower than `!isTicketWindowOpen`: a conference whose
  /// `activeFrom` is still in the future is *not* stopped. You can buy or
  /// register for it today and redeem once it opens (the server's free
  /// registration only rejects `status == 'closed'`), so it belongs in the
  /// buy list rather than on the grey shelf.
  bool get isTicketCodeStopped {
    if (isClosed) return true;
    final until = activeUntil;
    return until != null && DateTime.now().isAfter(until);
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
