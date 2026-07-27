import 'dart:math';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../auth/auth_controller.dart';
import '../../commons/theme/commons_colors.dart';
import '../../conference/current_conference_holder.dart';
import '../../conference/models/conference.dart';
import '../../conference/services/conference_repository.dart';
import '../../conference/theme/conference_colors.dart';
import '../../theme/app_theme.dart';

/// Post-login landing screen letting the user choose between the Expansion
/// Network and Conference "shops" — matches the storefront treatment in
/// `Conference App Figma Mockup/src/app/pages/Mortarverse.tsx` (dark
/// starfield, glowing shopfront card, "OPEN NOW" pill), reusing that mockup's
/// per-shop palette: Expansion = red (`AppColors.primary`), Conference =
/// gold (`ConferenceColors.gold`).
class MortarverseChooserScreen extends StatefulWidget {
  const MortarverseChooserScreen({super.key});

  @override
  State<MortarverseChooserScreen> createState() => _MortarverseChooserScreenState();
}

class _MortarverseChooserScreenState extends State<MortarverseChooserScreen> {
  final ConferenceRepository _conferenceRepository = ConferenceRepository();
  late final Future<Conference?> _activeConferenceFuture;
  late final List<Offset> _starPositions;

  @override
  void initState() {
    super.initState();
    // Standing at the chooser means no conference is open. Every exit from the
    // Conference app routes through here, so this is the one place that can
    // reliably clear the holder — without it the id stays set for the life of
    // the process and analytics would stamp conference_id onto Expansion events
    // logged after the user left.
    CurrentConferenceHolder.instance.conferenceId = null;
    _activeConferenceFuture = _conferenceRepository.fetchActiveConference();
    final rng = Random(7);
    _starPositions = List.generate(60, (_) => Offset(rng.nextDouble(), rng.nextDouble()));
  }

  @override
  Widget build(BuildContext context) {
    final hasExpansionAccess = context.watch<AuthController>().hasExpansionAccess;
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment.topCenter,
                radius: 1.2,
                colors: [Color(0xFF262626), Colors.black],
              ),
            ),
          ),
          Positioned.fill(
            child: CustomPaint(painter: _StarfieldPainter(_starPositions)),
          ),
          SafeArea(
            child: Column(
              children: [
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.auto_awesome, size: 20, color: Colors.grey.shade400),
                    const SizedBox(width: 8),
                    Text(
                      'THE MORTARVERSE',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.5,
                            color: Colors.white,
                          ),
                    ),
                    const SizedBox(width: 8),
                    Icon(Icons.auto_awesome, size: 20, color: Colors.grey.shade400),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Explore the digital neighborhood',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                ),
                Expanded(
                  child: Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _ShopTile(
                            title: 'Networking Hall',
                            subtitle: hasExpansionAccess
                                ? 'Connect • Grow • Collaborate'
                                : 'Have an invite code? Tap to unlock',
                            shopColor: AppColors.primary,
                            enabled: true,
                            onTap: () => context.go(
                              hasExpansionAccess ? '/home' : '/expansion/enter-code',
                            ),
                          ),
                          const SizedBox(height: 28),
                          FutureBuilder<Conference?>(
                            future: _activeConferenceFuture,
                            builder: (context, snapshot) {
                              final conference = snapshot.data;
                              final loading = snapshot.connectionState != ConnectionState.done;
                              return _ShopTile(
                                title: 'Conference Center',
                                subtitle: loading
                                    ? 'Loading…'
                                    : (conference?.name ?? 'No conference is open right now'),
                                shopColor: ConferenceColors.gold,
                                enabled: !loading && conference != null,
                                onTap: conference == null
                                    ? null
                                    : () {
                                        CurrentConferenceHolder.instance.conferenceId = conference.id;
                                        // Land on the ticket gate ("first click")
                                        // screen; it routes on to the lobby once
                                        // the user has redeemed a ticket code.
                                        context.go('/conference/gate');
                                      },
                              );
                            },
                          ),
                          const SizedBox(height: 28),
                          _ShopTile(
                            title: 'The Commons',
                            subtitle: 'Profile • Messages • Notifications',
                            shopColor: CommonsColors.accent,
                            enabled: true,
                            onTap: () => context.go('/commons/profile'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StarfieldPainter extends CustomPainter {
  _StarfieldPainter(this.positions);

  final List<Offset> positions;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.grey.shade600.withValues(alpha: 0.5);
    for (final p in positions) {
      canvas.drawCircle(Offset(p.dx * size.width, p.dy * size.height), 0.8, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _StarfieldPainter oldDelegate) => false;
}

class _ShopTile extends StatelessWidget {
  const _ShopTile({
    required this.title,
    required this.subtitle,
    required this.shopColor,
    required this.enabled,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final Color shopColor;
  final bool enabled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1 : 0.45,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 260,
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(color: shopColor.withValues(alpha: 0.4), blurRadius: 40, spreadRadius: 4),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFF0D0D0D),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: shopColor, width: 2),
              ),
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 28),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [shopColor.withValues(alpha: 0.14), Colors.transparent],
                      ),
                    ),
                    child: ColorFiltered(
                      colorFilter: ColorFilter.mode(shopColor, BlendMode.srcIn),
                      child: Image.asset(
                        'assets/conference/shop_storefront.png',
                        height: 90,
                      ),
                    ),
                  ),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                    decoration: const BoxDecoration(color: Color(0xFF0D0D0D)),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: shopColor,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            enabled ? 'OPEN NOW' : 'LOCKED',
                            style: const TextStyle(
                              color: Colors.black,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          title.toUpperCase(),
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1,
                            fontSize: 18,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          subtitle,
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
