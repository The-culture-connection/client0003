import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../services/expansion_session_service.dart'
    show userMessageForFirebaseCallableError;
import '../current_conference_holder.dart';
import '../models/conference.dart';
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
class ConferenceGateScreen extends StatefulWidget {
  const ConferenceGateScreen({super.key});

  @override
  State<ConferenceGateScreen> createState() => _ConferenceGateScreenState();
}

class _ConferenceGateScreenState extends State<ConferenceGateScreen> {
  final _code = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final ConferenceRepository _repo = ConferenceRepository();
  final ConferenceTicketService _tickets = ConferenceTicketService();

  bool _initializing = true;
  bool _busy = false;
  String? _error;
  String? _conferenceId;
  Conference? _conference;
  List<Conference> _upcoming = const [];

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
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

      // Already have access? Skip the gate.
      final uid = FirebaseAuth.instance.currentUser?.uid;
      if (conferenceId != null && uid != null) {
        final hasAccess = await _repo.hasAttendeeAccess(conferenceId, uid);
        if (hasAccess && mounted) {
          CurrentConferenceHolder.instance.conferenceId = conferenceId;
          context.go('/conference/lobby');
          return;
        }
      }

      if (!mounted) return;
      setState(() {
        _conferenceId = conferenceId;
        _conference = conference;
        _upcoming = upcoming;
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
        final code = data['code'] as String?;
        final msg = data['message'] as String?;
        setState(() => _error = msg ?? _mapError(code));
        return;
      }
      if (!mounted) return;
      CurrentConferenceHolder.instance.conferenceId = conferenceId;
      context.go('/conference/lobby');
    } catch (e) {
      setState(() => _error = userMessageForFirebaseCallableError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ConferenceColors.background,
      appBar: AppBar(
        backgroundColor: ConferenceColors.atmosphere,
        foregroundColor: ConferenceColors.gold,
        title: const Text('Conference Center'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Back to the Mortarverse',
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/mortarverse');
            }
          },
        ),
      ),
      body: SafeArea(
        child: _initializing
            ? const Center(
                child: CircularProgressIndicator(color: ConferenceColors.gold),
              )
            : SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildCodeEntry(context),
                    const SizedBox(height: 32),
                    _buildUpcoming(context),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildCodeEntry(BuildContext context) {
    final conference = _conference;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: ConferenceColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ConferenceColors.cardBorder),
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Enter your ticket code',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: ConferenceColors.gold,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              conference == null
                  ? 'Enter the code from your ticket email to enter the conference.'
                  : 'Enter the code from your ticket email to enter ${conference.name}.',
              style: const TextStyle(color: ConferenceColors.mutedForeground, fontSize: 13),
            ),
            const SizedBox(height: 18),
            TextFormField(
              controller: _code,
              autocorrect: false,
              textCapitalization: TextCapitalization.characters,
              style: const TextStyle(color: Colors.white, letterSpacing: 2),
              decoration: InputDecoration(
                labelText: 'Ticket code',
                labelStyle: const TextStyle(color: ConferenceColors.mutedForeground),
                enabledBorder: OutlineInputBorder(
                  borderSide: BorderSide(color: ConferenceColors.goldAlpha(0.4)),
                ),
                focusedBorder: const OutlineInputBorder(
                  borderSide: BorderSide(color: ConferenceColors.gold),
                ),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter your code' : null,
            ),
            if (_error != null) ...[
              const SizedBox(height: 14),
              Text(_error!, style: const TextStyle(color: Colors.redAccent)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: ConferenceColors.gold,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                    )
                  : const Text('Enter conference'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUpcoming(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Upcoming conferences',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: ConferenceColors.gold,
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 12),
        if (_upcoming.isEmpty)
          const Text(
            'No conferences are open right now.',
            style: TextStyle(color: ConferenceColors.mutedForeground),
          )
        else
          ..._upcoming.map(_buildConferenceCard),
      ],
    );
  }

  Widget _buildConferenceCard(Conference c) {
    final priceLabel = c.isFree
        ? 'Free'
        : '\$${(c.priceCents / 100).toStringAsFixed(2)} ${c.currency.toUpperCase()}';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: ConferenceColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ConferenceColors.cardBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  c.name,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15),
                ),
                const SizedBox(height: 4),
                Text(
                  priceLabel,
                  style: const TextStyle(color: ConferenceColors.mutedForeground, fontSize: 13),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          // Phase B: wire this to Stripe checkout (checkoutConferenceTicket).
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: ConferenceColors.gold,
              side: BorderSide(color: ConferenceColors.goldAlpha(0.5)),
            ),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Ticket purchase is coming soon.')),
              );
            },
            child: Text(c.isFree ? 'Register' : 'Buy ticket'),
          ),
        ],
      ),
    );
  }
}
