import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../conference_analytics.dart';
import '../../utils/safe_launch_url.dart';
import '../current_conference_holder.dart';
import '../models/conference_sponsor.dart';
import '../services/conference_repository.dart';
import '../theme/conference_colors.dart';
import '../widgets/booth_scan_fab.dart';
import '../widgets/conference_background.dart';
import '../widgets/conference_shell.dart';
import '../widgets/conference_tour.dart';
import '../../widgets/expansion_tour.dart';

/// Sponsor Hall — ports `Conference App Figma Mockup/src/app/pages/ConferenceSponsors.tsx`,
/// bound to the live `conferences/{id}/sponsors` collection. Package levels drive
/// the filter tabs and tier badges; giveaways and CTAs come from the sponsor doc.
class ConferenceSponsorsScreen extends StatefulWidget {
  const ConferenceSponsorsScreen({super.key, this.showBack = true});

  /// Standalone route → show a Back affordance. As a shell tab → hide it (and
  /// leave room at the bottom for the floating pill nav).
  final bool showBack;

  @override
  State<ConferenceSponsorsScreen> createState() => _ConferenceSponsorsScreenState();
}

const _amber = Color(0xFFF59E0B);

class _ConferenceSponsorsScreenState extends State<ConferenceSponsorsScreen> {
  final ConferenceRepository _repository = ConferenceRepository();
  String _filter = 'All'; // 'All' or a package level

  /// Spotlight target for the walkthrough's booth-scanning chapter.
  final GlobalKey _tourScanFab = GlobalKey();

  @override
  void initState() {
    super.initState();
    logConferenceEvent(ConferenceAnalytics.sponsorsViewed);
    _maybeRunTour();
  }

  Future<void> _maybeRunTour() async {
    if (!ConferenceTourRunner.instance.isRunning) return;
    await Future<void>.delayed(const Duration(milliseconds: 700));
    if (!mounted) return;
    ConferenceTourRunner.instance.runIfPending(
      context,
      ConferenceTourChapter.sponsors,
      () => [
        TourStep(
          key: _tourScanFab,
          title: 'Scan a booth',
          body: 'Each sponsor booth has a QR code. Scan it to record your visit '
              'and jump straight to what that sponsor is offering.',
        ),
      ],
    );
  }

