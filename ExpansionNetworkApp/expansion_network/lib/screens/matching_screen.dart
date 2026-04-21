import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../analytics/expansion_analytics.dart';
import '../models/expansion_match.dart';
import '../profile/profile_utils.dart';
import '../services/expansion_matching_repository.dart';
import '../services/expansion_session_service.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/user_profile_modal.dart';

/// Smart Matching — runs **`runExpansionUserMatching`** and lists
/// `users/{uid}/expansion_matches`.
class MatchingScreen extends StatefulWidget {
  const MatchingScreen({super.key});

  @override
  State<MatchingScreen> createState() => _MatchingScreenState();
}

class _MatchingScreenState extends State<MatchingScreen> {
  final _matchingRepo = ExpansionMatchingRepository();
  final _users = UserProfileRepository();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(ExpansionAnalytics.log('matching_screen_started', sourceScreen: 'matching'));
    });
  }

  Future<void> _runMatching() async {
    if (_busy) return;
    unawaited(ExpansionAnalytics.log('matching_start_clicked', sourceScreen: 'matching'));
    setState(() => _busy = true);
    if (!mounted) return;
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => PopScope(
        canPop: false,
        child: Center(
          child: Card(
            margin: const EdgeInsets.all(32),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(
                    width: 40,
                    height: 40,
                    child: CircularProgressIndicator(strokeWidth: 3),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Finding your matches…',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'We compare skills, goals, and a bit of context across eligible members.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    try {
      await ExpansionAnalytics.log('matching_callable_started', sourceScreen: 'matching');
      final data = await _matchingRepo.runSelfMatching();
      await ExpansionAnalytics.log(
        'matching_callable_succeeded',
        sourceScreen: 'matching',
        extra: <String, Object?>{
          'match_documents_written': data['matchDocumentsWritten'],
        },
      );
      final written = data['matchDocumentsWritten'];
      if (mounted && written is num && written == 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No strong matches right now — try again after updating your profile.')),
        );
      }
    } catch (e) {
      unawaited(
        ExpansionAnalytics.log(
          'matching_callable_failed',
          sourceScreen: 'matching',
          extra: ExpansionAnalytics.errorExtras(e, code: 'runExpansionUserMatching'),
        ),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(userMessageForFirebaseCallableError(e))),
        );
      }
    } finally {
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: AppColors.mutedForeground),
            onPressed: () => context.pop(),
          ),
          title: const Text('Smart Matching'),
        ),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text('Sign in to run matching and see your matches.'),
          ),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: StreamBuilder<List<ExpansionMatch>>(
          stream: _matchingRepo.watchMatches(user.uid),
          builder: (context, snap) {
            final matches = snap.data ?? [];
            final loadingStream = snap.connectionState == ConnectionState.waiting && !snap.hasData;

            return CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(8, 8, 16, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.arrow_back, color: AppColors.mutedForeground),
                              onPressed: () => context.pop(),
                            ),
                            Expanded(
                              child: Text(
                                'Smart Matching',
                                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w500),
                              ),
                            ),
                          ],
                        ),
                        Padding(
                          padding: const EdgeInsets.only(left: 48),
                          child: Text(
                            'Profile-based suggestions from skills, goals, and light context',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          gradient: LinearGradient(
                            colors: [AppColors.primary, AppColors.primary.withValues(alpha: 0.85)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.handshake_outlined, size: 48, color: AppColors.onPrimary),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'People worth meeting',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: AppColors.onPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'We score complementary skills and goals (and a small context boost) so you can grow your network with intent—not generic “AI” guesses.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 13, color: AppColors.onPrimary.withValues(alpha: 0.9)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('How it works', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w500)),
                            const SizedBox(height: 16),
                            _howRow(
                              Icons.swap_horiz,
                              'Skill exchange',
                              'Your desired skills are compared to others’ confident skills (and the reverse), with a bonus when both sides overlap.',
                            ),
                            _howRow(
                              Icons.flag_outlined,
                              'Goals',
                              'Business and growth goals are paired when they complement each other (for example, learning ↔ teaching or sell ↔ buy).',
                            ),
                            _howRow(
                              Icons.place_outlined,
                              'Light context',
                              'Same city or tribe can nudge the score slightly; most of the match is skills and goals.',
                            ),
                            _howRow(
                              Icons.refresh,
                              'Refresh anytime',
                              'Tap Start matching to recompute your top suggestions. Existing DMs and dismissed users are excluded server-side.',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            padding: const EdgeInsets.all(16),
                          ),
                          onPressed: _busy ? null : _runMatching,
                          icon: _busy
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                                )
                              : const Icon(Icons.play_arrow_rounded),
                          label: Text(_busy ? 'Starting…' : 'Start matching'),
                        ),
                      ),
                      if (loadingStream)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Center(child: CircularProgressIndicator()),
                        ),
                      if (!loadingStream && matches.isEmpty) ...[
                        const SizedBox(height: 16),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.card,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Text(
                            'No saved matches yet. Tap Start matching to load your list (a loading card appears while the server runs).',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground),
                          ),
                        ),
                      ],
                      if (matches.isNotEmpty) ...[
                        const SizedBox(height: 20),
                        Text(
                          'Your matches (${matches.length})',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 12),
                        ...matches.map(
                          (m) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _ExpansionMatchCard(
                              match: m,
                              users: _users,
                              onOpenProfile: () {
                                unawaited(
                                  ExpansionAnalytics.log(
                                    'matching_match_profile_opened',
                                    entityId: m.matchedUserId,
                                    sourceScreen: 'matching',
                                  ),
                                );
                                showUserProfileModal(context, userId: m.matchedUserId);
                              },
                              onMessage: () {
                                unawaited(
                                  ExpansionAnalytics.log(
                                    'matching_match_message_clicked',
                                    entityId: m.matchedUserId,
                                    sourceScreen: 'matching',
                                    attachmentType: 'dm',
                                  ),
                                );
                                context.push('/messages/direct/${m.matchedUserId}');
                              },
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.card.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Text(
                          'Run matching periodically as new members join and your profile evolves.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground),
                        ),
                      ),
                    ]),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _howRow(IconData icon, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.primary, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
                const SizedBox(height: 4),
                Text(subtitle, style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

List<String> _whyLines(ExpansionMatch m) {
  final lines = <String>[];
  for (final g in m.goalMatches) {
    if (lines.length >= 5) break;
    lines.add(g);
  }
  if (m.aNeedsFromB.isNotEmpty) {
    lines.add('You could strengthen: ${m.aNeedsFromB.take(4).join(', ')}');
  }
  if (m.bNeedsFromA.isNotEmpty) {
    lines.add('They could learn from you: ${m.bNeedsFromA.take(4).join(', ')}');
  }
  if (m.mutualSkillBonus > 0) {
    lines.add('Mutual skill overlap boost applied');
  }
  if (m.sameCity) lines.add('Same city');
  if (m.sameIndustry) lines.add('Same tribe');
  if (lines.isEmpty) {
    lines.add('Strong complementary fit from your profiles.');
  }
  return lines;
}

class _ExpansionMatchCard extends StatelessWidget {
  const _ExpansionMatchCard({
    required this.match,
    required this.users,
    required this.onOpenProfile,
    required this.onMessage,
  });

  final ExpansionMatch match;
  final UserProfileRepository users;
  final VoidCallback onOpenProfile;
  final VoidCallback onMessage;

  @override
  Widget build(BuildContext context) {
    final why = _whyLines(match);
    final me = FirebaseAuth.instance.currentUser?.uid;

    return Material(
      color: AppColors.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onOpenProfile,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FutureBuilder<Map<String, dynamic>?>(
                future: users.getUserDoc(match.matchedUserId),
                builder: (context, snap) {
                  final d = snap.data;
                  final name = d != null
                      ? profileDisplayName(d)
                      : (snap.connectionState == ConnectionState.waiting ? '…' : 'Member');
                  final photoUrl = d != null ? profileString(d['photo_url']) : null;
                  final initials = d != null ? profileInitials(d) : '?';
                  final profession = d != null ? profileString(d['profession']) : null;
                  final tribeLine = d != null
                      ? (profileString(d['tribe']) ?? profileString(d['industry']))
                      : null;
                  final city = d != null ? profileString(d['city']) : null;
                  final state = d != null ? profileString(d['state']) : null;
                  final loc = [city, state].whereType<String>().where((s) => s.isNotEmpty).join(', ');

                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: AppColors.primary,
                        backgroundImage: photoUrl != null ? CachedNetworkImageProvider(photoUrl) : null,
                        child: photoUrl == null
                            ? Text(
                                initials,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.onPrimary,
                                ),
                              )
                            : null,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (profession != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                profession,
                                style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                            if (tribeLine != null || loc.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                [tribeLine, loc.isEmpty ? null : loc].whereType<String>().join(' · '),
                                style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${match.score}%',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 12),
              const Text(
                'Why you matched',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: AppColors.mutedForeground),
              ),
              const SizedBox(height: 6),
              ...why.take(6).map(
                    (line) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('· ', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                          Expanded(
                            child: Text(line, style: const TextStyle(fontSize: 13, height: 1.35)),
                          ),
                        ],
                      ),
                    ),
                  ),
              const SizedBox(height: 10),
              Row(
                children: [
                  if (me != null && me != match.matchedUserId)
                    FilledButton.tonalIcon(
                      onPressed: onMessage,
                      icon: const Icon(Icons.chat_bubble_outline, size: 18),
                      label: const Text('Message'),
                      style: FilledButton.styleFrom(
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                    ),
                  const Spacer(),
                  Text(
                    'Tap card for full profile',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.mutedForeground),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
