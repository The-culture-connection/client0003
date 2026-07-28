import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../services/booth_qr_link.dart';
import '../../services/member_card_link.dart';
import '../../widgets/qr_scan_view.dart';
import '../conference_analytics.dart';
import '../current_conference_holder.dart';
import '../models/conference_sponsor.dart';
import '../services/conference_repository.dart';
import '../theme/conference_colors.dart';

/// Scans a booth QR, credits the visit, and hands off to that sponsor's CTA.
///
/// The scanned code wins over whatever booth the user was looking at: they are
/// physically standing at the booth they scanned, so we credit and open that
/// one even if they arrived from a different sponsor's page.
class ConferenceBoothScanScreen extends StatefulWidget {
  const ConferenceBoothScanScreen({super.key});

  @override
  State<ConferenceBoothScanScreen> createState() => _ConferenceBoothScanScreenState();
}

class _ConferenceBoothScanScreenState extends State<ConferenceBoothScanScreen> {
  final ConferenceRepository _repo = ConferenceRepository();

  bool _busy = false;

  void _toast(String message) {
    ScaffoldMessenger.maybeOf(context)
      ?..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<ScanOutcome> _onCode(String raw) async {
    final sponsorId = parseBoothPayload(raw);
    if (sponsorId == null) {
      // A member card shares the scheme but not the host — name it specifically
      // so the "wrong code" case is not a dead end.
      final isMemberCard = parseMemberCardPayload(raw) != null;
      _toast(isMemberCard
          ? 'That’s a member card, not a booth code.'
          : 'That’s not a booth code.');
      return ScanOutcome.keepScanning;
    }

    final conferenceId = CurrentConferenceHolder.instance.conferenceId;
    if (conferenceId == null) {
      _toast('No conference is open right now.');
      return ScanOutcome.keepScanning;
    }

    setState(() => _busy = true);
    ConferenceSponsor? sponsor;
    try {
      sponsor = await _repo.fetchSponsor(conferenceId, sponsorId);
    } catch (_) {
      sponsor = null;
    }
    if (!mounted) return ScanOutcome.keepScanning;
    setState(() => _busy = false);

    if (sponsor == null) {
      // A code from another event, or a booth that has since been removed.
      _toast('That booth isn’t part of this conference.');
      return ScanOutcome.keepScanning;
    }

    // Credit the visit before navigating — this is the event the
    // `booths_scanned` mission metric counts.
    logConferenceEvent(() => ConferenceAnalytics.sponsorScanned(
          sponsorId: sponsor!.id,
          name: sponsor.companyName,
        ));

    final cta = sponsor.ctaUrl?.trim();
    if (cta != null && cta.isNotEmpty) {
      final opened = await _openCta(cta);
      if (!mounted) return ScanOutcome.handled;
      if (!opened) {
        // Falling back to the detail page keeps the visit useful even when the
        // sponsor's link is malformed or nothing can handle it.
        _toast('Could not open that link — showing the booth instead.');
        context.pushReplacement('/conference/sponsor/${sponsor.id}');
        return ScanOutcome.handled;
      }
      // The CTA opened in a browser; land them on the booth underneath it.
      context.pushReplacement('/conference/sponsor/${sponsor.id}');
      return ScanOutcome.handled;
    }

    context.pushReplacement('/conference/sponsor/${sponsor.id}');
    return ScanOutcome.handled;
  }

  Future<bool> _openCta(String url) async {
    try {
      final uri = Uri.tryParse(url);
      if (uri == null || !uri.hasScheme) return false;
      logConferenceEvent(() => ConferenceAnalytics.sponsorLinkClicked(
            sponsorId: 'scan',
            linkKind: 'cta',
          ));
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: ConferenceColors.gold,
        elevation: 0,
        title: const Text('Scan a booth'),
      ),
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          QrScanView(
            active: !_busy,
            accent: ConferenceColors.gold,
            hint: 'Point at the QR code on a sponsor’s booth',
            onCode: _onCode,
          ),
          if (_busy)
            const ColoredBox(
              color: Colors.black54,
              child: Center(
                child: CircularProgressIndicator(color: ConferenceColors.gold),
              ),
            ),
        ],
      ),
    );
  }
}
