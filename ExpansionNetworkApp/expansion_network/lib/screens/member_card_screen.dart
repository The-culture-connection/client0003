import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../conference/conference_analytics.dart';
import '../conference/theme/conference_colors.dart';
import '../profile/profile_utils.dart';
import '../services/member_card_link.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import 'member_card_scan_screen.dart';

/// Member card: two tabs — "My Code" shows a flippable business card with your
/// QR on the back, "Scan" opens the camera and drops you straight into a chat
/// with whoever you scan.
///
/// Reached from the conference lobby FAB (gold accent) and the Profile tab
/// (Expansion red), per the convention in [ConferenceColors] that conference
/// screens stay visually distinct.
class MemberCardScreen extends StatefulWidget {
  const MemberCardScreen({
    super.key,
    this.initialTab = 0,
    this.conferenceStyled = false,
  });

  /// 0 = My Code, 1 = Scan.
  final int initialTab;

  /// Whether this was opened from the conference, which swaps the accent to
  /// [ConferenceColors.gold].
  final bool conferenceStyled;

  @override
  State<MemberCardScreen> createState() => _MemberCardScreenState();
}

class _MemberCardScreenState extends State<MemberCardScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(
    length: 2,
    vsync: this,
    initialIndex: widget.initialTab.clamp(0, 1),
  )..addListener(_onTabChanged);

  late int _index = _tabs.index;

  @override
  void initState() {
    super.initState();
    logConferenceEvent(ConferenceAnalytics.cardShown);
  }

  Color get _accent =>
      widget.conferenceStyled ? ConferenceColors.gold : AppColors.primary;

  Color get _onAccent =>
      widget.conferenceStyled ? Colors.black : AppColors.onPrimary;

  void _onTabChanged() {
    // Fires twice per swipe (start + settle); only rebuild on a real change so
    // the scanner is not torn down mid-animation.
    if (_tabs.index == _index) return;
    setState(() => _index = _tabs.index);
  }

  @override
  void dispose() {
    _tabs
      ..removeListener(_onTabChanged)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authUser = FirebaseAuth.instance.currentUser;
    if (authUser == null) {
      return const Scaffold(
        body: Center(child: Text('Sign in to view your card.')),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Card'),
        backgroundColor: AppColors.background,
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: _accent,
          labelColor: _accent,
          unselectedLabelColor: AppColors.mutedForeground,
          tabs: const [
            Tab(icon: Icon(Icons.qr_code_2_rounded), text: 'My Code'),
            Tab(icon: Icon(Icons.qr_code_scanner_rounded), text: 'Scan'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _MyCodeTab(uid: authUser.uid, accent: _accent, onAccent: _onAccent),
          // Only holds the camera open while its tab is the visible one.
          MemberCardScanView(active: _index == 1, accent: _accent),
        ],
      ),
    );
  }
}

class _MyCodeTab extends StatelessWidget {
  const _MyCodeTab({
    required this.uid,
    required this.accent,
    required this.onAccent,
  });

  final String uid;
  final Color accent;
  final Color onAccent;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      stream: UserProfileRepository().watchUserDoc(uid),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _MessagePane(text: 'Could not load your card.\n${snapshot.error}');
        }
        if (!snapshot.hasData) {
          return Center(child: CircularProgressIndicator(color: accent));
        }
        final data = snapshot.data!.data();
        if (data == null) {
          return const _MessagePane(text: 'Finish onboarding to get your card.');
        }

        return _FlipCard(
          data: data,
          uid: uid,
          email: profileString(data['email']) ??
              FirebaseAuth.instance.currentUser?.email ??
              '',
          accent: accent,
          onAccent: onAccent,
        );
      },
    );
  }
}

class _MessagePane extends StatelessWidget {
  const _MessagePane({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.mutedForeground),
        ),
      ),
    );
  }
}

class _FlipCard extends StatefulWidget {
  const _FlipCard({
    required this.data,
    required this.uid,
    required this.email,
    required this.accent,
    required this.onAccent,
  });

  final Map<String, dynamic> data;
  final String uid;
  final String email;
  final Color accent;
  final Color onAccent;

  @override
  State<_FlipCard> createState() => _FlipCardState();
}

