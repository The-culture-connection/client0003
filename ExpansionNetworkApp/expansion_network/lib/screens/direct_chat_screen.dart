import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';

/// Port of [UI Basis/src/app/pages/DirectChat.tsx]
class DirectChatScreen extends StatefulWidget {
  const DirectChatScreen({required this.userId, super.key});

  final String userId;

  @override
  State<DirectChatScreen> createState() => _DirectChatScreenState();
}

class _DirectUser {
  const _DirectUser({required this.name, required this.avatar, required this.role, required this.online});

  final String name;
  final String avatar;
  final String role;
  final bool online;
}

class _DirectChatScreenState extends State<DirectChatScreen> {
  final _controller = TextEditingController();

  static const _users = {
    'maria-garcia': _DirectUser(
      name: 'Maria Garcia',
      avatar: 'MG',
      role: 'Marketing Director • Class of 2022',
      online: true,
    ),
    'james-wilson': _DirectUser(
      name: 'James Wilson',
      avatar: 'JW',
      role: 'Tech Entrepreneur • Class of 2021',
      online: true,
    ),
  };

  late final _DirectUser _user;

  @override
  void initState() {
    super.initState();
    _user = _users[widget.userId] ??
        const _DirectUser(name: 'User', avatar: 'U', role: 'Alumni', online: false);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final messages = [
      _Dm(1, 'Hey! Thanks for connecting. I saw your profile and would love to chat about potential opportunities.', false, '10:30 AM'),
      _Dm(2, "Hi! Absolutely, I'd be happy to discuss. What did you have in mind?", true, '10:32 AM'),
      _Dm(3, "We're looking for someone with your skillset for a new project. Are you open to new opportunities?", false, '10:35 AM'),
      _Dm(4, 'That sounds interesting! I\'m definitely open to hearing more about it.', true, '10:37 AM'),
      _Dm(5, 'Great! Let me share some details. Would you be available for a quick call tomorrow?', false, '10:40 AM'),
    ];

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
                      onPressed: () => context.go('/explore'),
                    ),
                    Stack(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: AppColors.primary,
                          child: Text(
                            _user.avatar,
                            style: const TextStyle(color: AppColors.onPrimary, fontWeight: FontWeight.w600),
                          ),
                        ),
                        if (_user.online)
                          Positioned(
                            right: 0,
                            bottom: 0,
                            child: Container(
                              width: 12,
                              height: 12,
                              decoration: BoxDecoration(
                                color: Colors.green.shade500,
                                shape: BoxShape.circle,
                                border: Border.all(color: AppColors.card, width: 2),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_user.name, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
                          Text(_user.role, style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                        ],
                      ),
                    ),
                    IconButton(onPressed: () {}, icon: const Icon(Icons.phone_outlined, color: AppColors.mutedForeground)),
                    IconButton(onPressed: () {}, icon: const Icon(Icons.videocam_outlined, color: AppColors.mutedForeground)),
                    IconButton(onPressed: () {}, icon: const Icon(Icons.calendar_today_outlined, color: AppColors.mutedForeground)),
                    IconButton(onPressed: () {}, icon: const Icon(Icons.more_vert, color: AppColors.mutedForeground)),
                  ],
                ),
              ),
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final m = messages[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    mainAxisAlignment: m.isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (!m.isMine) ...[
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: AppColors.primary,
                          child: Text(
                            _user.avatar,
                            style: const TextStyle(fontSize: 10, color: AppColors.onPrimary, fontWeight: FontWeight.w600),
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],
                      Flexible(
                        child: Column(
                          crossAxisAlignment: m.isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: m.isMine ? AppColors.primary : AppColors.card,
                                borderRadius: BorderRadius.circular(16).copyWith(
                                  bottomRight: m.isMine ? const Radius.circular(4) : null,
                                  bottomLeft: !m.isMine ? const Radius.circular(4) : null,
                                ),
                                border: m.isMine ? null : Border.all(color: AppColors.border),
                              ),
                              child: Text(
                                m.text,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: m.isMine ? AppColors.onPrimary : AppColors.foreground,
                                ),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              m.time,
                              style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
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
                          hintText: 'Type a message...',
                          filled: true,
                          fillColor: AppColors.background,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: AppColors.border)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      style: FilledButton.styleFrom(
                        shape: const CircleBorder(),
                        padding: const EdgeInsets.all(12),
                        backgroundColor: AppColors.primary,
                      ),
                      onPressed: () => _controller.clear(),
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
}

class _Dm {
  const _Dm(this.id, this.text, this.isMine, this.time);

  final int id;
  final String text;
  final bool isMine;
  final String time;
}