  void _back() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/conference/lobby');
    }
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

  void _showInfoSheet(String title, String body) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: ConferenceColors.atmosphere,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: const TextStyle(color: ConferenceColors.gold, fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              Text(body, style: TextStyle(color: Colors.grey.shade300, fontSize: 14, height: 1.4)),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: ConferenceColors.gold,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                  ),
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Got it', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Sponsor Hall is a standalone route (outside the conference shell), so the
    // conference id comes from the ambient holder set on entry, not ConferenceScope.
    final conferenceId = CurrentConferenceHolder.instance.conferenceId;
    return Scaffold(
      backgroundColor: Colors.transparent,
      // As a shell tab (`showBack: false`) ConferenceShell's nav pill floats
      // over this screen's body, so the FAB has to clear it or it sits
      // underneath and cannot be tapped. Standalone, it needs no offset.
      floatingActionButton: widget.showBack
          ? BoothScanFab(key: _tourScanFab)
          : Padding(
              padding: EdgeInsets.only(
                bottom: ConferenceShell.navBarClearance(context),
              ),
              child: BoothScanFab(key: _tourScanFab),
            ),
      body: ConferenceGridBackground(
        child: SafeArea(
          child: conferenceId == null
              ? CustomScrollView(slivers: [
                  SliverToBoxAdapter(child: _buildHeader()),
                  SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.all(20), child: _emptyState())),
                ])
              : StreamBuilder<List<ConferenceSponsor>>(
            stream: _repository.watchSponsors(conferenceId),
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator(color: ConferenceColors.gold));
              }
              final sponsors = snapshot.data!;
              final levels = <String>{
                for (final s in sponsors)
                  if (s.packageLevel.trim().isNotEmpty) s.packageLevel.trim(),
              }.toList()
                ..sort();
              if (_filter != 'All' && !levels.contains(_filter)) _filter = 'All';

              final visible = _filter == 'All'
                  ? sponsors
                  : sponsors.where((s) => s.packageLevel.trim() == _filter).toList();
              final giveaways = sponsors.where((s) => s.hasGiveaway).toList();

              return CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(child: _buildHeader()),
                  if (levels.isNotEmpty) SliverToBoxAdapter(child: _buildTabs(levels)),
                  if (giveaways.isNotEmpty) SliverToBoxAdapter(child: _buildGiveaways(giveaways)),
                  SliverPadding(
                    padding: EdgeInsets.fromLTRB(
                        20, 0, 20, widget.showBack ? 32 : MediaQuery.of(context).viewPadding.bottom + 96),
                    sliver: sponsors.isEmpty
                        ? SliverToBoxAdapter(child: _emptyState())
                        : SliverList.list(children: [
                            const Padding(
                              padding: EdgeInsets.only(bottom: 12),
                              child: Text('VIRTUAL BOOTHS',
                                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                            ),
                            for (final s in visible) ...[
                              _buildSponsorCard(s),
                              const SizedBox(height: 16),
                            ],
                          ]),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _emptyState() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.zero,
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Text('No sponsors have been added yet — check back soon.',
          style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.showBack) ...[
            GestureDetector(
              onTap: _back,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.arrow_back, size: 18, color: Colors.grey.shade400),
                  const SizedBox(width: 6),
                  Text('Back', style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
                ],
              ),
            ),
            const SizedBox(height: 14),
          ],
          const Row(
            children: [
              Icon(Icons.business_center_rounded, size: 24, color: ConferenceColors.gold),
              SizedBox(width: 8),
              Text('SPONSOR HALL',
                  style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
            ],
          ),
          const SizedBox(height: 6),
          Text('Meet our amazing sponsors', style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildTabs(List<String> levels) {
    final tabs = ['All', ...levels];
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            for (final t in tabs) ...[
              GestureDetector(
                onTap: () => setState(() => _filter = t),
                child: Container(
                  margin: const EdgeInsets.only(right: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                  decoration: BoxDecoration(
                    color: _filter == t ? ConferenceColors.gold : Colors.white.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.zero,
                    border: Border.all(
                      color: _filter == t ? ConferenceColors.gold : Colors.white.withValues(alpha: 0.1),
                    ),
                  ),
                  child: Text(
                    t.toUpperCase(),
                    style: TextStyle(
                      color: _filter == t ? Colors.black : Colors.grey.shade400,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildGiveaways(List<ConferenceSponsor> giveaways) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.card_giftcard_rounded, size: 18, color: _amber),
              SizedBox(width: 8),
              Text('ACTIVE GIVEAWAYS',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
            ],
          ),
          const SizedBox(height: 12),
          for (final s in giveaways) ...[
            _buildGiveawayCard(s),
            const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }

  Widget _buildGiveawayCard(ConferenceSponsor s) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.zero,
        border: Border.all(color: _amber.withValues(alpha: 0.2)),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_amber.withValues(alpha: 0.12), _amber.withValues(alpha: 0.04)],
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(s.giveawayPrize ?? 'Giveaway',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
                const SizedBox(height: 2),
                Text('by ${s.companyName}', style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: () => _showInfoSheet(
              'How to enter',
              (s.giveawayInstructions?.trim().isNotEmpty ?? false)
                  ? s.giveawayInstructions!
                  : 'Visit ${s.companyName}\'s booth to enter.',
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: _amber.withValues(alpha: 0.25),
                borderRadius: BorderRadius.zero,
                border: Border.all(color: _amber.withValues(alpha: 0.5)),
              ),
              child: const Text('ENTER',
                  style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSponsorCard(ConferenceSponsor s) {
    final tierColor = _tierColor(s.packageLevel);
    final hasCta = (s.ctaUrl?.trim().isNotEmpty ?? false);
    return GestureDetector(
      onTap: () => context.push('/conference/sponsor/${s.id}'),
      behavior: HitTestBehavior.opaque,
      child: Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.zero,
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _logo(s, tierColor),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(s.companyName,
                              style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700)),
                        ),
                        if (s.packageLevel.trim().isNotEmpty) _tierBadge(s.packageLevel, tierColor),
                      ],
                    ),
                    if (s.description.trim().isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(s.description, style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
                    ],
                    if (s.booth != null && s.booth!.trim().isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.bolt_rounded, size: 13, color: tierColor),
                          const SizedBox(width: 3),
                          Flexible(
                            child: Text(s.booth!,
                                style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                                overflow: TextOverflow.ellipsis),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          if (s.perks.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text('PERKS',
                style: TextStyle(color: Colors.grey.shade400, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
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
                      borderRadius: BorderRadius.zero,
                      border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                    ),
                    child: Text(perk, style: const TextStyle(color: Colors.white, fontSize: 12)),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: hasCta ? () => _openUrl(s.ctaUrl) : null,
                  child: Opacity(
                    opacity: hasCta ? 1 : 0.4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: tierColor.withValues(alpha: 0.25),
                        borderRadius: BorderRadius.zero,
                        border: Border.all(color: tierColor.withValues(alpha: 0.5)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.open_in_new_rounded, size: 16, color: Colors.white),
                          const SizedBox(width: 8),
                          Text(
                            (s.ctaLabel?.trim().isNotEmpty ?? false) ? s.ctaLabel!.toUpperCase() : 'VISIT BOOTH',
                            style: const TextStyle(
                                color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 0.5),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              if (s.contactInfo != null && s.contactInfo!.trim().isNotEmpty) ...[
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => _showInfoSheet('Contact ${s.companyName}', s.contactInfo!),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.zero,
                      border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                    ),
                    child: Icon(Icons.chat_bubble_outline_rounded, size: 18, color: Colors.grey.shade300),
                  ),
                ),
              ],
            ],
          ),
          if (s.hasGiveaway) ...[
            const SizedBox(height: 12),
            GestureDetector(
              onTap: () => _showInfoSheet(
                s.giveawayPrize ?? 'Giveaway',
                (s.giveawayInstructions?.trim().isNotEmpty ?? false)
                    ? s.giveawayInstructions!
                    : 'Visit the booth to enter.',
              ),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 8),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: _amber.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.zero,
                  border: Border.all(color: _amber.withValues(alpha: 0.2)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.card_giftcard_rounded, size: 14, color: _amber),
                    SizedBox(width: 6),
                    Text('ACTIVE GIVEAWAY',
                        style: TextStyle(color: _amber, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
      ),
    );
  }

  Widget _logo(ConferenceSponsor s, Color tierColor) {
    final fallback = Text(s.initials,
        style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800));
    return Container(
      width: 60,
      height: 60,
      clipBehavior: Clip.antiAlias,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: tierColor.withValues(alpha: 0.2),
        borderRadius: BorderRadius.zero,
        border: Border.all(color: tierColor, width: 2),
      ),
      child: (s.logoUrl != null && s.logoUrl!.isNotEmpty)
          ? Image.network(s.logoUrl!, width: 60, height: 60, fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Center(child: fallback))
          : fallback,
    );
  }

  Widget _tierBadge(String level, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.zero,
        border: Border.all(color: color.withValues(alpha: 0.4)),
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
