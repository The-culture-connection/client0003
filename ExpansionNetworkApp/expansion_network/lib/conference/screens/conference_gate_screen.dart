import 'dart:math';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../services/expansion_session_service.dart'
    show userMessageForFirebaseCallableError;
import '../../services/stripe_checkout_service.dart';
import '../conference_analytics.dart';
import '../current_conference_holder.dart';
import '../models/conference.dart';
import '../services/conference_calendar.dart';
import '../services/conference_repository.dart';
import '../services/conference_ticket_service.dart';
import '../theme/conference_colors.dart';

/// Conference Center "first click" screen: the gate a user sees after tapping
/// the Conference Center tile in the Mortarverse. It offers a **ticket code
/// entry** field and lists **upcoming conferences** with a (Phase B) buy CTA.
///
/// Entry is gated on a redeemed ticket — on load, if the signed-in user already
/// has an `attendees/{uid}` record for the target conference, we route straight
/// to the lobby. Otherwise they must enter the unique code from their ticket.
///
/// Visually it leans into the platform's "live" conference language (dark
/// atmosphere + starfield, glowing gold) to match [ConferenceLobbyScreen] and
/// the Mortarverse chooser.
class ConferenceGateScreen extends StatefulWidget {
  const ConferenceGateScreen({super.key, this.switchMode = false});

  /// True when the user left a conference to choose another (`?switch=1`).
  ///
  /// Suppresses the "already has access → straight to the lobby" shortcut, so
  /// the conference list is actually reachable for someone who is already in.
  final bool switchMode;

  @override
  State<ConferenceGateScreen> createState() => _ConferenceGateScreenState();
}

