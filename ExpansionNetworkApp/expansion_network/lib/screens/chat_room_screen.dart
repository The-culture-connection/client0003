import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/mock_data.dart';
import '../theme/app_theme.dart';
import '../widgets/network_circle_avatar.dart';

class _ChatMessage {
  const _ChatMessage({
    required this.id,
    required this.text,
    required this.senderMe,
    required this.timestamp,
    this.read = false,
  });

  final String id;
  final String text;
  final bool senderMe;
  final String timestamp;
  final bool read;
}

/// Port of [UI Basis/src/app/pages/ChatRoom.tsx]
class ChatRoomScreen extends StatefulWidget {
  const ChatRoomScreen({required this.messageId, super.key});

  final String messageId;

  @override
  State<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  MockMessage? _contact;
  final _controller = TextEditingController();
  late List<_ChatMessage> _messages;

  @override
  void initState() {
    super.initState();
    final found = mockMessages.where((m) => m.id == widget.messageId).toList();
    _contact = found.isEmpty ? null : found.first;
    _messages = [
      const _ChatMessage(id: '1', text: 'Hey! I saw your profile and would love to connect.', senderMe: false, timestamp: '10:30 AM', read: true),
      const _ChatMessage(id: '2', text: "Hi! Thanks for reaching out. I'd be happy to chat!", senderMe: true, timestamp: '10:32 AM', read: true),
      const _ChatMessage(
        id: '3',
        text: 'Thanks for connecting! Would love to chat about product strategy.',
        senderMe: false,
        timestamp: '10:35 AM',
        read: true,
      ),
      const _ChatMessage(id: '4', text: 'Absolutely! I have some time next week. Coffee?', senderMe: true, timestamp: '10:38 AM', read: true),
    ];
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _send() {
    final t = _controller.text.trim();
    if (t.isEmpty) return;
    setState(() {
      _messages = [
        ..._messages,
        _ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          text: t,
          senderMe: true,
          timestamp: TimeOfDay.now().format(context),
          read: false,
        ),
      ];
      _controller.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final contact = _contact;
    if (contact == null) {
      return const Scaffold(body: Center(child: Text('Conversation not found')));
    }

    return Scaffold(
      body: Column(
        children: [
          Material(
            color: AppColors.background,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: AppColors.foreground),
                      onPressed: () => context.pop(),
                    ),
                    NetworkCircleAvatar(imageUrl: contact.userAvatar, radius: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(contact.userName, style: const TextStyle(fontWeight: FontWeight.w500)),
                          const Text('Active now', style: TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.calendar_today_outlined),
                      onPressed: () => _showScheduleSheet(context),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(24),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final m = _messages[index];
                return Align(
                  alignment: m.senderMe ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.75),
                    decoration: BoxDecoration(
                      color: m.senderMe ? AppColors.primary : AppColors.secondary,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(m.text, style: TextStyle(color: m.senderMe ? AppColors.onPrimary : AppColors.foreground, fontSize: 14)),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              m.timestamp,
                              style: TextStyle(
                                fontSize: 11,
                                color: (m.senderMe ? AppColors.onPrimary : AppColors.foreground).withValues(alpha: 0.7),
                              ),
                            ),
                            if (m.senderMe && m.read) ...[
                              const SizedBox(width: 4),
                              Text(
                                '· Read',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.onPrimary.withValues(alpha: 0.7),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          Material(
            color: AppColors.background,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: Row(
                  children: [
                    IconButton(onPressed: () {}, icon: const Icon(Icons.attach_file, color: AppColors.mutedForeground)),
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        onSubmitted: (_) => _send(),
                        decoration: InputDecoration(
                          hintText: 'Type a message...',
                          filled: true,
                          fillColor: AppColors.secondary,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.all(12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _send,
                      child: const Icon(Icons.send, color: AppColors.onPrimary),
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

  Future<void> _showScheduleSheet(BuildContext context) async {
    final titleController = TextEditingController();
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: MediaQuery.viewInsetsOf(ctx).bottom + 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Schedule Meeting', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w500)),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              TextField(
                controller: titleController,
                decoration: const InputDecoration(labelText: 'Meeting Title'),
              ),
              const SizedBox(height: 8),
              const Text('Date / time pickers would go here in production.'),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => Navigator.pop(ctx),
                style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                child: const Text('Schedule'),
              ),
            ],
          ),
        );
      },
    );
    titleController.dispose();
  }
}
