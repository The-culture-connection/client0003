import 'dart:async';
import 'dart:math';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../services/expansion_session_service.dart'
    show userMessageForFirebaseCallableError;
import '../../router/app_router.dart' show expansionRootNavigatorKey;
import '../../services/stripe_checkout_service.dart';
import '../conference_analytics.dart';
import '../current_conference_holder.dart';
import '../models/conference.dart';
import '../services/conference_calendar.dart';
import '../services/conference_repository.dart';
import '../services/conference_ticket_service.dart';
import '../theme/conference_colors.dart';
import '../widgets/conference_brand_mark.dart';
import 'conference_attendee_survey_screen.dart';
import '../../theme/cosmic_content.dart';

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
      CurrentConferenceHolder.instance.clear();
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
        final conf = await _repo.fetchConference(conferenceId);
        if (!mounted) return;
        if (conf == null || !CurrentConferenceHolder.instance.enter(conf)) {
          setState(() => _error = conf?.entryBlockedReason ??
              'This conference is no longer open.');
          return;
        }
        // Enter first, calendar second — same reasoning as _redeemCode.
        context.go('/conference/lobby');
        if (conf.startDate != null) {
          final rootCtx = expansionRootNavigatorKey.currentContext;
          if (rootCtx != null && rootCtx.mounted) {
            await showAddToCalendarSheet(rootCtx, conf);
          }
        }
        return;
      }

      // No attendee record, which is the normal outcome: the Stripe webhook
      // issues the ticket code and stashes it on the order, but never admits
      // the buyer. Redeem that code for them rather than sending them to
      // their inbox to retype something we can already read.
      final issued = await _repo.issuedTicketCodeFor(uid, conferenceId);
      if (!mounted) return;
      if (issued != null && issued.isNotEmpty) {
        setState(() {
          _conferenceId = conferenceId;
          _code.text = issued;
        });
        await _redeemCode(conferenceId: conferenceId, code: issued);
        return;
      }

      // The order hasn't landed yet (webhook still in flight).
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          duration: Duration(seconds: 6),
          content: Text(
            'Finishing up — if you completed checkout, your code will arrive '
            'by email. Enter it above to get in.',
          ),
        ),
      );
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

  /// Walks the user into [c] — the gate's only door.
  ///
  /// Refuses a conference that is no longer open even for someone holding a
  /// redeemed ticket: [CurrentConferenceHolder.enter] is the authority and it
  /// will not admit a closed one.
  void _enter(Conference c) {
    if (!CurrentConferenceHolder.instance.enter(c)) {
      setState(() => _error = c.entryBlockedReason);
      unawaited(_refreshEntitlements());
      return;
    }
    context.go('/conference/lobby');
  }

  /// Points the always-visible code card at [c] and scrolls up to it.
  ///
  /// Triggered by tapping a conference the user already holds a ticket for.
  /// The card itself is never hidden — this only retargets it, so the field
  /// makes clear which event the code is being spent on.
  void _promptCode(Conference c) {
    setState(() => _conferenceId = c.id);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scroll.hasClients) return;
      _scroll.animateTo(
        0,
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeOut,
      );
      _codeFocus.requestFocus();
    });
  }

  /// The conference the code card is currently spending a code on.
  Conference? get _targetConference {
    final id = _conferenceId;
    if (id == null) return null;
    for (final c in _upcoming) {
      if (c.id == id) return c;
    }
    return null;
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
      //
      // Access alone is not enough. This silent forward is precisely the path
      // that used to drop ticket-holders into conferences that had already
      // ended, so it now also demands the conference still be open.
      final uid = FirebaseAuth.instance.currentUser?.uid;
      final target0 = conference;
      if (target0 != null && uid != null && !widget.switchMode) {
        final hasAccess = await _repo.hasAttendeeAccess(target0.id, uid);
        if (hasAccess && target0.isOpenForEntry && mounted) {
          if (CurrentConferenceHolder.instance.enter(target0)) {
            context.go('/conference/lobby');
            return;
          }
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

      // Aim the always-visible code field at something a code can actually be
      // spent on. The ambient id often points at a conference the user is
      // already in — reliably so in switch mode — and any code submitted
      // against that comes back USED.
      var target = conferenceId;
      if (target == null || accessIds.contains(target)) {
        target = null;
        for (final c in upcoming) {
          if (accessIds.contains(c.id) || c.isTicketCodeStopped) continue;
          if (ticketIds.contains(c.id)) {
            // A paid but unredeemed ticket is the strongest signal of intent.
            target = c.id;
            break;
          }
          target ??= c.id;
        }
      }

      if (!mounted) return;
      setState(() {
        _conferenceId = target ?? conferenceId;
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

  /// Redeems [code] for [conferenceId] and drops the user into the lobby.
  ///
  /// Deliberately independent of [_formKey]. The automatic paths — finishing a
  /// free registration, returning from Stripe — run this before the user has
  /// touched the code field, and in the free case before the field is even on
  /// screen. Gating redemption on `_formKey.currentState?.validate()` is what
  /// used to strand those users on the gate: with no mounted [Form] the null
  /// check evaluated to `false` and the call returned without redeeming, so
  /// the code sat pre-filled until they submitted it by hand.
  Future<void> _redeemCode({
    required String conferenceId,
    required String code,
  }) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final data = await _tickets.redeemConferenceTicketCode(
        conferenceId: conferenceId,
        code: code,
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
          final failure = data['code'] as String?;
          final msg = data['message'] as String?;
          logConferenceEvent(() => ConferenceAnalytics.codeRedeemed(
                success: false,
                failureReason: failure ?? 'unknown',
              ));
          setState(() {
            _error = msg ?? _mapError(failure);
            // An automatic attempt failed — point the field at this
            // conference so the message has somewhere to land and the user
            // can correct the code by hand.
            _conferenceId = conferenceId;
          });
          return;
        }
      }
      if (!mounted) return;
      logConferenceEvent(() => ConferenceAnalytics.codeRedeemed(success: true));
      final conf = await _repo.fetchConference(conferenceId);
      if (!mounted) return;
      // Redeeming and entering are separate questions: the window can lapse
      // between a code being issued and it being spent, and the server accepts
      // the redemption right up to the boundary.
      if (conf == null || !CurrentConferenceHolder.instance.enter(conf)) {
        setState(() => _error =
            conf?.entryBlockedReason ?? 'This conference is no longer open.');
        return;
      }
      // Enter FIRST, then offer the calendar on top of the lobby. Entry used
      // to wait on the calendar sheet resolving, and any hiccup in the native
      // calendar UI left the user stranded on the gate with the code card
      // stuck "loading" until they tapped Enter by hand.
      context.go('/conference/lobby');
      if (conf.startDate != null) {
        // This screen is unmounted by the navigation — anchor the sheet to
        // the root navigator, floating above the lobby.
        final rootCtx = expansionRootNavigatorKey.currentContext;
        if (rootCtx != null && rootCtx.mounted) {
          await showAddToCalendarSheet(rootCtx, conf);
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = userMessageForFirebaseCallableError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// The typed-code path: validate what's in the field, then redeem it.
  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final conferenceId = _conferenceId;
    if (conferenceId == null) {
      setState(() => _error = 'Pick a conference above, then enter your code.');
      return;
    }
    FocusScope.of(context).unfocus();
    await _redeemCode(conferenceId: conferenceId, code: _code.text);
  }

  void _exit() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/mortarverse');
    }
  }

  Future<void> _buyTicket(Conference c) async {
    // Both the free "Register" and paid "Buy" CTAs land here, so gating on the
    // survey at the top is what puts it ahead of checkout in either case. A
    // dismissed survey means no profile was saved — don't send them to Stripe.
    final surveyDone = await showConferenceAttendeeSurvey(context, c);
    if (!surveyDone || !mounted) return;

    if (c.isFree) {
      await _registerFree(c);
      return;
    }

    // One ticket type needs no choosing; more than one always does — the server
    // rejects a checkout that does not name a tier.
    final tiers = c.sellableTiers;
    final tier = tiers.length == 1 ? tiers.first : await _pickTier(c, tiers);
    if (tier == null || !mounted) return;

    setState(() => _buyingId = c.id);
    try {
      _checkoutConferenceId = c.id;
      await _checkout.checkoutConferenceTicket(
        context: context,
        conferenceId: c.id,
        tierId: tier.id,
      );
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

  /// Choose a ticket type. Returns null if the sheet is dismissed, which
  /// abandons the purchase rather than defaulting to a tier the buyer did not
  /// pick. Prices shown are labels — the server re-resolves the real amount
  /// from the conference doc at checkout.
  Future<ConferenceTier?> _pickTier(Conference c, List<ConferenceTier> tiers) {
    return showModalBottomSheet<ConferenceTier>(
      context: context,
      backgroundColor: ConferenceColors.atmosphere,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Choose your ticket',
                  style: TextStyle(
                    color: ConferenceColors.gold,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  c.name,
                  style: TextStyle(color: Cosmic.textMuted, fontSize: 13, height: 1.4),
                ),
                const SizedBox(height: 16),
                for (final tier in tiers) ...[
                  _TierOption(
                    tier: tier,
                    onTap: () => Navigator.of(ctx).pop(tier),
                  ),
                  const SizedBox(height: 10),
                ],
              ],
            ),
          ),
        ),
      ),
    );
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
      if (code == null || code.isEmpty) {
        // Registered, but the server didn't hand back a code to redeem —
        // the emailed one is the only way in.
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            duration: Duration(seconds: 6),
            content: Text("You're registered! We emailed your code — enter it above to get in."),
          ),
        );
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("You're registered! We emailed your code — entering now…")),
      );
      await _redeemCode(conferenceId: c.id, code: code);
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
      backgroundColor: Colors.transparent,
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
                  // Code entry leads and is never collapsed. Arriving with a
                  // ticket already bought is the common case, and hiding this
                  // behind a grey "Already have a ticket code?" link at the
                  // bottom of the list meant people had to go looking for it.
                  _buildCodeCard(context),
                  const SizedBox(height: 28),
                  _buildShelves(context),
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
            borderRadius: Cosmic.chipRadius,
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
          borderRadius: Cosmic.chipRadius,
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
                      borderRadius: Cosmic.chipRadius,
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
                        // Name the target: the card is always on screen now,
                        // so it has to say which event the code is spent on.
                        Text(
                          _targetConference != null
                              ? 'Entering ${_targetConference!.name}.'
                              : 'Use the code from your ticket email to enter.',
                          style: TextStyle(color: Cosmic.textMuted, fontSize: 12),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
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
                  hintStyle: TextStyle(color: Cosmic.textFaint, letterSpacing: 6, fontSize: 22),
                  filled: true,
                  fillColor: Colors.black.withValues(alpha: 0.4),
                  contentPadding: const EdgeInsets.symmetric(vertical: 16),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: Cosmic.chipRadius,
                    borderSide: BorderSide(color: ConferenceColors.goldAlpha(0.35)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: Cosmic.chipRadius,
                    borderSide: const BorderSide(color: ConferenceColors.gold, width: 1.6),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: Cosmic.chipRadius,
                    borderSide: const BorderSide(color: Colors.redAccent),
                  ),
                  focusedErrorBorder: OutlineInputBorder(
                    borderRadius: Cosmic.chipRadius,
                    borderSide: const BorderSide(color: Colors.redAccent, width: 1.6),
                  ),
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter your code' : null,
                onFieldSubmitted: (_) => _busy ? null : _submit(),
              ),
              const SizedBox(height: 10),
              // Testers asked where codes come from — say it right at the field.
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.mark_email_read_outlined,
                      size: 15, color: Cosmic.textMuted),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Your registration code was emailed to you — check your '
                      'inbox (and spam) for it.',
                      style: TextStyle(color: Cosmic.textMuted, fontSize: 12, height: 1.35),
                    ),
                  ),
                ],
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
                    shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
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

  /// Splits the list into the three shelves the gate shows.
  ///
  /// `held` deliberately mixes two states that share one property: neither can
  /// be bought. A paid-but-unredeemed ticket still needs its code entered, and
  /// a conference whose code window has stopped can't be entered at all — but
  /// showing either with a "Buy" button would offer a purchase that fails
  /// server-side, so both drop off the buy list onto the grey shelf.
  ({List<Conference> entered, List<Conference> buyable, List<Conference> held})
      _shelves() {
    final entered = <Conference>[];
    final buyable = <Conference>[];
    final held = <Conference>[];
    for (final c in _upcoming) {
      if (_accessIds.contains(c.id)) {
        entered.add(c);
      } else if (c.isTicketCodeStopped || _ticketIds.contains(c.id)) {
        held.add(c);
      } else {
        buyable.add(c);
      }
    }
    return (entered: entered, buyable: buyable, held: held);
  }

  Widget _buildShelves(BuildContext context) {
    final shelves = _shelves();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Conferences the user is already in stay at the top, in full colour:
        // getting back into an event you hold a ticket for should be the
        // shortest path on the screen.
        if (shelves.entered.isNotEmpty) ...[
          _buildShelfHeader(
            icon: Icons.check_circle_rounded,
            title: 'YOUR CONFERENCES',
            subtitle: "You're in — tap to go straight to the lobby.",
          ),
          for (var i = 0; i < shelves.entered.length; i++)
            _buildConferenceCard(shelves.entered[i], i),
          const SizedBox(height: 26),
        ],
        _buildShelfHeader(
          icon: Icons.calendar_month_rounded,
          title: 'DON\'T HAVE A TICKET YET?',
          subtitle: 'Grab a spot at an upcoming conference.',
        ),
        if (shelves.buyable.isEmpty)
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.05),
              borderRadius: Cosmic.chipRadius,
              border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
            ),
            child: Text(
              'No conferences are open for tickets right now — check back soon.',
              style: TextStyle(color: Cosmic.textMuted, fontSize: 13),
            ),
          )
        else
          for (var i = 0; i < shelves.buyable.length; i++)
            _buildConferenceCard(shelves.buyable[i], i),
        if (shelves.held.isNotEmpty) ...[
          const SizedBox(height: 26),
          _buildShelfHeader(
            icon: Icons.confirmation_number_outlined,
            title: 'ALREADY HAVE A TICKET',
            subtitle: 'Tickets you hold, and conferences that have stopped taking codes.',
            muted: true,
          ),
          for (var i = 0; i < shelves.held.length; i++)
            _buildConferenceCard(shelves.held[i], i, muted: true),
        ],
      ],
    );
  }

  Widget _buildShelfHeader({
    required IconData icon,
    required String title,
    required String subtitle,
    bool muted = false,
  }) {
    final accent = muted ? Cosmic.textFaint : ConferenceColors.gold;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Icon(icon, size: 18, color: accent),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  color: muted
                      ? Cosmic.textFaint
                      : Colors.white.withValues(alpha: 0.9),
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  letterSpacing: 1,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Padding(
          padding: const EdgeInsets.only(left: 26),
          child: Text(
            subtitle,
            style: TextStyle(
              color: muted ? Cosmic.textFaint : Cosmic.textFaint,
              fontSize: 12,
            ),
          ),
        ),
        const SizedBox(height: 14),
      ],
    );
  }

  Widget _buildConferenceCard(Conference c, int index, {bool muted = false}) {
    // "From $25.00" when there is a choice — the card shows the entry price and
    // the picker shows what each tier actually costs.
    final priceLabel = c.isFree
        ? 'FREE'
        : '${c.hasTierChoice ? 'From ' : ''}\$${(c.lowestPriceCents / 100).toStringAsFixed(2)}';
    final dateLabel = c.startDate != null ? DateFormat('MMM d, y').format(c.startDate!) : null;
    final icons = [
      Icons.auto_awesome_rounded,
      Icons.rocket_launch_rounded,
      Icons.workspace_premium_rounded,
    ];
    final hero = c.heroImageUrl?.trim();
    final hasHero = hero != null && hero.isNotEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: muted ? 0.03 : 0.06),
        borderRadius: Cosmic.chipRadius,
        border: Border.all(
          color: Colors.white.withValues(alpha: muted ? 0.07 : 0.14),
        ),
      ),
      child: Column(
        children: [
          // The event's own key art, when it has any — this is what makes one
          // conference look different from the next in the list.
          if (hasHero)
            SizedBox(
              height: 92,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Opacity(
                    opacity: muted ? 0.35 : 1,
                    child: Image.network(
                      hero,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                    ),
                  ),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withValues(alpha: 0.1),
                          Colors.black.withValues(alpha: 0.75),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                if (c.logoUrl != null && c.logoUrl!.trim().isNotEmpty)
                  ConferenceBrandMark(logoUrl: c.logoUrl, size: 50)
                else
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: muted
                          ? Colors.white.withValues(alpha: 0.05)
                          : ConferenceColors.goldAlpha(0.12),
                      borderRadius: Cosmic.chipRadius,
                      border: Border.all(
                        color: muted ? Cosmic.textFaint : ConferenceColors.gold,
                        width: 1.4,
                      ),
                    ),
                    child: Icon(
                      icons[index % icons.length],
                      color: muted ? Cosmic.textFaint : ConferenceColors.gold,
                      size: 24,
                    ),
                  ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        c.name,
                        style: TextStyle(
                          color: muted ? Cosmic.textFaint : Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: muted
                                  ? Colors.white.withValues(alpha: 0.06)
                                  : ConferenceColors.goldAlpha(0.14),
                              borderRadius: Cosmic.chipRadius,
                            ),
                            child: Text(
                              priceLabel,
                              style: TextStyle(
                                color: muted
                                    ? Cosmic.textFaint
                                    : ConferenceColors.gold,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          if (dateLabel != null) ...[
                            const SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                dateLabel,
                                style: TextStyle(color: Cosmic.textMuted, fontSize: 12),
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
                _buildCardAction(c, muted: muted),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Reflects the user's state for [c]: entered → "Enter", code window over →
  /// an inert "Closed" chip, paid but not redeemed → "Enter code", otherwise
  /// "Buy"/"Register".
  Widget _buildCardAction(Conference c, {bool muted = false}) {
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

    // Already redeemed: the only thing left to do is walk in. Never offer code
    // entry here — that code is spent, and re-submitting it comes back USED.
    if (_accessIds.contains(c.id)) {
      return FilledButton(
        style: FilledButton.styleFrom(
          backgroundColor: ConferenceColors.gold,
          foregroundColor: Colors.black,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          shape: const RoundedRectangleBorder(
            borderRadius: Cosmic.chipRadius,
            side: BorderSide(color: ConferenceColors.gold),
          ),
        ),
        onPressed: _buyingId == null ? () => _enter(c) : null,
        child: const Text('Enter', style: TextStyle(fontWeight: FontWeight.w700)),
      );
    }

    // Code window is over — nothing to buy and nothing that would redeem, so
    // show state rather than a control that can only fail.
    if (c.isTicketCodeStopped) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          borderRadius: Cosmic.chipRadius,
          border: Border.all(color: Cosmic.textFaint),
        ),
        child: Text(
          'Closed',
          style: TextStyle(
            color: Cosmic.textFaint,
            fontWeight: FontWeight.w700,
            fontSize: 13,
          ),
        ),
      );
    }

    final hasTicket = _ticketIds.contains(c.id);
    final label = hasTicket ? 'Enter code' : (c.isFree ? 'Register' : 'Buy');
    final onTap = hasTicket ? () => _promptCode(c) : () => _buyTicket(c);

    return FilledButton(
      style: FilledButton.styleFrom(
        backgroundColor: muted
            ? Colors.white.withValues(alpha: 0.06)
            : ConferenceColors.goldAlpha(0.16),
        foregroundColor: muted ? Cosmic.textMuted : ConferenceColors.gold,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        shape: RoundedRectangleBorder(
          borderRadius: Cosmic.chipRadius,
          side: BorderSide(
            color: muted ? Cosmic.textFaint : ConferenceColors.goldAlpha(0.5),
          ),
        ),
      ),
      onPressed: _buyingId == null ? onTap : null,
      child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
    );
  }
}

/// One selectable ticket type in the picker: name, price, and what it includes.
class _TierOption extends StatelessWidget {
  const _TierOption({required this.tier, required this.onTap});

  final ConferenceTier tier;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final price = '\$${(tier.priceCents / 100).toStringAsFixed(2)}';

    return InkWell(
      onTap: onTap,
      borderRadius: Cosmic.chipRadius,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.05),
          borderRadius: Cosmic.chipRadius,
          border: Border.all(color: ConferenceColors.goldAlpha(0.4)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    tier.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  price,
                  style: const TextStyle(
                    color: ConferenceColors.gold,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            if (tier.perks.isNotEmpty) ...[
              const SizedBox(height: 8),
              for (final perk in tier.perks)
                Padding(
                  padding: const EdgeInsets.only(bottom: 3),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.check_rounded,
                        size: 14,
                        color: ConferenceColors.goldAlpha(0.8),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          perk,
                          style: TextStyle(
                            color: Cosmic.textMuted,
                            fontSize: 12.5,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ],
        ),
      ),
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
    final paint = Paint()..color = Cosmic.textFaint.withValues(alpha: 0.5);
    for (final p in positions) {
      canvas.drawCircle(Offset(p.dx * size.width, p.dy * size.height), 0.8, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _StarfieldPainter oldDelegate) => false;
}
