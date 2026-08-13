import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../theme/cosmic_content.dart';
import '../conference_analytics.dart';
import '../current_conference_holder.dart';
import '../models/conference_networking_profile.dart';
import '../services/conference_networking_service.dart';
import '../theme/conference_colors.dart';
import '../widgets/conference_background.dart';

/// My Connections — everyone the user has matched with in the Networking Zone,
/// in one list, with a way straight into each conversation.
///
/// This exists because a match used to appear exactly once, in the celebration
/// overlay, and dismissing it lost the person: "how do we find the people we
/// matched with?" Every match is listed here whether or not anyone has spoken
/// yet — the badge and the button label say which.
///
/// Deliberately does *not* show inbound likes (people who swiped right on you
/// before you answered). Those stay hidden until the match is mutual, which is
/// the rule the whole networking zone is built on.
class ConferenceMatchesScreen extends StatefulWidget {
  const ConferenceMatchesScreen({super.key});

  @override
  State<ConferenceMatchesScreen> createState() => _ConferenceMatchesScreenState();
}

class _ConferenceMatchesScreenState extends State<ConferenceMatchesScreen> {
  final ConferenceNetworkingService _service = ConferenceNetworkingService();

  String? _conferenceId;
  String? _uid;
  bool _loading = true;
  String? _error;

  List<ConferenceMatch> _matches = const [];

  /// uid → profile, so a matched person who has since turned discoverability
  /// off still renders (the deck stream only carries `enabled` profiles).
  final Map<String, NetworkingProfile> _profiles = {};
  final Map<String, MatchTalkState> _talk = {};

  StreamSubscription<List<ConferenceMatch>>? _matchSub;

  @override
  void initState() {
    super.initState();
    logConferenceEvent(ConferenceAnalytics.connectionsViewed);
    _bootstrap();
  }

  @override
  void dispose() {
    _matchSub?.cancel();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    final cid = CurrentConferenceHolder.instance.conferenceId;
    if (uid == null || cid == null) {
      setState(() {
        _loading = false;
        _error = 'Your connections are unavailable right now.';
      });
      return;
    }
    _uid = uid;
    _conferenceId = cid;

    _matchSub = _service.watchMyMatches(cid, uid).listen(
      (list) async {
        if (!mounted) return;
        setState(() {
          _matches = list;
          _loading = false;
        });
        await _hydrate(list);
      },
      onError: (Object e) {
        if (!mounted) return;
        setState(() {
          _loading = false;
          _error = "We couldn't load your connections. $e";
        });
      },
    );
  }

  /// Fills in profile snapshots and talk state for any match not resolved yet.
  /// Runs after every stream emission but only works on new arrivals.
  Future<void> _hydrate(List<ConferenceMatch> matches) async {
    final cid = _conferenceId;
    final me = _uid;
    if (cid == null || me == null) return;

    final needProfile = matches.map((m) => m.otherUid).where((u) => !_profiles.containsKey(u)).toSet();
    final needTalk = matches.where((m) => !_talk.containsKey(m.otherUid)).toList();
    if (needProfile.isEmpty && needTalk.isEmpty) return;

    await Future.wait<void>([
      for (final uid in needProfile)
        FirebaseFirestore.instance
            .collection('conferences')
            .doc(cid)
            .collection('networkingProfiles')
            .doc(uid)
            .get()
            .then((d) {
          if (d.exists) _profiles[uid] = NetworkingProfile.fromDoc(d);
        }).catchError((_) {}),
      for (final m in needTalk)
        _service.talkStateFor(m.dmThreadId, me).then((s) => _talk[m.otherUid] = s),
    ]);
    if (mounted) setState(() {});
  }

  Future<void> _refresh() async {
    // Talk state is a point-in-time read, so drop it and let _hydrate redo it.
    _talk.clear();
    await _hydrate(_matches);
  }

