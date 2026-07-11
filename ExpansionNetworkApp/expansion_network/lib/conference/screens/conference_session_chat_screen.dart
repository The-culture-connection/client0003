import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../services/expansion_session_service.dart'
    show userMessageForFirebaseCallableError;
import '../../widgets/user_profile_modal.dart';
import '../current_conference_holder.dart';
import '../models/conference_session.dart';
import '../models/session_message.dart';
import '../services/conference_repository.dart';
import '../services/conference_session_service.dart';
import '../theme/conference_colors.dart';

/// Per-session chat room — `conferences/{id}/sessions/{sessionId}/messages`.
/// Ports `Conference App Figma Mockup/src/app/pages/SessionChat.tsx`.
class ConferenceSessionChatScreen extends StatefulWidget {
  const ConferenceSessionChatScreen({required this.sessionId, super.key});

  final String sessionId;

  @override
  State<ConferenceSessionChatScreen> createState() => _ConferenceSessionChatScreenState();
}

class _ConferenceSessionChatScreenState extends State<ConferenceSessionChatScreen> {
  final ConferenceRepository _repo = ConferenceRepository();
  final ConferenceSessionService _service = ConferenceSessionService();
  final TextEditingController _input = TextEditingController();
  final ScrollController _scroll = ScrollController();

  String? get _conferenceId => CurrentConferenceHolder.instance.conferenceId;
  String? get _uid => FirebaseAuth.instance.currentUser?.uid;

  ConferenceSession? _session;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    final cid = _conferenceId;
    if (cid != null) {
      _repo.fetchSession(cid, widget.sessionId).then((s) {
        if (mounted) setState(() => _session = s);
      });
    }
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (!_scroll.hasClients) return;
    _scroll.jumpTo(_scroll.position.maxScrollExtent);
  }

  Future<void> _send() async {
    final cid = _conferenceId;
    final text = _input.text.trim();
    if (cid == null || text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await _service.sendSessionMessage(conferenceId: cid, sessionId: widget.sessionId, text: text);
      _input.clear();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(userMessageForFirebaseCallableError(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cid = _conferenceId;
    return Scaffold(
      backgroundColor: ConferenceColors.background,
      appBar: AppBar(
        backgroundColor: ConferenceColors.atmosphere,
        foregroundColor: ConferenceColors.gold,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Back to schedule',
          onPressed: () => context.canPop() ? context.pop() : context.go('/conference/schedule'),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              (_session?.title ?? 'Session chat').toUpperCase(),
              style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800, letterSpacing: 0.5),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (_session != null)
              Text(
                '${_session!.goingCount} attending',
                style: TextStyle(color: Colors.grey.shade400, fontSize: 12, fontWeight: FontWeight.normal),
              ),
          ],
        ),
      ),
      body: cid == null
          ? const Center(
              child: Text('No conference selected.', style: TextStyle(color: ConferenceColors.mutedForeground)),
            )
          : Column(
              children: [
                Expanded(
                  child: StreamBuilder<List<SessionMessage>>(
                    stream: _service.watchSessionMessages(cid, widget.sessionId),
                    builder: (context, snapshot) {
                      if (!snapshot.hasData) {
                        return const Center(child: CircularProgressIndicator(color: ConferenceColors.gold));
                      }
                      final messages = snapshot.data!;
                      if (messages.isEmpty) {
                        return Center(
                          child: Text('No messages yet — say hello 👋',
                              style: TextStyle(color: Colors.grey.shade500)),
                        );
                      }
                      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
                      return ListView.builder(
                        controller: _scroll,
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                        itemCount: messages.length,
                        itemBuilder: (context, i) => _bubble(messages[i]),
                      );
                    },
                  ),
                ),
                _inputBar(),
              ],
            ),
    );
  }

  Widget _bubble(SessionMessage m) {
    final mine = m.senderId == _uid;
    final time = m.createdAt != null ? DateFormat('h:mm a').format(m.createdAt!) : '';
    final bubbleColor = mine ? ConferenceColors.gold : Colors.white.withValues(alpha: 0.06);
    final textColor = mine ? Colors.black : Colors.white;

    final bubble = Container(
      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: bubbleColor,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(16),
          topRight: const Radius.circular(16),
          bottomLeft: Radius.circular(mine ? 16 : 4),
          bottomRight: Radius.circular(mine ? 4 : 16),
        ),
        border: mine ? null : Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!mine)
            Text(m.authorName,
                style: const TextStyle(color: ConferenceColors.gold, fontSize: 12, fontWeight: FontWeight.w700)),
          if (!mine) const SizedBox(height: 2),
          Text(m.text, style: TextStyle(color: textColor, fontSize: 14, height: 1.3)),
          const SizedBox(height: 3),
          Text(time, style: TextStyle(color: mine ? Colors.black54 : Colors.grey.shade500, fontSize: 10)),
        ],
      ),
    );

    // Tapping another person's avatar or message opens their profile modal
    // (shared app-wide modal with the "Message" action → DM).
    void openProfile() => showUserProfileModal(context, userId: m.senderId);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!mine) ...[
            GestureDetector(onTap: openProfile, child: _avatar(m.authorName)),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: mine
                ? bubble
                : GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: openProfile,
                    child: bubble,
                  ),
          ),
        ],
      ),
    );
  }

  Widget _avatar(String name) {
    final initials = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();
    return Container(
      width: 30,
      height: 30,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: ConferenceColors.goldAlpha(0.2),
        border: Border.all(color: ConferenceColors.goldAlpha(0.5)),
      ),
      child: Text(initials.isEmpty ? '?' : initials,
          style: const TextStyle(color: ConferenceColors.gold, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }

  Widget _inputBar() {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        decoration: BoxDecoration(
          color: ConferenceColors.atmosphere,
          border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.08))),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: _input,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Share your thoughts…',
                  hintStyle: TextStyle(color: Colors.grey.shade600),
                  filled: true,
                  fillColor: Colors.white.withValues(alpha: 0.05),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: const BorderSide(color: ConferenceColors.gold),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Material(
              color: ConferenceColors.gold,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: _sending ? null : _send,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: _sending
                      ? const SizedBox(
                          height: 20, width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                        )
                      : const Icon(Icons.send_rounded, color: Colors.black, size: 20),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
