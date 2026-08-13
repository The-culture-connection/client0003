import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:go_router/go_router.dart';

import '../analytics/expansion_analytics.dart';
import '../models/dm_message.dart';
import '../services/dm_repository.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/messaging_attachment_preview.dart';
import '../widgets/poster_profile_avatar.dart';
import '../theme/cosmic_content.dart';

class DirectChatScreen extends StatefulWidget {
  const DirectChatScreen({
    super.key,
    required this.userId,
    this.initialAttachmentType,
    this.initialAttachmentId,
  });

  final String userId;
  final String? initialAttachmentType;
  final String? initialAttachmentId;

  @override
  State<DirectChatScreen> createState() => _DirectChatScreenState();
}

class _DirectChatScreenState extends State<DirectChatScreen> {
  final _controller = TextEditingController();
  final _dm = DmRepository();
  final _users = UserProfileRepository();
  String? _pendingAttachType;
  String? _pendingAttachId;
  bool _sending = false;
  bool _messagesStreamErrorLogged = false;
  /// Firestore-backed display name for initials when Auth has no display name / photo.
  String? _cachedMeDisplayHint;
  /// Partner's display name for incoming message avatars (`PosterProfileAvatar` initials).
  String? _cachedPartnerDisplayHint;

  @override
  void initState() {
    super.initState();
    _pendingAttachType = widget.initialAttachmentType;
    _pendingAttachId = widget.initialAttachmentId;
    // Opening the thread counts as reading it — clears the Mortarverse
    // "conversation waiting" badge for this thread.
    unawaited(_dm.markThreadRead(partnerUid: widget.userId));
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid != null) {
      unawaited(
        _users.getDisplayNameForUser(uid).then((name) {
          if (!mounted) return;
          final t = name.trim();
          if (t.isNotEmpty && t != 'Member') {
            setState(() => _cachedMeDisplayHint = t);
          }
        }),
      );
    }
    unawaited(
      _users.getDisplayNameForUser(widget.userId).then((name) {
        if (!mounted) return;
        final t = name.trim();
        setState(() => _cachedPartnerDisplayHint = t.isNotEmpty ? t : 'Member');
      }),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(
        ExpansionAnalytics.log(
          'direct_chat_started',
          entityId: widget.userId,
          sourceScreen: 'direct_chat',
          attachmentType: widget.initialAttachmentType,
        ),
      );
    });
  }

  @override
  void dispose() {
    // Anything that arrived while the screen was open has been seen too.
    unawaited(_dm.markThreadRead(partnerUid: widget.userId));
    _controller.dispose();
    super.dispose();
  }

  /// Text used to derive initials on [PosterProfileAvatar] when the signed-in user has no photo.
  String _displayHintForSignedInUser() {
    final u = FirebaseAuth.instance.currentUser;
    if (u == null) return 'Member';
    final dn = u.displayName?.trim();
    if (dn != null && dn.isNotEmpty) return dn;
    final em = u.email?.trim();
    if (em != null && em.isNotEmpty) {
      final local = em.split('@').first.trim();
      if (local.isNotEmpty) return local;
    }
    return 'Member';
  }

  Future<void> _send() async {
    final me = FirebaseAuth.instance.currentUser?.uid;
    if (me == null) return;
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      // Firestore writes only complete on SERVER ack — on a flaky connection
      // the commit future can hang indefinitely ("send msg just spinning").
      // The message is queued locally either way, so cap the wait.
      await _dm
          .sendMessage(
            partnerUid: widget.userId,
            text: text,
            attachmentType: _pendingAttachType,
            attachmentId: _pendingAttachId,
          )
          .timeout(const Duration(seconds: 12));
      unawaited(ExpansionAnalytics.log(
        'direct_chat_message_sent',
        entityId: widget.userId,
        sourceScreen: 'direct_chat',
        attachmentType: _pendingAttachType,
        extra: <String, Object?>{'attachment_id': _pendingAttachId ?? ''},
      ));
      _controller.clear();
      if (mounted) {
        setState(() {
          _pendingAttachType = null;
          _pendingAttachId = null;
        });
      }
    } on TimeoutException {
      // The write is queued and will sync when the connection recovers —
      // don't leave the user stuck on a spinner.
      _controller.clear();
      if (mounted) {
        setState(() {
          _pendingAttachType = null;
          _pendingAttachId = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Slow connection — your message will send as soon as you\'re back online.',
            ),
          ),
        );
      }
    } catch (e) {
      unawaited(
        ExpansionAnalytics.log(
          'direct_chat_message_send_failed',
          entityId: widget.userId,
          sourceScreen: 'direct_chat',
          extra: ExpansionAnalytics.errorExtras(e, code: 'send_message'),
        ),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  /// Applies (or clears) my reaction. Tapping the emoji I already picked
  /// removes it, so the picker doubles as the undo.
  Future<void> _toggleReaction(DmMessage m, String me, String emoji) async {
    final current = m.reactionOf(me);
    final next = current == emoji ? null : emoji;
    try {
      await _dm.setReaction(
        partnerUid: widget.userId,
        messageId: m.id,
        emoji: next,
      );
      unawaited(ExpansionAnalytics.log(
        next == null ? 'direct_chat_reaction_removed' : 'direct_chat_reaction_added',
        entityId: widget.userId,
        sourceScreen: 'direct_chat',
        extra: <String, Object?>{'emoji': next ?? current ?? ''},
      ));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("We couldn't save that reaction. Try again.")),
      );
    }
  }

  void _openReactionPicker(DmMessage m, String me) {
    final current = m.reactionOf(me);
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                current == null ? 'React to this message' : 'Change your reaction',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final emoji in DmRepository.reactionChoices)
                    InkWell(
                      borderRadius: BorderRadius.circular(999),
                      onTap: () {
                        Navigator.of(ctx).pop();
                        _toggleReaction(m, me, emoji);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: emoji == current
                              ? AppColors.primary.withValues(alpha: 0.25)
                              : AppColors.glassFill,
                          border: Border.all(
                            color: emoji == current ? AppColors.primary : AppColors.border,
                          ),
                        ),
                        child: Text(emoji, style: const TextStyle(fontSize: 22)),
                      ),
                    ),
                ],
              ),
              if (current != null) ...[
                const SizedBox(height: 6),
                TextButton.icon(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    _toggleReaction(m, me, current);
                  },
                  icon: const Icon(Icons.close_rounded, size: 18),
                  label: const Text('Remove my reaction'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _reactionChips(DmMessage m, String me) {
    final counts = m.reactionCounts;
    final mine = m.reactionOf(me);
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Wrap(
        spacing: 4,
        children: [
          for (final entry in counts.entries)
            InkWell(
              borderRadius: BorderRadius.circular(999),
              onTap: () => _toggleReaction(m, me, entry.key),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: entry.key == mine
                      ? AppColors.primary.withValues(alpha: 0.2)
                      : AppColors.card,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: entry.key == mine ? AppColors.primary : AppColors.border,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(entry.key, style: const TextStyle(fontSize: 13)),
                    // A 1:1 thread tops out at two reactors, so the count only
                    // earns its space when both people picked the same emoji.
                    if (entry.value > 1) ...[
                      const SizedBox(width: 3),
                      Text(
                        '${entry.value}',
                        style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.mutedForeground,
                            fontWeight: FontWeight.w600),
                      ),
                    ],
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final me = FirebaseAuth.instance.currentUser?.uid;
    if (me == null) {
      return const Scaffold(body: Center(child: Text('Sign in to chat.')));
    }
    final threadId = dmThreadIdForUsers(me, widget.userId);

    return Scaffold(
      body: Column(
        children: [
          Material(
            color: AppColors.glassFill,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: AppColors.mutedForeground),
                      tooltip: 'Back',
                      // A push notification or match flow can land here with no
                      // stack to pop ("stuck in the direct messenger") — fall
                      // back to the messages inbox.
                      onPressed: () => context.canPop()
                          ? context.pop()
                          : context.go('/commons/messages'),
                    ),
                    FutureBuilder<String>(
                      future: _users.getDisplayNameForUser(widget.userId),
                      builder: (context, snap) {
                        final name = snap.data ?? 'Member';
                        return Expanded(
                          child: Row(
                            children: [
                              PosterProfileAvatar(
                                userId: widget.userId,
                                radius: 20,
                                displayNameHint: name,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                                    const Text('Direct message', style: TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          if (_pendingAttachType != null &&
              _pendingAttachId != null &&
              ['job', 'skill', 'event'].contains(_pendingAttachType))
            Material(
              color: AppColors.secondary,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'This message will include the card below.',
                            style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                          ),
                        ),
                        TextButton(
                          onPressed: () => setState(() {
                            _pendingAttachType = null;
                            _pendingAttachId = null;
                          }),
                          child: const Text('Remove'),
                        ),
                      ],
                    ),
                    MessagingAttachmentPreview(
                      attachmentType: _pendingAttachType!,
                      attachmentId: _pendingAttachId!,
                      compact: true,
                    ),
                  ],
                ),
              ),
            ),
          Expanded(
            child: StreamBuilder<List<DmMessage>>(
              stream: _dm.watchMessages(threadId),
              builder: (context, snap) {
                if (snap.hasError) {
                  if (!_messagesStreamErrorLogged) {
                    _messagesStreamErrorLogged = true;
                    final err = snap.error!;
                    SchedulerBinding.instance.addPostFrameCallback((_) {
                      unawaited(
                        ExpansionAnalytics.log(
                          'direct_chat_messages_stream_error',
                          entityId: widget.userId,
                          sourceScreen: 'direct_chat',
                          extra: ExpansionAnalytics.errorExtras(err, code: 'watch_messages'),
                        ),
                      );
                    });
                  }
                  return Center(child: Text('${snap.error}', textAlign: TextAlign.center));
                }
                final list = snap.data ?? [];
                if (list.isEmpty && snap.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: AppColors.primary));
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  itemBuilder: (context, index) {
                    final m = list[index];
                    final mine = m.senderId == me;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (!mine) ...[
                            PosterProfileAvatar(
                              userId: widget.userId,
                              radius: 16,
                              displayNameHint: _cachedPartnerDisplayHint ?? 'Member',
                            ),
                            const SizedBox(width: 8),
                          ],
                          Flexible(
                            child: Column(
                              crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                              children: [
                                if (m.attachmentType != null &&
                                    m.attachmentId != null &&
                                    ['job', 'skill', 'event'].contains(m.attachmentType))
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    child: MessagingAttachmentPreview(
                                      attachmentType: m.attachmentType!,
                                      attachmentId: m.attachmentId!,
                                      compact: true,
                                    ),
                                  ),
                                GestureDetector(
                                  // Long-press is the reaction gesture on both
                                  // platforms' messaging apps, so it needs no
                                  // affordance of its own; the tooltip covers
                                  // discovery for anyone exploring by tap-hold.
                                  onLongPress: () => _openReactionPicker(m, me),
                                  child: Tooltip(
                                    message: 'Hold to react',
                                    triggerMode: TooltipTriggerMode.manual,
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: mine ? AppColors.primary : AppColors.card,
                                        borderRadius: Cosmic.chipRadius.copyWith(
                                          bottomRight: mine ? const Radius.circular(4) : null,
                                          bottomLeft: !mine ? const Radius.circular(4) : null,
                                        ),
                                        border: mine ? null : Border.all(color: AppColors.border),
                                      ),
                                      child: Text(
                                        m.text,
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: mine ? AppColors.onPrimary : AppColors.foreground,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                if (m.reactions.isNotEmpty)
                                  _reactionChips(m, me),
                              ],
                            ),
                          ),
                          if (mine) ...[
                            const SizedBox(width: 8),
                            PosterProfileAvatar(
                              userId: me,
                              radius: 16,
                              displayNameHint: _cachedMeDisplayHint ?? _displayHintForSignedInUser(),
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),
          Material(
            color: AppColors.glassFill,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        decoration: InputDecoration(
                          hintText: 'Type a message…',
                          filled: true,
                          fillColor: AppColors.background,
                          border: OutlineInputBorder(
                            borderRadius: Cosmic.chipRadius,
                            borderSide: const BorderSide(color: AppColors.border),
                          ),
                        ),
                        minLines: 1,
                        maxLines: 4,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      style: FilledButton.styleFrom(
                        shape: const CircleBorder(),
                        padding: const EdgeInsets.all(12),
                        backgroundColor: AppColors.primary,
                      ),
                      onPressed: _sending ? null : _send,
                      child: _sending
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                            )
                          : const Icon(Icons.send, color: AppColors.onPrimary),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