  void _back() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/conference/network');
    }
  }

  List<ConferenceMatch> get _hydrated => _matches
      .map((m) => m.copyWith(
            profile: _profiles[m.otherUid],
            talkState: _talk[m.otherUid] ?? MatchTalkState.silent,
          ))
      .toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: ConferenceGridBackground(
        child: SafeArea(
          child: Column(
            children: [
              _topBar(),
              Expanded(child: _body()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: ConferenceColors.gold));
    }
    if (_error != null) return _errorState(_error!);

    final matches = _hydrated;
    if (matches.isEmpty) return _emptyState();

    return RefreshIndicator(
      onRefresh: _refresh,
      color: ConferenceColors.gold,
      backgroundColor: ConferenceColors.atmosphere,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(Cosmic.gutter, 4, Cosmic.gutter, 32),
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 4, bottom: 14),
            child: Text(
              matches.length == 1
                  ? 'You have 1 connection. You both swiped right, so a chat is already open.'
                  : 'You have ${matches.length} connections. You both swiped right, so a chat is '
                      'already open with each of them.',
              style: TextStyle(color: Cosmic.textFaint, fontSize: 12.5, height: 1.4),
            ),
          ),
          for (final m in matches) _matchCard(m),
        ],
      ),
    );
  }

  // ---- Top bar ----

  Widget _topBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 10),
      child: Row(
        children: [
          _circleBtn(Icons.arrow_back_rounded, _back),
          const Expanded(
            child: Text(
              'MY CONNECTIONS',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1),
            ),
          ),
          _circleBtn(Icons.style_rounded, () => context.go('/conference/network')),
        ],
      ),
    );
  }

  Widget _circleBtn(IconData icon, VoidCallback? onTap) {
    return InkResponse(
      onTap: onTap,
      radius: 26,
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
    );
  }

  // ---- Cards ----

  Widget _matchCard(ConferenceMatch m) {
    final p = m.profile;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: Cosmic.chipRadius,
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              p == null ? _avatarPlaceholder(46) : _avatar(p, 46),
              const SizedBox(width: 12),
              Expanded(
                child: p == null
                    ? Text(m.displayName,
                        style: const TextStyle(
                            color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700))
                    : _nameBlock(p),
              ),
              _talkBadge(m.talkState),
            ],
          ),
          if (m.reason != null) ...[
            const SizedBox(height: 10),
            _reasonPill(m.reason!),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor:
                        m.hasTalked ? Colors.white.withValues(alpha: 0.1) : ConferenceColors.gold,
                    foregroundColor: m.hasTalked ? Colors.white : Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
                  ),
                  onPressed: () => context.push('/messages/direct/${m.otherUid}'),
                  icon: Icon(
                      m.hasTalked ? Icons.forum_rounded : Icons.waving_hand_rounded,
                      size: 17),
                  label: Text(_ctaFor(m.talkState),
                      style: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.6)),
                ),
              ),
              if (p != null) ...[
                const SizedBox(width: 10),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Cosmic.textMuted,
                    side: BorderSide(color: Colors.white.withValues(alpha: 0.16)),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
                  ),
                  onPressed: () => _showProfile(p),
                  icon: const Icon(Icons.person_outline_rounded, size: 16),
                  label: const Text('Profile', style: TextStyle(fontSize: 12)),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  String _ctaFor(MatchTalkState s) {
    switch (s) {
      case MatchTalkState.silent:
        return 'SAY HELLO';
      case MatchTalkState.awaitingThem:
        return 'NUDGE THEM';
      case MatchTalkState.awaitingMe:
        return 'REPLY';
      case MatchTalkState.talking:
        return 'OPEN CHAT';
    }
  }

  Widget _talkBadge(MatchTalkState s) {
    late final String label;
    late final Color tint;
    switch (s) {
      case MatchTalkState.silent:
        label = 'Not started';
        tint = Cosmic.textFaint;
      case MatchTalkState.awaitingThem:
        label = 'Waiting on them';
        tint = Cosmic.textMuted;
      case MatchTalkState.awaitingMe:
        label = 'Your turn';
        tint = ConferenceColors.gold;
      case MatchTalkState.talking:
        label = 'Talking';
        tint = const Color(0xFF34D399);
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: tint.withValues(alpha: 0.12),
        borderRadius: Cosmic.pillRadius,
        border: Border.all(color: tint.withValues(alpha: 0.35)),
      ),
      child: Text(label, style: TextStyle(color: tint, fontSize: 10, fontWeight: FontWeight.w700)),
    );
  }

  Widget _nameBlock(NetworkingProfile p) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(p.displayName,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
        if (p.subtitle.isNotEmpty)
          Text(p.subtitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: Cosmic.textMuted, fontSize: 12)),
      ],
    );
  }

  Widget _reasonPill(String reason) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: ConferenceColors.goldAlpha(0.12),
        borderRadius: Cosmic.chipRadius,
        border: Border.all(color: ConferenceColors.goldAlpha(0.32)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.auto_awesome_rounded, size: 13, color: ConferenceColors.gold),
          const SizedBox(width: 6),
          Flexible(
            child: Text(reason,
                maxLines: 2,
                style: const TextStyle(
                    color: ConferenceColors.gold, fontSize: 11.5, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _avatar(NetworkingProfile p, double size) {
    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: ConferenceColors.goldAlpha(0.2),
        border: Border.all(color: ConferenceColors.goldAlpha(0.5), width: 1.5),
      ),
      child: p.photoUrl.isEmpty
          ? Center(child: Text(p.initials, style: _initialsStyle(size)))
          : Image.network(
              p.photoUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) =>
                  Center(child: Text(p.initials, style: _initialsStyle(size))),
            ),
    );
  }

  Widget _avatarPlaceholder(double size) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: 0.06),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Icon(Icons.person_rounded, size: size * 0.5, color: Cosmic.textFaint),
    );
  }

  TextStyle _initialsStyle(double size) => TextStyle(
        color: Colors.white,
        fontSize: size * 0.34,
        fontWeight: FontWeight.w800,
      );

  // ---- Empty / error ----

  Widget _emptyState() {
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
                color: ConferenceColors.goldAlpha(0.1),
                border: Border.all(color: ConferenceColors.goldAlpha(0.35)),
              ),
              child: const Icon(Icons.people_outline_rounded, size: 42, color: ConferenceColors.gold),
            ),
            const SizedBox(height: 20),
            const Text('No connections yet',
                style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(
              'When you and someone else both swipe right in the Networking Zone, '
              'they show up here with your chat.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Cosmic.textMuted, height: 1.4),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: ConferenceColors.gold,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
              ),
              onPressed: () => context.go('/conference/network'),
              icon: const Icon(Icons.style_rounded, size: 18),
              label: const Text('START CONNECTING',
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
            Text(message,
                textAlign: TextAlign.center,
                style: TextStyle(color: Cosmic.textMuted, height: 1.4)),
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
                _matchSub?.cancel();
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

  // ---- Profile sheet ----

  void _showProfile(NetworkingProfile p) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: ConferenceColors.atmosphere,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.92,
        builder: (ctx, sc) => SingleChildScrollView(
          controller: sc,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _avatar(p, 64),
                    const SizedBox(width: 14),
                    Expanded(child: _nameBlock(p)),
                  ],
                ),
                if (p.location.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Row(children: [
                    Icon(Icons.place_rounded, size: 14, color: Cosmic.textMuted),
                    const SizedBox(width: 4),
                    Text(p.location, style: TextStyle(color: Cosmic.textMuted, fontSize: 13)),
                  ]),
                ],
                if (p.bio.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Text(p.bio, style: TextStyle(color: Cosmic.textMuted, height: 1.5)),
                ],
                if (p.offers.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  _sheetChips('CAN OFFER', p.offers, ConferenceColors.gold),
                ],
                if (p.seeks.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _sheetChips('LOOKING FOR', p.seeks, Colors.white),
                ],
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: ConferenceColors.gold,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
                    ),
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      context.push('/messages/direct/${p.uid}');
                    },
                    child: const Text('MESSAGE',
                        style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.8)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _sheetChips(String label, List<String> items, Color tint) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(
                color: tint.withValues(alpha: 0.9),
                fontSize: 9,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.6)),
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final it in items)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: tint.withValues(alpha: 0.14),
                  borderRadius: Cosmic.chipRadius,
                  border: Border.all(color: tint.withValues(alpha: 0.3)),
                ),
                child: Text(it,
                    style: TextStyle(
                        color: tint == ConferenceColors.gold ? ConferenceColors.gold : Colors.white,
                        fontSize: 11)),
              ),
          ],
        ),
      ],
    );
  }
}
