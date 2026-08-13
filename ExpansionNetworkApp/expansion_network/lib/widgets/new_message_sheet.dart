import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../analytics/expansion_analytics.dart';
import '../models/network_member_hit.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../theme/cosmic_content.dart';
import 'poster_profile_avatar.dart';

/// Opens the "start a new message" person search over [context].
///
/// Same search backend and UX as Explore's Network Search (name prefix query +
/// client-side token match, 400ms debounce, 2-char minimum); tapping a person
/// closes the sheet and opens their DM thread.
Future<void> showNewMessageSheet(BuildContext context) {
  unawaited(
    ExpansionAnalytics.log('messages_new_message_opened', sourceScreen: 'messages_inbox'),
  );
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.background,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => const NewMessageSheet(),
  );
}

class NewMessageSheet extends StatefulWidget {
  const NewMessageSheet({super.key});

  @override
  State<NewMessageSheet> createState() => _NewMessageSheetState();
}

class _NewMessageSheetState extends State<NewMessageSheet> {
  final _users = UserProfileRepository();
  final _controller = TextEditingController();
  Timer? _debounce;
  String _query = '';
  bool _loading = false;
  List<NetworkMemberHit> _hits = const [];

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () => _search(value));
  }

  Future<void> _search(String raw) async {
    final q = raw.trim();
    if (!mounted) return;
    setState(() {
      _query = q;
      if (q.length < 2) {
        _hits = const [];
        _loading = false;
      }
    });
    if (q.length < 2) return;
    setState(() => _loading = true);
    try {
      final uid = FirebaseAuth.instance.currentUser?.uid;
      final hits = await _users.searchMembersByName(q, excludeUid: uid);
      if (!mounted || _query != q) return;
      setState(() {
        _hits = hits;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _hits = const [];
        _loading = false;
      });
    }
  }

  void _openChat(NetworkMemberHit hit) {
    unawaited(
      ExpansionAnalytics.log(
        'messages_new_message_person_selected',
        entityId: hit.uid,
        sourceScreen: 'messages_inbox',
      ),
    );
    Navigator.of(context).pop();
    // Thread is opened lazily — it's created on the first send, same as every
    // other entry point into the direct chat.
    context.push('/messages/direct/${hit.uid}');
  }

  static OutlineInputBorder _border(Color color) {
    return OutlineInputBorder(
      borderRadius: Cosmic.chipRadius,
      borderSide: BorderSide(color: color),
    );
  }

  @override
  Widget build(BuildContext context) {
    final insets = MediaQuery.of(context).viewInsets.bottom;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: insets),
        child: DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.75,
          maxChildSize: 0.95,
          minChildSize: 0.4,
          builder: (ctx, scrollController) => Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'New message',
                            style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                color: AppColors.foreground),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: AppColors.mutedForeground),
                          tooltip: 'Close',
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _controller,
                      autofocus: true,
                      onChanged: _onChanged,
                      textInputAction: TextInputAction.search,
                      decoration: InputDecoration(
                        hintText: 'Search members by first or last name',
                        filled: true,
                        fillColor: AppColors.card,
                        prefixIcon:
                            const Icon(Icons.search, color: AppColors.mutedForeground),
                        border: _border(AppColors.border),
                        enabledBorder: _border(AppColors.border),
                        focusedBorder: _border(AppColors.primary),
                        contentPadding:
                            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                  children: [
                    if (_loading)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.all(24),
                          child: CircularProgressIndicator(color: AppColors.primary),
                        ),
                      )
                    else if (_query.length < 2)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Text(
                          'Type at least 2 characters to find someone to message.',
                          style: TextStyle(color: AppColors.mutedForeground, fontSize: 13),
                        ),
                      )
                    else if (_hits.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Text(
                          'No members match that search.',
                          style: TextStyle(color: AppColors.mutedForeground, fontSize: 13),
                        ),
                      )
                    else
                      for (final h in _hits) _personRow(h),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _personRow(NetworkMemberHit hit) {
    final subtitle = [
      if (hit.profession != null && hit.profession!.isNotEmpty) hit.profession!,
      if (hit.locationLine != null && hit.locationLine!.isNotEmpty) hit.locationLine!,
    ].join(' · ');
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: AppColors.glassFill,
        borderRadius: Cosmic.chipRadius,
        child: InkWell(
          borderRadius: Cosmic.chipRadius,
          onTap: () => _openChat(hit),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: Cosmic.chipRadius,
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                PosterProfileAvatar(
                    userId: hit.uid, displayNameHint: hit.displayName, radius: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(hit.displayName,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: AppColors.foreground)),
                      if (subtitle.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(subtitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.mutedForeground)),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.send_outlined, size: 18, color: AppColors.mutedForeground),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
