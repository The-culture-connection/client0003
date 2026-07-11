/// `conferences/{conferenceId}/sponsors/{sponsorId}`.
class ConferenceSponsor {
  const ConferenceSponsor({
    required this.id,
    required this.companyName,
    required this.packageLevel,
    required this.description,
    required this.perks,
    this.ctaLabel,
    this.ctaUrl,
    this.booth,
    this.giveawayPrize,
    this.giveawayInstructions,
    this.contactInfo,
    this.logoUrl,
    this.mapFloorId,
    this.mapRoomId,
  });

  final String id;
  final String companyName;

  /// Free-text package/sponsorship tier, e.g. "Platinum", "Gold", "Community".
  final String packageLevel;
  final String description;
  final List<String> perks;

  /// Call-to-action button label + link (e.g. "Visit site").
  final String? ctaLabel;
  final String? ctaUrl;

  final String? booth;
  final String? giveawayPrize;

  /// What a user must do to enter the giveaway.
  final String? giveawayInstructions;
  final String? contactInfo;
  final String? logoUrl;

  /// Optional link to a venue-map room pin.
  final String? mapFloorId;
  final String? mapRoomId;

  bool get hasGiveaway => (giveawayPrize?.trim().isNotEmpty ?? false);

  String get initials {
    final parts = companyName.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) {
      return parts.first.substring(0, parts.first.length >= 2 ? 2 : 1).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  static ConferenceSponsor? fromDoc(String id, Map<String, dynamic>? data) {
    if (data == null) return null;
    return ConferenceSponsor(
      id: id,
      companyName: data['companyName'] as String? ?? 'Sponsor',
      packageLevel: data['packageLevel'] as String? ?? '',
      description: data['description'] as String? ?? '',
      perks: (data['perks'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      ctaLabel: data['ctaLabel'] as String?,
      ctaUrl: data['ctaUrl'] as String?,
      booth: data['booth'] as String?,
      giveawayPrize: data['giveawayPrize'] as String?,
      giveawayInstructions: data['giveawayInstructions'] as String?,
      contactInfo: data['contactInfo'] as String?,
      logoUrl: data['logoUrl'] as String?,
      mapFloorId: data['mapFloorId'] as String?,
      mapRoomId: data['mapRoomId'] as String?,
    );
  }
}
