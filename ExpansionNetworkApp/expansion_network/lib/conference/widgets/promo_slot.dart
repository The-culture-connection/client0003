import 'package:flutter/material.dart';

/// Named placeholder for a future sponsored-content slot (Phase 6 wires real
/// ad content in here). Renders nothing in Phase 1-5 so layouts don't need to
/// change again once the ad engine ships.
class PromoSlot extends StatelessWidget {
  const PromoSlot({required this.slotId, super.key});

  final String slotId;

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
