import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../analytics/expansion_analytics.dart';
import '../conference/current_conference_holder.dart';
import '../services/conference_matches_repository.dart';
import '../services/dm_repository.dart';
import '../theme/app_theme.dart';
import '../theme/cosmic_content.dart';
import '../widgets/page_header.dart';
import '../widgets/user_profile_modal.dart';

/// The people you've matched with in conference networking.
///
/// Two live sections — "Haven't talked yet" (mutual matches whose DM never got
/// past the auto-seeded icebreaker) and "Your matches" (everyone) — plus a
/// teaser note standing in for "who liked you": likes are stored owner-read
/// only with no queryable target field (the mutual-match secret), so pending
/// admirers can't be listed or even counted client-side, by design.
class MatchesScreen extends StatefulWidget {
  const MatchesScreen({super.key});

  @override
  State<MatchesScreen> createState() => _MatchesScreenState();
}

class _MatchesScreenState extends State<MatchesScreen> {
  final _matchesRepo = ConferenceMatchesRepository();
  final _dm = DmRepository();

  bool _loading = true;
  String? _error;
  List<MutualMatch> _matches = const [];

  /// Thread ids where a real conversation happened (more than the seeded
  /// icebreaker): the thread doc's `updated_at` has moved past `created_at`.
  Set<String> _talkedThreadIds = const {};
  StreamSubscription<List<DocumentSnapshot<Map<String, dynamic>>>>? _threadsSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(ExpansionAnalytics.log('matches_screen_started', sourceScreen: 'matches'));
    });
    _threadsSub = _dm.watchMyThreadDocs().listen((docs) {
      if (!mounted) return;
      final talked = <String>{};
      for (final d in docs) {
        final data = d.data();
        final created = data?['created_at'];
        final updated = data?['updated_at'];
        // The networking flow seeds the thread + icebreaker in one server
        // transaction, so both timestamps are identical until someone actually
        // replies. Missing timestamps (pending server write) count as talked —
        // the user just sent something themselves.
        final onlySeed = created is Timestamp && updated is Timestamp && created == updated;
        if (!onlySeed) talked.add(d.id);
      }
      setState(() => _talkedThreadIds = talked);
    }, onError: (_) {});
    _load();
  }

  @override
  void dispose() {
    _threadsSub?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final matches = await _matchesRepo.loadMyMatches();
      if (!mounted) return;
      setState(() {
        _matches = matches;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Couldn\'t load your matches. Pull to retry.';
      });
      unawaited(
        ExpansionAnalytics.log(
          'matches_screen_load_failed',
          sourceScreen: 'matches',
          extra: ExpansionAnalytics.errorExtras(e, code: 'load_matches'),
        ),
      );
    }
  }

  void _back() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/commons/messages');
    }
  }

  void _openChat(MutualMatch m, {required String source}) {
    unawaited(
      ExpansionAnalytics.log(
        'matches_say_hello_tapped',
        entityId: m.partnerUid,
        sourceScreen: 'matches',
        extra: <String, Object?>{'source': source},
      ),
    );
    // Same handoff the networking match overlay uses: the chat screen +
    // DmRepository open (or create on first send) the deterministic 1:1 thread.
    context.push('/messages/direct/${m.partnerUid}');
  }

  bool _hasTalked(MutualMatch m) {
    final me = FirebaseAuth.instance.currentUser?.uid;
    if (me == null) return false;
    return _talkedThreadIds.contains(dmThreadIdForUsers(me, m.partnerUid));
  }

  @override
  Widget build(BuildContext context) {
    final notTalked = _matches.where((m) => !_hasTalked(m)).toList();

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            PageHeader(
              title: 'Matches',
              subtitle: 'People you\'ve connected with in the Networking Zone.',
              leading: IconButton(
                icon: const Icon(Icons.arrow_back, color: AppColors.mutedForeground),
                tooltip: 'Back',
                onPressed: _back,
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primary,
                onRefresh: _load,
                child: _loading
                    ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                    : ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(
                            Cosmic.gutter, 16, Cosmic.gutter, 80),
                        children: [
                          if (_error != null) _errorBanner(_error!),
                          _likedYouTeaser(),
                          const SizedBox(height: 20),
                          if (_matches.isEmpty && _error == null)
                            _emptyState()
                          else ...[
                            if (notTalked.isNotEmpty) ...[
                              _sectionHeader('Haven\'t talked yet',
                                  'Say hello before the moment passes.'),
                              for (final m in notTalked) _matchRow(m, talked: false),
                              const SizedBox(height: 16),
                            ],
                            _sectionHeader('Your matches',
                                'Everyone you\'ve mutually connected with.'),
                            for (final m in _matches) _matchRow(m, talked: _hasTalked(m)),
                          ],
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionHeader(String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.foreground)),
          const SizedBox(height: 2),
          Text(subtitle,
              style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
        ],
      ),
    );
  }

  Widget _matchRow(MutualMatch m, {required bool talked}) {
    final preview = [
      if (m.profession.isNotEmpty) m.profession,
      if (m.reason != null) m.reason!,
    ].join(' · ');
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: CosmicPersonRow(
        name: m.displayName,
        preview: preview.isEmpty ? 'Matched at ${m.conferenceName}' : preview,
        imageUrl: m.photoUrl.isEmpty ? null : m.photoUrl,
        onAvatarTap: () => showUserProfileModal(context, userId: m.partnerUid),
        onTap: () => _openChat(m, source: talked ? 'match_row' : 'not_talked_row'),
        trailing: talked
            ? const Icon(Icons.chevron_right, color: AppColors.mutedForeground)
            : FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.onPrimary,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
                ),
                onPressed: () => _openChat(m, source: 'say_hello_button'),
                child: const Text('Say hello',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              ),
      ),
    );
  }

  /// "Matched you" stand-in. Incoming likes are server-side secrets (owner-read
  /// only, no queryable target field), so neither a list nor a count is
  /// possible client-side — and surfacing them would spoil the reveal the
  /// swipe flow is built around. This explains that instead.
  Widget _likedYouTeaser() {
    final canSwipe = CurrentConferenceHolder.instance.isOpenForEntry;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: Cosmic.chipRadius,
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.lock_outline_rounded, size: 20, color: AppColors.mutedForeground),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              canSwipe
                  ? 'Who liked you stays secret until it\'s mutual — keep swiping in the Networking Zone to reveal your next match.'
                  : 'Who liked you stays secret until it\'s mutual. New matches appear here as soon as you both connect.',
              style: const TextStyle(
                  fontSize: 12, color: AppColors.mutedForeground, height: 1.4),
            ),
          ),
          if (canSwipe) ...[
            const SizedBox(width: 8),
            TextButton(
              onPressed: () => context.push('/conference/network'),
              style: TextButton.styleFrom(foregroundColor: AppColors.primary),
              child: const Text('Swipe', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _emptyState() {
    final canSwipe = CurrentConferenceHolder.instance.isOpenForEntry;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(
        children: [
          const Icon(Icons.favorite_outline_rounded, size: 44, color: AppColors.mutedForeground),
          const SizedBox(height: 14),
          const Text('No matches yet',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.foreground)),
          const SizedBox(height: 6),
          const Text(
            'When you and another attendee both swipe right in the Networking Zone, they\'ll show up here.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: AppColors.mutedForeground, height: 1.4),
          ),
          if (canSwipe) ...[
            const SizedBox(height: 18),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.onPrimary,
              ),
              onPressed: () => context.push('/conference/network'),
              icon: const Icon(Icons.favorite_rounded, size: 18),
              label: const Text('Start swiping'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _errorBanner(String message) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: Cosmic.chipRadius,
          border: Border.all(color: AppColors.border),
        ),
        child: Text(message,
            style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
      ),
    );
  }
}
