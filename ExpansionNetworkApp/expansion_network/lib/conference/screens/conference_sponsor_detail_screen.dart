import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../conference_analytics.dart';
import '../../utils/safe_launch_url.dart';
import '../current_conference_holder.dart';
import '../models/conference_sponsor.dart';
import '../services/conference_repository.dart';
import '../theme/conference_colors.dart';
import '../widgets/booth_scan_fab.dart';
import '../../theme/cosmic_content.dart';

/// Sponsor detail — full profile for one booth, with the sponsor's logo shown
/// at 50% opacity as a background watermark.
class ConferenceSponsorDetailScreen extends StatefulWidget {
  const ConferenceSponsorDetailScreen({required this.sponsorId, super.key});

  final String sponsorId;

  @override
  State<ConferenceSponsorDetailScreen> createState() => _ConferenceSponsorDetailScreenState();
}

class _ConferenceSponsorDetailScreenState extends State<ConferenceSponsorDetailScreen> {
  final ConferenceRepository _repo = ConferenceRepository();
  late final Future<ConferenceSponsor?> _future;

  @override
  void initState() {
    super.initState();
    logConferenceEvent(
      () => ConferenceAnalytics.sponsorViewed(sponsorId: widget.sponsorId),
    );
    final cid = CurrentConferenceHolder.instance.conferenceId;
    _future = cid == null ? Future.value(null) : _repo.fetchSponsor(cid, widget.sponsorId);
  }

  Color _tierColor(String level) {
    switch (level.trim().toLowerCase()) {
      case 'platinum':
        return const Color(0xFFC1442A);
      case 'gold':
        return const Color(0xFFF59E0B);
      case 'silver':
        return const Color(0xFF9CA3AF);
      case 'bronze':
        return const Color(0xFFB45309);
      default:
        return ConferenceColors.gold;
    }
  }

  Future<void> _openUrl(String? url) async {
    final raw = url?.trim();
    if (raw == null || raw.isEmpty) return;
    final uri = Uri.tryParse(raw.startsWith('http') ? raw : 'https://$raw');
    if (uri == null) return;
    await safeLaunchExternalUrl(uri, messengerContext: context, userFailureMessage: 'Could not open link');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: ConferenceColors.gold,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.canPop() ? context.pop() : context.go('/conference/sponsors'),
        ),
      ),
      floatingActionButton: const BoothScanFab(),
      body: FutureBuilder<ConferenceSponsor?>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: ConferenceColors.gold));
          }
          final s = snapshot.data;
          if (s == null) {
            return const Center(
              child: Text('Sponsor not found.', style: TextStyle(color: ConferenceColors.mutedForeground)),
            );
          }
          return _buildBody(s);
        },
      ),
    );
  }

  Widget _buildBody(ConferenceSponsor s) {
    final tierColor = _tierColor(s.packageLevel);
    final hasLogo = s.logoUrl != null && s.logoUrl!.isNotEmpty;

    return Stack(
      children: [
        // 50%-transparent logo watermark on the background.
        if (hasLogo)
          Positioned.fill(
            child: IgnorePointer(
              child: Center(
                child: FractionallySizedBox(
                  widthFactor: 0.95,
                  heightFactor: 0.7,
                  child: Opacity(
                    opacity: 0.5,
                    child: Image.network(s.logoUrl!, fit: BoxFit.contain, errorBuilder: (_, __, ___) => const SizedBox()),
                  ),
                ),
              ),
            ),
          ),
        // Scrim for legibility over the watermark.
        Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.black.withValues(alpha: 0.35), Colors.black.withValues(alpha: 0.72)],
                ),
              ),
            ),
          ),
        ),
        SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      clipBehavior: Clip.antiAlias,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: tierColor.withValues(alpha: 0.2),
                        borderRadius: Cosmic.chipRadius,
                        border: Border.all(color: tierColor, width: 2),
                      ),
                      child: hasLogo
                          ? Image.network(s.logoUrl!, width: 64, height: 64, fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => _initials(s))
                          : _initials(s),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(s.companyName,
                              style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                          if (s.packageLevel.trim().isNotEmpty) ...[
                            const SizedBox(height: 6),
                            _tierBadge(s.packageLevel, tierColor),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                if (s.booth != null && s.booth!.trim().isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Icon(Icons.bolt_rounded, size: 16, color: tierColor),
                      const SizedBox(width: 6),
                      Text(s.booth!, style: const TextStyle(color: ConferenceColors.mutedForeground)),
                    ],
                  ),
                ],
                if (s.description.trim().isNotEmpty) ...[
                  const SizedBox(height: 18),
                  Text(s.description, style: const TextStyle(color: Colors.white, height: 1.5)),
                ],
                if (s.perks.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  _sectionLabel('PERKS'),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final perk in s.perks)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.1),
                            borderRadius: Cosmic.chipRadius,
                            border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                          ),
                          child: Text(perk, style: const TextStyle(color: Colors.white, fontSize: 12)),
                        ),
                    ],
                  ),
                ],
                if (s.hasGiveaway) ...[
                  const SizedBox(height: 20),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
                      borderRadius: Cosmic.chipRadius,
                      border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.card_giftcard_rounded, size: 18, color: Color(0xFFF59E0B)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(s.giveawayPrize ?? 'Giveaway',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
                            ),
                          ],
                        ),
                        if (s.giveawayInstructions != null && s.giveawayInstructions!.trim().isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text('How to enter: ${s.giveawayInstructions!}',
                              style: TextStyle(color: Cosmic.textMuted, fontSize: 13, height: 1.4)),
                        ],
                      ],
                    ),
                  ),
                ],
                if (s.contactInfo != null && s.contactInfo!.trim().isNotEmpty) ...[
                  const SizedBox(height: 20),
                  _sectionLabel('CONTACT'),
                  const SizedBox(height: 6),
                  Text(s.contactInfo!, style: const TextStyle(color: Colors.white)),
                ],
                const SizedBox(height: 28),
                if (s.ctaUrl != null && s.ctaUrl!.trim().isNotEmpty)
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: ConferenceColors.gold,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
                      ),
                      onPressed: () => _openUrl(s.ctaUrl),
                      icon: const Icon(Icons.open_in_new_rounded, size: 18),
                      label: Text(
                        (s.ctaLabel?.trim().isNotEmpty ?? false) ? s.ctaLabel!.toUpperCase() : 'VISIT SITE',
                        style: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.5),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _initials(ConferenceSponsor s) =>
      Text(s.initials, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800));

  Widget _sectionLabel(String text) => Text(text,
      style: TextStyle(color: Cosmic.textMuted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8));

  Widget _tierBadge(String level, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: Cosmic.chipRadius,
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.workspace_premium_rounded, size: 12, color: color),
          const SizedBox(width: 4),
          Text(level.toUpperCase(),
              style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
        ],
      ),
    );
  }
}