class _ConferenceGateScreenState extends State<ConferenceGateScreen>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  final _code = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final ConferenceRepository _repo = ConferenceRepository();
  final ConferenceTicketService _tickets = ConferenceTicketService();
  final StripeCheckoutService _checkout = StripeCheckoutService();
  final ScrollController _scroll = ScrollController();
  final FocusNode _codeFocus = FocusNode();

  late final AnimationController _glow;
  late final List<Offset> _stars;

  bool _initializing = true;
  bool _busy = false;
  String? _error;
  String? _conferenceId;
  String? _buyingId;
  String? _checkoutConferenceId;
  List<Conference> _upcoming = const [];
  // Conferences the user already has access to (redeemed) / has paid for.
  Set<String> _accessIds = {};
  Set<String> _ticketIds = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _glow = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);
    final rng = Random(11);
    _stars = List.generate(70, (_) => Offset(rng.nextDouble(), rng.nextDouble()));
    if (widget.switchMode) {
      // The user has left the conference: drop the ambient id so analytics stop
      // stamping conference_id onto everything they do from here.
      CurrentConferenceHolder.instance.conferenceId = null;
    }
    logConferenceEvent(ConferenceAnalytics.gateViewed);
    _bootstrap();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _glow.dispose();
    _code.dispose();
    _scroll.dispose();
    _codeFocus.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_initializing) {
      final checkoutId = _checkoutConferenceId;
      if (checkoutId != null) {
        _checkoutConferenceId = null;
        _handleCheckoutReturn(checkoutId);
      } else {
        _refreshEntitlements();
        Future.delayed(const Duration(seconds: 4), () {
          if (mounted) _refreshEntitlements();
        });
      }
    }
  }

  /// After returning from Stripe Checkout, poll for attendee access. If the
  /// webhook already admitted the user, show the calendar prompt and enter.
  Future<void> _handleCheckoutReturn(String conferenceId) async {
    setState(() => _busy = true);
    try {
      final uid = FirebaseAuth.instance.currentUser?.uid;
      if (uid == null) return;

      bool hasAccess = false;
      for (var i = 0; i < 5; i++) {
        hasAccess = await _repo.hasAttendeeAccess(conferenceId, uid);
        if (hasAccess || !mounted) break;
        if (i < 4) await Future<void>.delayed(const Duration(milliseconds: 1500));
        if (!mounted) return;
      }

      await _refreshEntitlements();
      if (!mounted) return;

      if (hasAccess) {
        CurrentConferenceHolder.instance.conferenceId = conferenceId;
        final conf = await _repo.fetchConference(conferenceId);
        if (!mounted) return;
        if (conf?.startDate != null) {
          await showAddToCalendarSheet(context, conf!);
        }
        if (!mounted) return;
        context.go('/conference/lobby');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            duration: Duration(seconds: 6),
            content: Text(
              'Finishing up — if you completed checkout, your code will arrive '
              'by email. Enter it above to get in.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Re-load which conferences the user can enter / has paid for.
  Future<void> _refreshEntitlements() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    try {
      final access = await _repo.accessibleConferenceIds(uid, _upcoming.map((c) => c.id));
      final tickets = await _repo.purchasedConferenceIds(uid);
      if (!mounted) return;
      setState(() {
        _accessIds = access;
        _ticketIds = tickets;
      });
    } catch (_) {
      // Best-effort; leave the buttons as they are on failure.
    }
  }

  void _enter(Conference c) {
    CurrentConferenceHolder.instance.conferenceId = c.id;
    context.go('/conference/lobby');
  }

  void _promptCode(Conference c) {
    setState(() => _conferenceId = c.id);
    if (_scroll.hasClients) {
      _scroll.animateTo(0, duration: const Duration(milliseconds: 350), curve: Curves.easeOut);
    }
    _codeFocus.requestFocus();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Enter the code from your ticket email to go in.')),
    );
  }

  Future<void> _bootstrap() async {
    try {
      // Prefer the conference the tile picked; fall back to the active one.
      var conferenceId = CurrentConferenceHolder.instance.conferenceId;
      Conference? conference;
      if (conferenceId != null) {
        conference = await _repo.fetchConference(conferenceId);
      }
      conference ??= await _repo.fetchActiveConference();
      conferenceId = conference?.id;

      final upcoming = await _repo.fetchUpcomingConferences();

      // Already have access to the tapped conference? Skip the gate — unless
      // the user deliberately left a conference to pick a different one, in
      // which case auto-forwarding would bounce them straight back in.
      final uid = FirebaseAuth.instance.currentUser?.uid;
      if (conferenceId != null && uid != null && !widget.switchMode) {
        final hasAccess = await _repo.hasAttendeeAccess(conferenceId, uid);
        if (hasAccess && mounted) {
          CurrentConferenceHolder.instance.conferenceId = conferenceId;
          context.go('/conference/lobby');
          return;
        }
      }

      // Which of the upcoming conferences the user already holds / has paid for,
      // so their cards show "Enter" / "Enter code" instead of "Buy"/"Register".
      var accessIds = <String>{};
      var ticketIds = <String>{};
      if (uid != null) {
        accessIds = await _repo.accessibleConferenceIds(uid, upcoming.map((c) => c.id));
        ticketIds = await _repo.purchasedConferenceIds(uid);
      }

      if (!mounted) return;
      setState(() {
        _conferenceId = conferenceId;
        _upcoming = upcoming;
        _accessIds = accessIds;
        _ticketIds = ticketIds;
        _initializing = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = userMessageForFirebaseCallableError(e);
        _initializing = false;
      });
    }
  }

  String _mapError(String? code) {
    switch (code) {
      case 'NOT_A_BUYER':
        return 'We couldn\'t find a ticket for this account at this conference.';
      case 'USED':
        return 'This ticket code has already been used on another account.';
      case 'EXPIRED':
        return 'This ticket code has expired. Please contact support for a new one.';
      case 'REVOKED':
        return 'This ticket code is no longer valid. Please request a new one.';
      case 'NOT_ACTIVE_YET':
        return 'This conference isn\'t open yet. Your code will work once it starts.';
      case 'WINDOW_CLOSED':
        return 'This conference has ended.';
      case 'CONFERENCE_CLOSED':
        return 'This conference has closed.';
      case 'NO_CODE':
      case 'INVALID_CODE':
      default:
        return 'This ticket code is invalid.';
    }
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final conferenceId = _conferenceId;
    if (conferenceId == null) {
      setState(() => _error = 'No conference is open right now.');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final data = await _tickets.redeemConferenceTicketCode(
        conferenceId: conferenceId,
        code: _code.text,
      );
      if (data['ok'] != true) {
        // The server may have auto-redeemed the code during free registration
        // or via the Stripe webhook.  If the current user already has access,
        // treat it as success rather than showing an error.
        final uid = FirebaseAuth.instance.currentUser?.uid;
        final alreadyIn =
            uid != null && await _repo.hasAttendeeAccess(conferenceId, uid);
        if (!mounted) return;
        if (!alreadyIn) {
          final code = data['code'] as String?;
          final msg = data['message'] as String?;
          logConferenceEvent(() => ConferenceAnalytics.codeRedeemed(
                success: false,
                failureReason: code ?? 'unknown',
              ));
          setState(() => _error = msg ?? _mapError(code));
          return;
        }
      }
      if (!mounted) return;
      CurrentConferenceHolder.instance.conferenceId = conferenceId;
      logConferenceEvent(() => ConferenceAnalytics.codeRedeemed(success: true));
      // Offer to add the conference to their calendar (with 1-week/2-day
      // reminders) on first entry, before dropping into the lobby.
      final conf = await _repo.fetchConference(conferenceId);
      if (!mounted) return;
      if (conf?.startDate != null) {
        await showAddToCalendarSheet(context, conf!);
      }
      if (!mounted) return;
      context.go('/conference/lobby');
    } catch (e) {
      setState(() => _error = userMessageForFirebaseCallableError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _exit() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/mortarverse');
    }
  }

  Future<void> _buyTicket(Conference c) async {
    if (c.isFree) {
      await _registerFree(c);
      return;
    }
    setState(() => _buyingId = c.id);
    try {
      _checkoutConferenceId = c.id;
      await _checkout.checkoutConferenceTicket(context: context, conferenceId: c.id);
    } catch (e) {
      _checkoutConferenceId = null;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userMessageForFirebaseCallableError(e))),
      );
    } finally {
      if (mounted) setState(() => _buyingId = null);
    }
  }

  /// Free conference: auto-issue + email the code, then redeem it right away
  /// (redemption enforces the active window, same as a typed code).
  Future<void> _registerFree(Conference c) async {
    setState(() {
      _buyingId = c.id;
      _error = null;
    });
    try {
      final res = await _tickets.registerFreeConferenceTicket(conferenceId: c.id);
      final code = (res['code'] as String?)?.trim();
      if (!mounted) return;
      setState(() {
        _conferenceId = c.id;
        if (code != null && code.isNotEmpty) _code.text = code;
        _buyingId = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("You're registered! We emailed your code — entering now…")),
      );
      await _submit();
    } catch (e) {
      if (!mounted) return;
      setState(() => _buyingId = null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userMessageForFirebaseCallableError(e))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ConferenceColors.background,
      body: Stack(
        children: [
          // Atmosphere gradient + gold halo + starfield.
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [ConferenceColors.atmosphere, Colors.black, Colors.black],
              ),
            ),
          ),
          Positioned.fill(child: CustomPaint(painter: _StarfieldPainter(_stars))),
          const _TopGlow(),
          SafeArea(
            child: _initializing
                ? const Center(
                    child: CircularProgressIndicator(color: ConferenceColors.gold),
                  )
                : _buildBody(context),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    return Column(
      children: [
        _buildTopBar(context),
        Expanded(
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(milliseconds: 550),
            curve: Curves.easeOutCubic,
            builder: (context, t, child) => Opacity(
              opacity: t.clamp(0, 1),
              child: Transform.translate(offset: Offset(0, (1 - t) * 24), child: child),
            ),
            child: SingleChildScrollView(
              controller: _scroll,
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildCodeCard(context),
                  const SizedBox(height: 30),
                  _buildUpcoming(context),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 8, 16, 4),
        child: IconButton(
          icon: const Icon(Icons.arrow_back, color: ConferenceColors.gold),
          tooltip: 'Back to the MORTARVERSE',
          onPressed: _exit,
        ),
      ),
    );
  }

  Widget _buildCodeCard(BuildContext context) {
    return AnimatedBuilder(
      animation: _glow,
      builder: (context, child) {
        final t = _glow.value;
        return Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(
                color: ConferenceColors.goldAlpha(0.10 + 0.16 * t),
                blurRadius: 18 + 22 * t,
                spreadRadius: 1 + 2 * t,
              ),
            ],
          ),
          child: child,
        );
      },
      child: Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: ConferenceColors.goldAlpha(0.45), width: 1.2),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              const Color(0xFF17130B),
              Colors.black.withValues(alpha: 0.7),
            ],
          ),
        ),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: ConferenceColors.goldAlpha(0.14),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: ConferenceColors.gold, width: 1.4),
                    ),
                    child: const Icon(Icons.confirmation_number_rounded, color: ConferenceColors.gold, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'ENTER YOUR TICKET CODE',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Use the code from your ticket email to enter.',
                          style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _code,
                focusNode: _codeFocus,
                autocorrect: false,
                textAlign: TextAlign.center,
                textCapitalization: TextCapitalization.characters,
                inputFormatters: [
                  TextInputFormatter.withFunction(
                    (oldV, newV) => newV.copyWith(text: newV.text.toUpperCase()),
                  ),
                  FilteringTextInputFormatter.allow(RegExp(r'[A-Z0-9]')),
                  LengthLimitingTextInputFormatter(10),
                ],
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 8,
                ),
                decoration: InputDecoration(
                  hintText: '••••••••••',
                  hintStyle: TextStyle(color: Colors.grey.shade700, letterSpacing: 6, fontSize: 22),
                  filled: true,
                  fillColor: Colors.black.withValues(alpha: 0.4),
                  contentPadding: const EdgeInsets.symmetric(vertical: 16),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: ConferenceColors.goldAlpha(0.35)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: ConferenceColors.gold, width: 1.6),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: Colors.redAccent),
                  ),
                  focusedErrorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: Colors.redAccent, width: 1.6),
                  ),
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter your code' : null,
                onFieldSubmitted: (_) => _busy ? null : _submit(),
              ),
              if (_error != null) ...[
                const SizedBox(height: 14),
                Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 20),
              SizedBox(
                height: 54,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: ConferenceColors.gold,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: _busy ? null : _submit,
                  child: _busy
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'ENTER CONFERENCE',
                              style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.8),
                            ),
                            SizedBox(width: 8),
                            Icon(Icons.arrow_forward_rounded, size: 20),
                          ],
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUpcoming(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Icon(Icons.calendar_month_rounded, size: 18, color: ConferenceColors.gold),
            const SizedBox(width: 8),
            Text(
              'DON\'T HAVE A TICKET YET?',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.9),
                fontWeight: FontWeight.w700,
                fontSize: 13,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Padding(
          padding: const EdgeInsets.only(left: 26),
          child: Text(
            'Grab a spot at an upcoming conference.',
            style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
          ),
        ),
        const SizedBox(height: 14),
        if (_upcoming.isEmpty)
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
            ),
            child: Text(
              'No conferences are open for tickets right now — check back soon.',
              style: TextStyle(color: Colors.grey.shade400, fontSize: 13),
            ),
          )
        else
          for (var i = 0; i < _upcoming.length; i++) _buildConferenceCard(_upcoming[i], i),
      ],
    );
  }

  Widget _buildConferenceCard(Conference c, int index) {
    final priceLabel = c.isFree
        ? 'FREE'
        : '\$${(c.priceCents / 100).toStringAsFixed(2)}';
    final dateLabel = c.startDate != null ? DateFormat('MMM d, y').format(c.startDate!) : null;
    final icons = [
      Icons.auto_awesome_rounded,
      Icons.rocket_launch_rounded,
      Icons.workspace_premium_rounded,
    ];
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
      ),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: ConferenceColors.goldAlpha(0.12),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: ConferenceColors.gold, width: 1.4),
            ),
            child: Icon(icons[index % icons.length], color: ConferenceColors.gold, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  c.name,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: ConferenceColors.goldAlpha(0.14),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        priceLabel,
                        style: const TextStyle(color: ConferenceColors.gold, fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                    ),
                    if (dateLabel != null) ...[
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          dateLabel,
                          style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          _buildCardAction(c),
        ],
      ),
    );
  }

  /// Reflects the user's state for [c]: entered → "Enter", paid but not redeemed
  /// → "Enter code", otherwise "Buy"/"Register".
  Widget _buildCardAction(Conference c) {
    if (_buyingId == c.id) {
      return const SizedBox(
        width: 44,
        height: 40,
        child: Center(
          child: SizedBox(
            height: 18,
            width: 18,
            child: CircularProgressIndicator(strokeWidth: 2, color: ConferenceColors.gold),
          ),
        ),
      );
    }

    final hasAccess = _accessIds.contains(c.id);
    final hasTicket = _ticketIds.contains(c.id);

    final String label;
    final VoidCallback onTap;
    if (hasAccess) {
      label = 'Enter';
      onTap = () => _enter(c);
    } else if (hasTicket) {
      label = 'Enter code';
      onTap = () => _promptCode(c);
    } else {
      label = c.isFree ? 'Register' : 'Buy';
      onTap = () => _buyTicket(c);
    }

    return FilledButton(
      style: FilledButton.styleFrom(
        backgroundColor: hasAccess ? ConferenceColors.gold : ConferenceColors.goldAlpha(0.16),
        foregroundColor: hasAccess ? Colors.black : ConferenceColors.gold,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: ConferenceColors.goldAlpha(0.5)),
        ),
      ),
      onPressed: _buyingId == null ? onTap : null,
      child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
    );
  }
}

/// Soft gold radial halo behind the top of the screen.
class _TopGlow extends StatelessWidget {
  const _TopGlow();

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: -120,
      left: 0,
      right: 0,
      child: IgnorePointer(
        child: Container(
          height: 320,
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.topCenter,
              radius: 0.9,
              colors: [ConferenceColors.goldAlpha(0.16), Colors.transparent],
            ),
          ),
        ),
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
