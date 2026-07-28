import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/conference_colors.dart';

/// Opens the booth scanner. Shown on the sponsor list and on each booth's
/// detail page, because an attendee walks up to a stand and wants to scan
/// immediately rather than find that sponsor in the app first.
class BoothScanFab extends StatelessWidget {
  const BoothScanFab({super.key, this.extended = false});

  /// Labelled variant for the sponsor list, where there is room for it.
  final bool extended;

  @override
  Widget build(BuildContext context) {
    void open() => context.push('/conference/booth/scan');

    if (extended) {
      return FloatingActionButton.extended(
        backgroundColor: ConferenceColors.gold,
        foregroundColor: Colors.black,
        onPressed: open,
        icon: const Icon(Icons.qr_code_scanner_rounded),
        label: const Text('Scan a booth'),
      );
    }
    return FloatingActionButton(
      backgroundColor: ConferenceColors.gold,
      tooltip: 'Scan a booth',
      onPressed: open,
      child: const Icon(Icons.qr_code_scanner_rounded, color: Colors.black),
    );
  }
}
