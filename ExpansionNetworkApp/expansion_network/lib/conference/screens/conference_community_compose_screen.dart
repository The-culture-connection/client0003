import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../conference_analytics.dart';
import '../current_conference_holder.dart';
import '../models/community_post.dart';
import '../services/conference_community_service.dart';
import '../theme/conference_colors.dart';
import '../widgets/conference_background.dart';

/// Compose a Community Hub message — reached from the `+` on the feed.
///
/// The tag is free text: whatever the author types is stored (minus a leading
/// `#`) and rendered as the chip on the message card.
class ConferenceCommunityComposeScreen extends StatefulWidget {
  const ConferenceCommunityComposeScreen({super.key});

  @override
  State<ConferenceCommunityComposeScreen> createState() =>
      _ConferenceCommunityComposeScreenState();
}

class _ConferenceCommunityComposeScreenState
    extends State<ConferenceCommunityComposeScreen> {
  final ConferenceCommunityService _service = ConferenceCommunityService();
  final TextEditingController _body = TextEditingController();
  final TextEditingController _tag = TextEditingController();

  bool _posting = false;

  @override
  void initState() {
    super.initState();
    // Live preview of the chip as the tag is typed.
    _tag.addListener(_onChanged);
    _body.addListener(_onChanged);
  }

  void _onChanged() => setState(() {});

  @override
  void dispose() {
    _body.dispose();
    _tag.dispose();
    super.dispose();
  }

  Future<void> _post() async {
    final conferenceId = CurrentConferenceHolder.instance.conferenceId;
    if (conferenceId == null || _posting) return;
    if (_body.text.trim().isEmpty) return;

    setState(() => _posting = true);
    try {
      await _service.createPost(
        conferenceId: conferenceId,
        body: _body.text,
        tag: _tag.text,
      );
      logConferenceEvent(() => ConferenceAnalytics.communityPostCreated(
            bodyLength: _body.text.trim().length,
            tag: normalizeCommunityTag(_tag.text),
          ));
      if (!mounted) return;
      context.pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _posting = false);
      ScaffoldMessenger.maybeOf(context)
        ?..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(content: Text(e is StateError ? e.message : 'Could not post. $e')),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final canPost = _body.text.trim().isNotEmpty && !_posting;
    final previewTag = normalizeCommunityTag(_tag.text);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text('New message'),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: FilledButton(
              onPressed: canPost ? _post : null,
              style: FilledButton.styleFrom(
                backgroundColor: ConferenceColors.gold,
                foregroundColor: Colors.black,
                disabledBackgroundColor: Colors.white.withValues(alpha: 0.12),
                disabledForegroundColor: ConferenceColors.mutedForeground,
              ),
              child: _posting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.black,
                      ),
                    )
                  : const Text('Post'),
            ),
          ),
        ],
      ),
      extendBodyBehindAppBar: true,
      body: ConferenceGridBackground(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            children: [
              TextField(
                controller: _body,
                autofocus: true,
                minLines: 5,
                maxLines: 12,
                maxLength: ConferenceCommunityService.maxBodyLength,
                textCapitalization: TextCapitalization.sentences,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  height: 1.45,
                ),
                decoration: InputDecoration(
                  hintText: 'Share something with the room…',
                  hintStyle: const TextStyle(color: ConferenceColors.mutedForeground),
                  filled: true,
                  fillColor: ConferenceColors.card,
                  counterStyle:
                      const TextStyle(color: ConferenceColors.mutedForeground),
                  contentPadding: const EdgeInsets.all(16),
                  border: _border(),
                  enabledBorder: _border(),
                  focusedBorder: _border(focused: true),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'TAG',
                style: TextStyle(
                  color: ConferenceColors.gold,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _tag,
                maxLength: kCommunityTagMaxLength + 1, // room for a typed '#'
                textCapitalization: TextCapitalization.none,
                inputFormatters: [FilteringTextInputFormatter.deny(RegExp(r'\n'))],
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: InputDecoration(
                  prefixText: '#',
                  prefixStyle: const TextStyle(
                    color: ConferenceColors.gold,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                  hintText: 'optional — e.g. ai, web3, networking',
                  hintStyle: const TextStyle(
                    color: ConferenceColors.mutedForeground,
                    fontSize: 13,
                  ),
                  filled: true,
                  fillColor: ConferenceColors.card,
                  counterText: '',
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: _border(),
                  enabledBorder: _border(),
                  focusedBorder: _border(focused: true),
                ),
                onSubmitted: (_) => canPost ? _post() : null,
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  const Text(
                    'Appears as',
                    style: TextStyle(
                      color: ConferenceColors.mutedForeground,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.07),
                      borderRadius: BorderRadius.zero,
                      border: Border.all(color: ConferenceColors.cardBorder),
                    ),
                    child: Text(
                      previewTag == null ? 'no tag' : '#${previewTag.toUpperCase()}',
                      style: const TextStyle(
                        color: ConferenceColors.mutedForeground,
                        fontSize: 10.5,
                        letterSpacing: 0.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  OutlineInputBorder _border({bool focused = false}) => OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide: BorderSide(
          color: focused ? ConferenceColors.gold : ConferenceColors.cardBorder,
        ),
      );
}
