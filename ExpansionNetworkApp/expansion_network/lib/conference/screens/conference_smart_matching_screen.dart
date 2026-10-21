import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../models/expansion_match.dart';
import '../../profile/profile_utils.dart';
import '../../services/expansion_session_service.dart' show userMessageForFirebaseCallableError;
import '../../services/user_profile_repository.dart';
import '../../theme/cosmic_content.dart';
import '../../widgets/user_profile_modal.dart';
import '../conference_analytics.dart';
import '../current_conference_holder.dart';
import '../services/conference_smart_matching_service.dart';
import '../theme/conference_colors.dart';
import '../widgets/conference_background.dart';

/// Smart Matching for the open conference — the Networking Hall's matching
/// (complementary skills, goals, light context), scored only against people
/// with a ticket to this conference.
///
/// Members who only finished the minimal onboarding can still run it, but are
/// told first that their matches may be less accurate and offered Edit Profile.
class ConferenceSmartMatchingScreen extends StatefulWidget {
  const ConferenceSmartMatchingScreen({super.key});

  @override
  State<ConferenceSmartMatchingScreen> createState() => _ConferenceSmartMatchingScreenState();
}

class _ConferenceSmartMatchingScreenState extends State<ConferenceSmartMatchingScreen> {
  final ConferenceSmartMatchingService _service = ConferenceSmartMatchingService();
  final UserProfileRepository _users = UserProfileRepository();

  String? _uid;
  String? _conferenceId;
  bool _busy = false;

  /// Null until the user doc has loaded.
  bool? _profileComplete;
  StreamSubscription<bool>? _profileSub;

  @override
  void initState() {
    super.initState();
    logConferenceEvent(ConferenceAnalytics.smartMatchingViewed);
    _uid = FirebaseAuth.instance.currentUser?.uid;
    _conferenceId = CurrentConferenceHolder.instance.conferenceId;
    final uid = _uid;
    if (uid != null) {
      _profileSub = _service.watchProfileComplete(uid).listen(
        (complete) {
          if (mounted) setState(() => _profileComplete = complete);
        },
        onError: (_) {/* Treated as unknown; the run itself still works. */},
      );
    }
  }

  @override
  void dispose() {
    _profileSub?.cancel();
    super.dispose();
  }

