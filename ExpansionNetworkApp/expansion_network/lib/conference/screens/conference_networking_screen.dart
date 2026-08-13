import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../conference_analytics.dart';
import '../../services/expansion_session_service.dart' show userMessageForFirebaseCallableError;
import '../current_conference_holder.dart';
import '../models/conference_networking_profile.dart';
import '../services/conference_networking_service.dart';
import '../theme/conference_colors.dart';
import '../widgets/conference_background.dart';
import '../../theme/cosmic_content.dart';

/// Networking Zone (Tinder-style). Attendees are auto-enrolled (discoverable on);
/// the gear toggles that off. Cards are ranked by shared goals / complementary
/// skills / industry; a mutual right-swipe creates a match server-side and seeds
/// a DM with an icebreaker — the "It's a match!" screen hands off to that chat.
class ConferenceNetworkingScreen extends StatefulWidget {
  const ConferenceNetworkingScreen({super.key});

  @override
  State<ConferenceNetworkingScreen> createState() => _ConferenceNetworkingScreenState();
}

enum _Anim { none, snap, exit }

class _ConferenceNetworkingScreenState extends State<ConferenceNetworkingScreen>
    with SingleTickerProviderStateMixin {
  final ConferenceNetworkingService _service = ConferenceNetworkingService();

  String? _conferenceId;
  bool _loading = true;
  String? _error;
  bool _enabled = true;

  NetworkingProfile? _me;
  List<NetworkingProfile> _allProfiles = const [];
  Set<String> _serverSwipes = const {};
  final List<String> _consumed = []; // optimistic session swipe stack (for undo)

  StreamSubscription<NetworkingProfile?>? _meSub;
  StreamSubscription<List<NetworkingProfile>>? _deckSub;
  StreamSubscription<Set<String>>? _swipeSub;

  // Card drag/fling animation.
  late final AnimationController _anim;
  Tween<Offset> _tween = Tween(begin: Offset.zero, end: Offset.zero);
  _Anim _mode = _Anim.none;
  bool _pendingLike = false;
  Offset _drag = Offset.zero;

  NetworkingCandidate? _matchWith;

  @override
  void initState() {
    super.initState();
    logConferenceEvent(ConferenceAnalytics.networkingViewed);
    _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 260))
      ..addListener(() {
        if (_mode == _Anim.none) return;
        setState(() => _drag = _tween.evaluate(_anim));
      })
      ..addStatusListener((s) {
        if (s != AnimationStatus.completed) return;
        if (_mode == _Anim.exit) _onExitComplete();
        _mode = _Anim.none;
        _anim.reset();
      });
    _bootstrap();
  }

  @override
  void dispose() {
    _meSub?.cancel();
    _deckSub?.cancel();
    _swipeSub?.cancel();
    _anim.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    final cid = CurrentConferenceHolder.instance.conferenceId;
    if (uid == null || cid == null) {
      setState(() {
        _loading = false;
        _error = 'Networking is unavailable right now.';
      });
      return;
    }
    _conferenceId = cid;
    try {
      final res = await _service.ensureProfile(conferenceId: cid);
      if (!mounted) return;
      _enabled = res['enabled'] != false;
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = userMessageForFirebaseCallableError(e);
      });
      return;
    }
    _meSub = _service.watchMyProfile(cid, uid).listen((p) {
      if (!mounted) return;
      setState(() {
        _me = p;
        if (p != null) _enabled = p.enabled;
      });
    });
    _deckSub = _service.watchDeck(cid).listen((list) {
      if (!mounted) return;
      setState(() => _allProfiles = list);
    });
    _swipeSub = _service.watchMySwipes(cid, uid).listen((s) {
      if (!mounted) return;
      setState(() => _serverSwipes = s);
    });
    if (mounted) setState(() => _loading = false);
  }

  /// The ranked, still-swipeable deck (excludes self + already-swiped + this
  /// session's optimistic swipes).
  List<NetworkingCandidate> get _deckList {
    final me = _me;
    if (me == null) return const [];
    final exclude = <String>{..._serverSwipes, ..._consumed, me.uid};
    return ConferenceNetworkingService.rankCandidates(me, _allProfiles, excludeUids: exclude);
  }

  bool get _canUndo => _consumed.isNotEmpty;

  // ---- Swipe mechanics ----
  void _snapBack() {
    if (_anim.isAnimating) return;
    _mode = _Anim.snap;
    _tween = Tween(begin: _drag, end: Offset.zero);
    _anim.forward(from: 0);
  }

  void _fly(bool like) {
    if (_anim.isAnimating || _deckList.isEmpty) return;
    final w = MediaQuery.of(context).size.width;
    _mode = _Anim.exit;
    _pendingLike = like;
    _tween = Tween(begin: _drag, end: Offset(like ? w * 1.4 : -w * 1.4, _drag.dy - 40));
    _anim.forward(from: 0);
  }

  void _onExitComplete() {
    final deck = _deckList;
    if (deck.isEmpty) {
      setState(() => _drag = Offset.zero);
      return;
    }
    final cand = deck.first;
    final like = _pendingLike;
    setState(() {
      _drag = Offset.zero;
      _consumed.add(cand.profile.uid); // advance the deck optimistically
    });
    _recordSwipe(cand, like);
  }

  Future<void> _recordSwipe(NetworkingCandidate cand, bool like) async {
    final cid = _conferenceId;
    if (cid == null) return;
    try {
      final res = await _service.recordSwipe(
        conferenceId: cid,
        targetUid: cand.profile.uid,
        like: like,
        reason: cand.reason,
        icebreaker: like ? _icebreakerFor(cand) : null,
      );
      logConferenceEvent(() => ConferenceAnalytics.networkingSwiped(
            targetUid: cand.profile.uid,
            liked: like,
          ));
      if (res['matched'] == true) {
        logConferenceEvent(() => ConferenceAnalytics.networkingMatched(
              targetUid: cand.profile.uid,
            ));
      }
      if (!mounted) return;
      if (res['matched'] == true) setState(() => _matchWith = cand);
    } catch (e) {
      if (!mounted) return;
      setState(() => _consumed.remove(cand.profile.uid)); // revert; card returns
      _snack(userMessageForFirebaseCallableError(e));
    }
  }

  Future<void> _undo() async {
    if (!_canUndo || _anim.isAnimating) return;
    final cid = _conferenceId;
    if (cid == null) return;
    final targetUid = _consumed.last;
    try {
      await _service.undoSwipe(conferenceId: cid, targetUid: targetUid);
      if (!mounted) return;
      setState(() {
        _consumed.remove(targetUid);
        _matchWith = null;
      });
    } catch (e) {
      if (!mounted) return;
      _snack(userMessageForFirebaseCallableError(e));
    }
  }

  String _icebreakerFor(NetworkingCandidate c) {
    final first = c.profile.displayName.split(' ').first;
    return c.reason != null
        ? '${c.reason} — want to compare notes?'
        : 'Hey $first! Great to match — what brings you to the conference?';
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(msg)));
  }

  void _back() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/conference/lobby');
    }
  }

  Future<void> _setEnabled(bool v) async {
    final cid = _conferenceId;
    if (cid == null) return;
    setState(() => _enabled = v); // optimistic
    try {
      await _service.setEnabled(conferenceId: cid, enabled: v);
      logConferenceEvent(() => ConferenceAnalytics.networkingToggled(enabled: v));
    } catch (e) {
      if (!mounted) return;
      setState(() => _enabled = !v); // revert
      _snack(userMessageForFirebaseCallableError(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: ConferenceGridBackground(
        child: SafeArea(
          child: Stack(
            children: [
              _bodyForState(),
              if (_matchWith != null) _matchOverlay(_matchWith!),
            ],
          ),
        ),
      ),
    );
  }

  Widget _bodyForState() {
    if (_loading) {
      return Column(children: [
        _topBar(),
        const Expanded(child: Center(child: CircularProgressIndicator(color: ConferenceColors.gold))),
      ]);
    }
    if (_error != null) {
      return Column(children: [_topBar(), Expanded(child: _errorState(_error!))]);
    }
    if (!_enabled) {
      return Column(children: [_topBar(), Expanded(child: _pausedState())]);
    }
    final deck = _deckList;
    if (deck.isEmpty) {
      return Column(children: [_topBar(), Expanded(child: _caughtUp())]);
    }
    return Column(children: [_topBar(), Expanded(child: _deck(deck)), _actions()]);
  }

  // ---- Top bar ----
  Widget _topBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
      child: Row(
        children: [
          _circleBtn(Icons.arrow_back_rounded, _back),
          Expanded(
            child: Column(
              children: [
                const Text('CONNECT',
                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: 1)),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: _enabled ? const Color(0xFF34D399) : Cosmic.textFaint,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(_enabled ? 'You’re discoverable' : 'Hidden — tap the gear',
                        style: TextStyle(color: Cosmic.textMuted, fontSize: 11)),
                  ],
                ),
              ],
            ),
          ),
          // Your existing matches ("where do I go to see who I matched with?").
          _circleBtn(Icons.favorite_outline_rounded, () => context.push('/matches')),
          const SizedBox(width: 8),
          _circleBtn(Icons.settings_rounded, _openSettings),
        ],
      ),
    );
  }

  Widget _circleBtn(IconData icon, VoidCallback? onTap) {
    return InkResponse(
      onTap: onTap,
      radius: 26,
      child: Opacity(
        opacity: onTap == null ? 0.35 : 1,
        child: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withValues(alpha: 0.06),
            border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
          ),
          child: Icon(icon, size: 20, color: Cosmic.textMuted),
        ),
      ),
    );
  }

  // ---- Deck ----
  Widget _deck(List<NetworkingCandidate> deck) {
    final w = MediaQuery.of(context).size.width;
    final angle = (_drag.dx / w) * 0.32;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Stack(
        children: [
          if (deck.length > 1)
            Positioned.fill(
              child: Transform.scale(scale: 0.94, child: _card(deck[1], dragDx: 0, interactive: false)),
            ),
          Positioned.fill(
            child: GestureDetector(
              onTap: () => _showProfile(deck.first),
              onPanUpdate: (d) {
                if (_anim.isAnimating) return;
                setState(() => _drag += d.delta);
              },
              onPanEnd: (details) {
                if (_anim.isAnimating) return;
                final vx = details.velocity.pixelsPerSecond.dx;
                if (_drag.dx.abs() > 110 || vx.abs() > 800) {
                  _fly(vx.abs() > 800 ? vx > 0 : _drag.dx > 0);
                } else {
                  _snapBack();
                }
              },
              child: Transform.translate(
                offset: _drag,
                child: Transform.rotate(angle: angle, child: _card(deck.first, dragDx: _drag.dx, interactive: true)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _card(NetworkingCandidate cand, {required double dragDx, required bool interactive}) {
    final p = cand.profile;
    final connectOp = (dragDx / 110).clamp(0.0, 1.0);
    final passOp = (-dragDx / 110).clamp(0.0, 1.0);
    // Opaque, and it has to stay that way: this is a *stacked* deck — the next
    // candidate is drawn underneath at 0.94 scale — so any translucency here
    // lets that card's photo, name and chips show through the front one.
    // #0D0D0D is the old 5%-white tint composited over the conference black,
    // so a card over the backdrop renders exactly as it did before.
    const panelColor = Color(0xFF0D0D0D);
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: Cosmic.chipRadius,
        color: panelColor,
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
        boxShadow: interactive
            ? [BoxShadow(color: ConferenceColors.goldAlpha(0.12), blurRadius: 24, spreadRadius: 1)]
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ---- Photo region ----
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                _photo(p, 64),
                // Soft scrim into the info panel.
                const Align(
                  alignment: Alignment.bottomCenter,
                  child: FractionallySizedBox(
                    heightFactor: 0.4,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Colors.transparent, panelColor],
                        ),
                      ),
                    ),
                  ),
                ),
                // Reason banner — the prominent "why you should meet".
                if (cand.reason != null)
                  Positioned(
                    top: 14,
                    left: 14,
                    right: 60,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: ConferenceColors.gold,
                        borderRadius: Cosmic.chipRadius,
                        boxShadow: [BoxShadow(color: ConferenceColors.goldAlpha(0.4), blurRadius: 12)],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.auto_awesome_rounded, size: 14, color: Colors.black),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(cand.reason!,
                                style: const TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.w800),
                                overflow: TextOverflow.ellipsis),
                          ),
                        ],
                      ),
                    ),
                  ),
                // Match %.
                Positioned(
                  top: 14,
                  right: 14,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.5),
                      shape: BoxShape.circle,
                      border: Border.all(color: ConferenceColors.gold, width: 1.5),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('${cand.matchScore}%',
                            style: const TextStyle(color: ConferenceColors.gold, fontSize: 13, fontWeight: FontWeight.w800)),
                        const Text('match', style: TextStyle(color: Colors.white70, fontSize: 7, letterSpacing: 0.5)),
                      ],
                    ),
                  ),
                ),
                // Drag stamps.
                if (interactive) ...[
                  Positioned(top: 40, left: 20, child: Opacity(opacity: passOp, child: _stamp('PASS', Colors.redAccent, -0.3))),
                  Positioned(top: 40, right: 20, child: Opacity(opacity: connectOp, child: _stamp('CONNECT', ConferenceColors.gold, 0.3))),
                ],
              ],
            ),
          ),
          // ---- Info panel ----
          Container(
            width: double.infinity,
            color: panelColor,
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(p.displayName, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
                if (p.subtitle.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(p.subtitle,
                      style: TextStyle(color: Cosmic.textMuted, fontSize: 14, fontWeight: FontWeight.w500)),
                ],
                if (p.bio.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(p.bio,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: Cosmic.textMuted, fontSize: 13, height: 1.35)),
                ],
                // Capped on the card: the deck card is a fixed-height tile, and
                // a member with a dozen long skills ("Investor communication
                // and financial reporting") grew this panel past the card and
                // overflowed the photo out of existence. The full lists are one
                // tap away in the profile sheet, which scrolls.
                if (p.offers.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  _chipRow('CAN OFFER', p.offers, ConferenceColors.gold, maxItems: 3),
                ],
                if (p.seeks.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _chipRow('LOOKING FOR', p.seeks, Colors.white, maxItems: 3),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _photo(NetworkingProfile p, double initialsSize) {
    if (p.photoUrl.isEmpty) return _photoFallback(p, initialsSize);
    return Image.network(
      p.photoUrl,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => _photoFallback(p, initialsSize),
    );
  }

  Widget _photoFallback(NetworkingProfile p, double initialsSize) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [ConferenceColors.goldAlpha(0.35), Colors.black],
        ),
      ),
      child: Center(
        child: Text(p.initials, style: TextStyle(color: Colors.white, fontSize: initialsSize, fontWeight: FontWeight.w800)),
      ),
    );
  }

  /// [maxItems] bounds how many chips render, with a `+N more` chip standing in
  /// for the rest. Null shows everything — used by the scrollable profile sheet.
  Widget _chipRow(String label, List<String> items, Color tint, {int? maxItems}) {
    final shown = maxItems == null || items.length <= maxItems
        ? items
        : items.take(maxItems).toList();
    final hidden = items.length - shown.length;
    final chipColor = tint == ConferenceColors.gold ? ConferenceColors.gold : Colors.white;

    Widget chip(String text) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: tint.withValues(alpha: 0.14),
            borderRadius: Cosmic.chipRadius,
            border: Border.all(color: tint.withValues(alpha: 0.3)),
          ),
          // A long skill would otherwise force its own full-width Wrap line;
          // capped and ellipsized it stays one predictable row height.
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 150),
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: chipColor, fontSize: 11),
            ),
          ),
        );

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        SizedBox(
          width: 78,
          child: Text(label,
              style: TextStyle(color: tint.withValues(alpha: 0.9), fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 0.6)),
        ),
        Expanded(
          child: Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final it in shown) chip(it),
              if (hidden > 0) chip('+$hidden more'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _stamp(String text, Color color, double angle) {
    return Transform.rotate(
      angle: angle,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          borderRadius: Cosmic.chipRadius,
          border: Border.all(color: color, width: 3),
          color: Colors.black.withValues(alpha: 0.3),
        ),
        child: Text(text, style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: 1)),
      ),
    );
  }

  // ---- Action buttons ----
  Widget _actions() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _actionBtn(Icons.undo_rounded, Colors.white70, 52, _canUndo ? _undo : null),
          const SizedBox(width: 28),
          _actionBtn(Icons.close_rounded, Colors.redAccent, 64, () => _fly(false)),
          const SizedBox(width: 28),
          _actionBtn(Icons.favorite_rounded, ConferenceColors.gold, 76, () => _fly(true), filled: true),
        ],
      ),
    );
  }

  Widget _actionBtn(IconData icon, Color color, double size, VoidCallback? onTap, {bool filled = false}) {
    final enabled = onTap != null;
    return GestureDetector(
      onTap: onTap,
      child: Opacity(
        opacity: enabled ? 1 : 0.35,
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: filled ? color : Colors.white.withValues(alpha: 0.06),
            border: Border.all(color: color.withValues(alpha: 0.6), width: 2),
            boxShadow: filled ? [BoxShadow(color: color.withValues(alpha: 0.4), blurRadius: 16)] : null,
          ),
          child: Icon(icon, color: filled ? Colors.black : color, size: size * 0.42),
        ),
      ),
    );
  }

  // ---- States: caught-up / paused / error ----
  Widget _caughtUp() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: ConferenceColors.goldAlpha(0.12),
                border: Border.all(color: ConferenceColors.goldAlpha(0.4)),
              ),
              child: const Icon(Icons.check_rounded, size: 44, color: ConferenceColors.gold),
            ),
            const SizedBox(height: 20),
            const Text("You're all caught up",
                style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text('New people join throughout the event — check back soon.',
                textAlign: TextAlign.center, style: TextStyle(color: Cosmic.textMuted, height: 1.4)),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: ConferenceColors.gold,
                side: BorderSide(color: ConferenceColors.goldAlpha(0.5)),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              ),
              onPressed: () => setState(() {}),
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Refresh'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _pausedState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.05),
                border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
              ),
              child: Icon(Icons.visibility_off_rounded, size: 42, color: Cosmic.textMuted),
            ),
            const SizedBox(height: 20),
            const Text('Networking paused',
                style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text("You're hidden from other attendees and won't see new people while this is off.",
                textAlign: TextAlign.center, style: TextStyle(color: Cosmic.textMuted, height: 1.4)),
            const SizedBox(height: 20),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: ConferenceColors.gold,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
              ),
              onPressed: () => _setEnabled(true),
              child: const Text('TURN NETWORKING ON',
                  style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.6)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _errorState(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_rounded, size: 42, color: Cosmic.textFaint),
            const SizedBox(height: 16),
            Text(message, textAlign: TextAlign.center, style: TextStyle(color: Cosmic.textMuted, height: 1.4)),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: ConferenceColors.gold,
                side: BorderSide(color: ConferenceColors.goldAlpha(0.5)),
              ),
              onPressed: () {
                setState(() {
                  _loading = true;
                  _error = null;
                });
                _bootstrap();
              },
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }

  // ---- Settings (gear) ----
  void _openSettings() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: ConferenceColors.atmosphere,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Networking settings',
                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 16),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.04),
                    borderRadius: Cosmic.chipRadius,
                    border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                  ),
                  child: SwitchListTile(
                    value: _enabled,
                    activeThumbColor: Colors.black,
                    activeTrackColor: ConferenceColors.gold,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    title: const Text("I'm open to networking",
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                    subtitle: Text(
                      _enabled
                          ? 'Other attendees can find you and you can match.'
                          : "You're hidden and won't see others.",
                      style: TextStyle(color: Cosmic.textMuted, fontSize: 12),
                    ),
                    onChanged: (v) async {
                      await _setEnabled(v);
                      setSheet(() {});
                    },
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.lock_outline_rounded, size: 14, color: Cosmic.textFaint),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text('You control your visibility. A chat only opens when you both connect.',
                          style: TextStyle(color: Cosmic.textFaint, fontSize: 12)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ---- Match celebration ----
  Widget _matchOverlay(NetworkingCandidate cand) {
    final p = cand.profile;
    final firstName = p.displayName.split(' ').first;
    return Positioned.fill(
      child: Container(
        color: Colors.black.withValues(alpha: 0.92),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ShaderMask(
                  shaderCallback: (r) => const LinearGradient(
                    colors: [ConferenceColors.gold, Color(0xFFFFF3C4), ConferenceColors.gold],
                  ).createShader(r),
                  child: const Text("It's a match!",
                      style: TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                ),
                const SizedBox(height: 6),
                Text('You and $firstName both want to connect.',
                    textAlign: TextAlign.center, style: TextStyle(color: Cosmic.textMuted)),
                const SizedBox(height: 28),
                SizedBox(
                  height: 130,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Transform.translate(
                        offset: const Offset(-40, 0),
                        child: Transform.rotate(angle: -0.15, child: _roundAvatar(_me?.initials ?? 'ME', _me?.photoUrl ?? '')),
                      ),
                      Transform.translate(
                        offset: const Offset(40, 0),
                        child: Transform.rotate(angle: 0.15, child: _roundAvatar(p.initials, p.photoUrl)),
                      ),
                      const Icon(Icons.auto_awesome_rounded, color: ConferenceColors.gold, size: 30),
                    ],
                  ),
                ),
                if (cand.reason != null) ...[
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: ConferenceColors.goldAlpha(0.14),
                      borderRadius: Cosmic.chipRadius,
                      border: Border.all(color: ConferenceColors.goldAlpha(0.4)),
                    ),
                    child: Text(cand.reason!, style: const TextStyle(color: ConferenceColors.gold, fontWeight: FontWeight.w700)),
                  ),
                ],
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: ConferenceColors.gold,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
                    ),
                    onPressed: () {
                      setState(() => _matchWith = null);
                      context.push('/messages/direct/${p.uid}');
                    },
                    child: const Text('SEND A MESSAGE', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.8)),
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => setState(() => _matchWith = null),
                  style: TextButton.styleFrom(foregroundColor: Cosmic.textMuted),
                  child: const Text('Keep swiping'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _roundAvatar(String initials, String photoUrl) {
    return Container(
      width: 96,
      height: 96,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: ConferenceColors.goldAlpha(0.3),
        border: Border.all(color: ConferenceColors.gold, width: 3),
      ),
      child: photoUrl.isEmpty
          ? Center(child: Text(initials, style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)))
          : Image.network(photoUrl, fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Center(
                  child: Text(initials, style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)))),
    );
  }

  // ---- Profile detail sheet ----
  void _showProfile(NetworkingCandidate cand) {
    final p = cand.profile;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: ConferenceColors.atmosphere,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.8,
        maxChildSize: 0.92,
        builder: (ctx, sc) => SingleChildScrollView(
          controller: sc,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AspectRatio(aspectRatio: 1.3, child: _photo(p, 60)),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p.displayName, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
                    if (p.subtitle.isNotEmpty)
                      Text(p.subtitle, style: const TextStyle(color: Colors.white, fontSize: 14)),
                    if (p.location.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Row(children: [
                        Icon(Icons.place_rounded, size: 14, color: Cosmic.textMuted),
                        const SizedBox(width: 4),
                        Text(p.location, style: TextStyle(color: Cosmic.textMuted, fontSize: 13)),
                      ]),
                    ],
                    if (p.bio.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Text(p.bio, style: TextStyle(color: Cosmic.textMuted, height: 1.5)),
                    ],
                    if (p.offers.isNotEmpty) ...[
                      const SizedBox(height: 18),
                      _chipRow('CAN OFFER', p.offers, ConferenceColors.gold),
                    ],
                    if (p.seeks.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      _chipRow('LOOKING FOR', p.seeks, Colors.white),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
