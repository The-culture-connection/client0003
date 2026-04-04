import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/dm_message.dart';
import '../services/dm_repository.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/messaging_attachment_preview.dart';
import '../widgets/poster_profile_avatar.dart';

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

  @override
  void initState() {
    super.initState();
    _pendingAttachType = widget.initialAttachmentType;
    _pendingAttachId = widget.initialAttachmentId;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final me = FirebaseAuth.instance.currentUser?.uid;
    if (me == null) return;
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await _dm.sendMessage(
        partnerUid: widget.userId,
        text: text,
        attachmentType: _pendingAttachType,
        attachmentId: _pendingAttachId,
      );
      _controller.clear();
      if (mounted) {
        setState(() {
          _pendingAttachType = null;
          _pendingAttachId = null;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
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
            color: AppColors.card,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: AppColors.mutedForeground),
                      onPressed: () => context.pop(),
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
                            PosterProfileAvatar(userId: widget.userId, radius: 16),
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
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: mine ? AppColors.primary : AppColors.card,
                                    borderRadius: BorderRadius.circular(16).copyWith(
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
                              ],
                            ),
                          ),
                          if (mine) ...[
                            const SizedBox(width: 8),
                            PosterProfileAvatar(userId: me, radius: 16),
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
            color: AppColors.card,
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
                            borderRadius: BorderRadius.circular(24),
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