class _FlipCardState extends State<_FlipCard> with SingleTickerProviderStateMixin {
  late final AnimationController _turns = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 520),
  );

  @override
  void dispose() {
    _turns.dispose();
    super.dispose();
  }

  void _flip() {
    if (_turns.isAnimating) return;
    if (_turns.value > 0.5) {
      _turns.reverse();
    } else {
      _turns.forward();
    }
  }

  Future<void> _share() async {
    final name = profileDisplayName(widget.data);
    logConferenceEvent(ConferenceAnalytics.cardShared);
    await SharePlus.instance.share(
      ShareParams(
        text: '$name on MORTAR — scan this in the app to start a chat:\n'
            '${buildMemberCardPayload(widget.uid)}',
        subject: 'My MORTAR card',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: GestureDetector(
                  onTap: _flip,
                  child: AnimatedBuilder(
                    animation: _turns,
                    builder: (context, _) {
                      final angle = _turns.value * math.pi;
                      final showFront = angle <= math.pi / 2;
                      return Transform(
                        alignment: Alignment.center,
                        transform: Matrix4.identity()
                          ..setEntry(3, 2, 0.001) // perspective
                          ..rotateY(angle),
                        child: showFront
                            ? _CardFront(
                                data: widget.data,
                                email: widget.email,
                                accent: widget.accent,
                                onAccent: widget.onAccent,
                              )
                            : Transform(
                                // Un-mirror the back half of the rotation.
                                alignment: Alignment.center,
                                transform: Matrix4.identity()..rotateY(math.pi),
                                child: _CardBack(uid: widget.uid),
                              ),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
          const Text(
            'Tap the card to flip it',
            style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _share,
                icon: const Icon(Icons.ios_share, size: 18),
                label: const Text('Share my card'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.foreground,
                  side: const BorderSide(color: AppColors.border),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Shared chrome so both faces are the same size and the flip has no jump.
class _CardShell extends StatelessWidget {
  const _CardShell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 0.63, // portrait business card
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.5),
              blurRadius: 24,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: child,
      ),
    );
  }
}

class _CardFront extends StatelessWidget {
  const _CardFront({
    required this.data,
    required this.email,
    required this.accent,
    required this.onAccent,
  });

  final Map<String, dynamic> data;
  final String email;
  final Color accent;
  final Color onAccent;

  @override
  Widget build(BuildContext context) {
    final photoUrl = profileString(data['photo_url']);
    final profession = profileString(data['profession']);
    final location = [
      profileString(data['city']),
      profileString(data['state']),
    ].whereType<String>().join(', ');

    return _CardShell(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircleAvatar(
            radius: 52,
            backgroundColor: accent,
            backgroundImage:
                photoUrl != null ? CachedNetworkImageProvider(photoUrl) : null,
            child: photoUrl == null
                ? Text(
                    profileInitials(data),
                    style: TextStyle(
                      fontSize: 30,
                      color: onAccent,
                      fontWeight: FontWeight.bold,
                    ),
                  )
                : null,
          ),
          const SizedBox(height: 20),
          Text(
            profileDisplayName(data),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
          ),
          if (profession != null) ...[
            const SizedBox(height: 6),
            Text(
              profession,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: accent),
            ),
          ],
          if (location.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              location,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground),
            ),
          ],
          if (email.isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(
              email,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
            ),
          ],
        ],
      ),
    );
  }
}

class _CardBack extends StatelessWidget {
  const _CardBack({required this.uid});

  final String uid;

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // White quiet-zone plate keeps contrast high for scanners against the
          // app's near-black card.
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: QrImageView(
              data: buildMemberCardPayload(uid),
              size: 200,
              backgroundColor: Colors.white,
              // Medium correction tolerates a little glare/finger occlusion
              // when someone scans off a phone screen.
              errorCorrectionLevel: QrErrorCorrectLevel.M,
              eyeStyle: const QrEyeStyle(
                eyeShape: QrEyeShape.square,
                color: Colors.black,
              ),
              dataModuleStyle: const QrDataModuleStyle(
                dataModuleShape: QrDataModuleShape.square,
                color: Colors.black,
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Scan to chat',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          const Text(
            'Have them open the Scan tab in MORTAR to start a direct message.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
          ),
        ],
      ),
    );
  }
}