  void _back() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/conference/lobby');
    }
  }

  void _openCompleteProfile() {
    logConferenceEvent(ConferenceAnalytics.smartMatchingCompleteProfileTapped);
    context.push('/profile/edit');
  }

  /// Entry point for the Run button: warns first when the profile is incomplete.
  Future<void> _onRunPressed() async {
    if (_busy) return;
    if (_profileComplete == false) {
      final choice = await showDialog<String>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: ConferenceColors.atmosphere,
          shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
          title: const Text(
            'Your profile isn’t complete',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
          ),
          content: Text(
            'Your matches may not be as accurate because you have not completed your '
            'profile. Complete it for the best matches, or run matching now.',
            style: TextStyle(color: Cosmic.textBody, height: 1.4),
          ),
          actionsAlignment: MainAxisAlignment.spaceBetween,
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop('run'),
              child: const Text('Run matching', style: TextStyle(color: ConferenceColors.gold)),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: ConferenceColors.gold,
                foregroundColor: Colors.black,
              ),
              onPressed: () => Navigator.of(ctx).pop('complete'),
              child: const Text('Complete profile'),
            ),
          ],
        ),
      );
      if (!mounted) return;
      if (choice == 'complete') {
        _openCompleteProfile();
        return;
      }
      if (choice != 'run') return;
    }
    await _run();
  }

  Future<void> _run() async {
    final cid = _conferenceId;
    if (cid == null) return;
    setState(() => _busy = true);
    logConferenceEvent(
      () => ConferenceAnalytics.smartMatchingRun(profileComplete: _profileComplete != false),
    );
    try {
      final data = await _service.runMatching(cid);
      final written = data['matchDocumentsWritten'];
      if (mounted && written is num && written == 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No strong matches at this conference yet — try again as more attendees join.'),
          ),
        );
      }
    } catch (e) {
      logConferenceEvent(ConferenceAnalytics.smartMatchingFailed);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(userMessageForFirebaseCallableError(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final uid = _uid;
    final cid = _conferenceId;
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: ConferenceGridBackground(
        child: SafeArea(
          child: Column(
            children: [
              _topBar(),
              Expanded(
                child: uid == null || cid == null
                    ? _message('Smart matching is unavailable right now.')
                    : StreamBuilder<List<ExpansionMatch>>(
                        stream: _service.watchMatches(uid, cid),
                        builder: (context, snap) => _body(snap),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _body(AsyncSnapshot<List<ExpansionMatch>> snap) {
    final matches = snap.data ?? const <ExpansionMatch>[];
    final loading = snap.connectionState == ConnectionState.waiting && !snap.hasData;
    return ListView(
      padding: const EdgeInsets.fromLTRB(Cosmic.gutter, 4, Cosmic.gutter, 32),
      children: [
        Text(
          'Find the attendees you’re most compatible with, based on complementary skills, '
          'business goals, and a little context like city and tribe.',
          style: TextStyle(color: Cosmic.textBody, fontSize: 13, height: 1.45),
        ),
        if (_profileComplete == false) ...[
          const SizedBox(height: 14),
          _disclaimerCard(),
        ],
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: ConferenceColors.gold,
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
            ),
            onPressed: _busy ? null : _onRunPressed,
            icon: _busy
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                  )
                : const Icon(Icons.auto_awesome_rounded, size: 18),
            label: Text(
              _busy ? 'FINDING YOUR MATCHES…' : (matches.isEmpty ? 'RUN MATCHING' : 'RUN AGAIN'),
              style: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.6),
            ),
          ),
        ),
        const SizedBox(height: 20),
        if (loading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: CircularProgressIndicator(color: ConferenceColors.gold)),
          )
        else if (matches.isEmpty)
          Text(
            'No matches yet. Tap Run matching to see your most compatible attendees.',
            style: TextStyle(color: Cosmic.textFaint, fontSize: 12.5, height: 1.4),
          )
        else ...[
          Text(
            'YOUR TOP MATCHES (${matches.length})',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w800,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 10),
          for (final m in matches) _matchCard(m),
        ],
      ],
    );
  }

  Widget _disclaimerCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: ConferenceColors.gold.withValues(alpha: 0.08),
        borderRadius: Cosmic.chipRadius,
        border: Border.all(color: ConferenceColors.gold.withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.info_outline_rounded, size: 18, color: ConferenceColors.gold),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Your profile isn’t complete',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Your matches may not be as accurate because you have not completed your profile.',
            style: TextStyle(color: Cosmic.textBody, fontSize: 12.5, height: 1.4),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: ConferenceColors.gold,
              side: const BorderSide(color: ConferenceColors.gold),
              shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
            ),
            onPressed: _openCompleteProfile,
            child: const Text('Complete profile'),
          ),
        ],
      ),
    );
  }

  Widget _matchCard(ExpansionMatch m) {
    final why = m.whyLines;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: Cosmic.chipRadius,
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: Cosmic.chipRadius,
          onTap: () => showUserProfileModal(context, userId: m.matchedUserId),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                FutureBuilder<Map<String, dynamic>?>(
                  future: _users.getUserDoc(m.matchedUserId),
                  builder: (context, snap) => _personRow(m, snap),
                ),
                const SizedBox(height: 12),
                Text(
                  'WHY YOU MATCHED',
                  style: TextStyle(
                    color: Cosmic.textFaint,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 6),
                for (final line in why.take(6))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('· ',
                            style: TextStyle(color: ConferenceColors.gold, fontWeight: FontWeight.bold)),
                        Expanded(
                          child: Text(
                            line,
                            style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.35),
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 10),
                if (m.matchedUserId != _uid)
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.1),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: Cosmic.chipRadius),
                    ),
                    onPressed: () => context.push('/messages/direct/${m.matchedUserId}'),
                    icon: const Icon(Icons.waving_hand_rounded, size: 16),
                    label: const Text('Say hello', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _personRow(ExpansionMatch m, AsyncSnapshot<Map<String, dynamic>?> snap) {
    final d = snap.data;
    final name = d != null
        ? profileDisplayName(d)
        : (snap.connectionState == ConnectionState.waiting ? '…' : 'Member');
    final photoUrl = d != null ? profileString(d['photo_url']) : null;
    final initials = d != null ? profileInitials(d) : '?';
    final profession = d != null ? profileString(d['profession']) : null;
    return Row(
      children: [
        CircleAvatar(
          radius: 23,
          backgroundColor: ConferenceColors.gold.withValues(alpha: 0.2),
          backgroundImage: photoUrl != null ? CachedNetworkImageProvider(photoUrl) : null,
          child: photoUrl == null
              ? Text(initials,
                  style: const TextStyle(color: ConferenceColors.gold, fontWeight: FontWeight.w700))
              : null,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
              ),
              if (profession != null)
                Text(
                  profession,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: Cosmic.textMuted, fontSize: 12.5),
                ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
          decoration: BoxDecoration(
            color: ConferenceColors.gold.withValues(alpha: 0.15),
            borderRadius: Cosmic.pillRadius,
          ),
          child: Text(
            '${m.score}%',
            style: const TextStyle(color: ConferenceColors.gold, fontWeight: FontWeight.w800),
          ),
        ),
      ],
    );
  }

  Widget _message(String text) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(text, textAlign: TextAlign.center, style: TextStyle(color: Cosmic.textMuted)),
        ),
      );

  Widget _topBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 10),
      child: Row(
        children: [
          _circleBtn(Icons.arrow_back_rounded, _back),
          const Expanded(
            child: Text(
              'SMART MATCHING',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
              ),
            ),
          ),
          // Balances the back button so the title stays centred.
          const SizedBox(width: 42),
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
}
