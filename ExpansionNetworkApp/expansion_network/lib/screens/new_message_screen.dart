import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../analytics/expansion_analytics.dart';
import '../models/network_member_hit.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../theme/cosmic_content.dart';
import '../widgets/page_header.dart';
import '../widgets/poster_profile_avatar.dart';

/// Start a new direct conversation by searching for a person.
///
/// Messages could only ever be started from someone's card elsewhere in the
/// app, so testers who opened the Messages tab with nobody to reply to had no
/// way forward. Reuses [UserProfileRepository.searchMembersByName] — the same
/// name search behind Explore's member lookup — so results are consistent
/// wherever you look someone up.
///
/// There is nothing to create here: opening the chat is enough, because
/// `dm_threads/{a_b}` is written by the first message sent (see [DmRepository]),
/// and the rules allow reading a thread that doesn't exist yet.
class NewMessageScreen extends StatefulWidget {
  const NewMessageScreen({super.key});

  @override
  State<NewMessageScreen> createState() => _NewMessageScreenState();
}

class _NewMessageScreenState extends State<NewMessageScreen> {
  final UserProfileRepository _profiles = UserProfileRepository();
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focus = FocusNode();

  String _query = '';
  bool _loading = false;
  List<NetworkMemberHit> _hits = const [];

  /// Guards against a slow early request landing after a later, narrower one.
  int _requestSeq = 0;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focus.requestFocus();
      unawaited(ExpansionAnalytics.log('messages_new_started', sourceScreen: 'messages_new'));
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onChanged(String raw) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 280), () => _search(raw));
    final q = raw.trim();
    if (q.length < 2 && (_hits.isNotEmpty || _loading)) {
      setState(() {
        _query = q;
        _hits = const [];
        _loading = false;
      });
    } else {
      setState(() => _query = q);
    }
  }

  Future<void> _search(String raw) async {
    final q = raw.trim();
    if (q.length < 2) return;
    final seq = ++_requestSeq;
    setState(() => _loading = true);
    try {
      final uid = FirebaseAuth.instance.currentUser?.uid;
      final hits = await _profiles.searchMembersByName(q, excludeUid: uid);
      if (!mounted || seq != _requestSeq) return;
      setState(() {
        _hits = hits;
        _loading = false;
      });
    } catch (_) {
      if (!mounted || seq != _requestSeq) return;
      setState(() {
        _hits = const [];
        _loading = false;
      });
    }
  }

  void _openChat(NetworkMemberHit hit) {
    unawaited(
      ExpansionAnalytics.log(
        'messages_new_thread_opened',
        entityId: hit.uid,
        sourceScreen: 'messages_new',
        attachmentType: 'dm',
      ),
    );
    // Replace rather than push: backing out of a brand-new chat should land on
    // the inbox, not on the search that got you there.
    context.pushReplacement('/messages/direct/${hit.uid}');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            PageHeader(
              title: 'New message',
              subtitle: 'Search for anyone in the network and start a conversation.',
              leading: context.canPop()
                  ? IconButton(
                      icon: const Icon(Icons.arrow_back),
                      onPressed: () => context.pop(),
                    )
                  : null,
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(Cosmic.gutter, 0, Cosmic.gutter, 12),
              child: TextField(
                controller: _controller,
                focusNode: _focus,
                onChanged: _onChanged,
                onSubmitted: _search,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: 'Search by first or last name',
                  filled: true,
                  fillColor: AppColors.card,
                  prefixIcon: const Icon(Icons.search, color: AppColors.mutedForeground),
                  suffixIcon: _query.isEmpty
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.close_rounded, color: AppColors.mutedForeground),
                          onPressed: () {
                            _controller.clear();
                            _onChanged('');
                          },
                        ),
                  border: _border(AppColors.border),
                  enabledBorder: _border(AppColors.border),
                  focusedBorder: _border(AppColors.primary),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
            ),
            Expanded(child: _results()),
          ],
        ),
      ),
    );
  }

  static OutlineInputBorder _border(Color color) {
    return OutlineInputBorder(
      borderRadius: Cosmic.chipRadius,
      borderSide: BorderSide(color: color),
    );
  }

  Widget _results() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }
    if (_query.length < 2) {
      return _hint(
        Icons.person_search_rounded,
        'Find someone to message',
        'Type at least 2 characters of their first or last name.',
      );
    }
    if (_hits.isEmpty) {
      return _hint(
        Icons.search_off_rounded,
        'No members match that search',
        'Check the spelling, or try just their first name.',
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(Cosmic.gutter, 0, Cosmic.gutter, 32),
      itemCount: _hits.length,
      itemBuilder: (context, i) {
        final hit = _hits[i];
        final detail = [hit.profession, hit.locationLine]
            .where((s) => s != null && s.trim().isNotEmpty)
            .join(' · ');
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Material(
            color: AppColors.glassFill,
            borderRadius: Cosmic.chipRadius,
            child: InkWell(
              onTap: () => _openChat(hit),
              borderRadius: Cosmic.chipRadius,
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  borderRadius: Cosmic.chipRadius,
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    PosterProfileAvatar(
                      userId: hit.uid,
                      displayNameHint: hit.displayName,
                      radius: 22,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            hit.displayName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                          ),
                          if (detail.isNotEmpty) ...[
                            const SizedBox(height: 3),
                            Text(
                              detail,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 12.5, color: AppColors.mutedForeground),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.chat_bubble_outline_rounded,
                        size: 20, color: AppColors.mutedForeground),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _hint(IconData icon, String title, String body) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 40, color: AppColors.mutedForeground),
            const SizedBox(height: 14),
            Text(title,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(body,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.mutedForeground, height: 1.4)),
          ],
        ),
      ),
    );
  }
}
