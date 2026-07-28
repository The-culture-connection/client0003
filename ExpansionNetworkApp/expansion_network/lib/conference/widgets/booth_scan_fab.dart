import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/conference_colors.dart';

/// Opens the booth scanner. Shown on the sponsor list and on each booth's
/// detail page, because an attendee walks up to a stand and wants to scan
/// immediately rather than find that sponsor in the app first.
class BoothScanFab extends StatelessWidget {
  const BoothScanFab({super.key});

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton(
      backgroundColor: ConferenceColors.gold,
      // Label lives in the tooltip only — the icon carries the meaning, and it
      // matches the lobby's card/scan FAB.
      tooltip: 'Scan a booth',
      onPressed: () => context.push('/conference/booth/scan'),
      child: const Icon(Icons.qr_code_scanner_rounded, size: 28, color: Colors.black),
    );
  }
}
