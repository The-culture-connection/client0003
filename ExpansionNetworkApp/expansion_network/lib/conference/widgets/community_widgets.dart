import 'package:flutter/material.dart';

import '../../services/user_reports_repository.dart';
import '../../utils/relative_time.dart';
import '../theme/conference_colors.dart';

/// Avatar tints, picked deterministically from the author's uid so a given
/// member keeps the same colour everywhere without storing one.
const List<Color> _kAvatarTints = [
  Color(0xFF6D5BD0),
  Color(0xFF3F6FD8),
  Color(0xFF2E8B7A),
  Color(0xFFB4693F),
  Color(0xFF8E4FA8),
  Color(0xFF4A7FA5),
];

Color communityAvatarColor(String uid) {
  if (uid.isEmpty) return _kAvatarTints.first;
  var hash = 0;
  for (final unit in uid.codeUnits) {
    hash = (hash * 31 + unit) & 0x7FFFFFFF;
  }
  return _kAvatarTints[hash % _kAvatarTints.length];
}

class CommunityAvatar extends StatelessWidget {
  const CommunityAvatar({
    super.key,
    required this.uid,
    required this.name,
    this.radius = 20,
  });

  final String uid;
  final String name;
  final double radius;

  /// First letters of the first two words — "Sarah Johnson" → "SJ".
  String get _initials {
    final words = name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
    if (words.isEmpty) return '?';
    if (words.length == 1) return words.first[0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: radius,
      backgroundColor: communityAvatarColor(uid),
      child: Text(
        _initials,
        style: TextStyle(
          color: Colors.white,
          fontSize: radius * 0.62,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// Avatar + name + byline on the left, timestamp and overflow menu on the right.
class CommunityAuthorLine extends StatelessWidget {
  const CommunityAuthorLine({
    super.key,
    required this.uid,
    required this.name,
    required this.createdAt,
    required this.mine,
    required this.onDelete,
    required this.onReport,
    this.subtitle,
    this.avatarRadius = 20,
  });

  final String uid;
  final String name;
  final String? subtitle;
  final DateTime? createdAt;
  final bool mine;
  final VoidCallback onDelete;
  final VoidCallback onReport;
  final double avatarRadius;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CommunityAvatar(uid: uid, name: name, radius: avatarRadius),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 2),
                Text(
                  subtitle!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: ConferenceColors.mutedForeground,
                    fontSize: 12.5,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(width: 8),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (createdAt != null)
              Text(
                formatRelativeTime(createdAt),
                style: const TextStyle(
                  color: ConferenceColors.mutedForeground,
                  fontSize: 12,
                ),
              ),
            SizedBox(
              width: 28,
              height: 28,
              child: PopupMenuButton<String>(
                padding: EdgeInsets.zero,
                iconSize: 18,
                color: const Color(0xFF1A1A1A),
                tooltip: 'More',
                icon: const Icon(
                  Icons.more_horiz,
                  color: ConferenceColors.mutedForeground,
                ),
                onSelected: (v) => v == 'delete' ? onDelete() : onReport(),
                itemBuilder: (ctx) => [
                  if (mine)
                    const PopupMenuItem(value: 'delete', child: Text('Delete'))
                  else
                    const PopupMenuItem(value: 'report', child: Text('Report')),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// The `#TAG` pill shown at the bottom-right of a message.
class CommunityTagChip extends StatelessWidget {
  const CommunityTagChip({super.key, required this.tag});

  final String tag;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: ConferenceColors.cardBorder),
      ),
      child: Text(
        '#${tag.toUpperCase()}',
        style: const TextStyle(
          color: ConferenceColors.mutedForeground,
          fontSize: 10.5,
          letterSpacing: 0.5,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// Reply-count affordance on the left of a card's footer.
class CommunityReplyCount extends StatelessWidget {
  const CommunityReplyCount({super.key, required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(
          Icons.mode_comment_outlined,
          size: 16,
          color: ConferenceColors.mutedForeground,
        ),
        const SizedBox(width: 6),
        Text(
          '$count',
          style: const TextStyle(
            color: ConferenceColors.mutedForeground,
            fontSize: 13,
          ),
        ),
      ],
    );
  }
}

/// Shared confirm dialog for destructive actions.
Future<bool> confirmCommunityAction(
  BuildContext context, {
  required String title,
  required String body,
}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: const Color(0xFF1A1A1A),
      title: Text(title),
      content: Text(body),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(ctx).pop(true),
          style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700),
          child: const Text('Delete'),
        ),
      ],
    ),
  );
  return result ?? false;
}

/// Collects a reason and files it against the message's *author*, reusing the
/// existing member-report pipeline. The quoted text is appended purely so the
/// reviewer can see what was flagged.
Future<void> reportCommunityContent(
  BuildContext context, {
  required String authorId,
  required String quoted,
}) async {
  final reason = await showDialog<String>(
    context: context,
    builder: (ctx) => _ReportDialog(quoted: quoted),
  );
  if (reason == null || reason.isEmpty || !context.mounted) return;
  final messenger = ScaffoldMessenger.maybeOf(context);
  try {
    await UserReportsRepository().submitReport(
      reportedUserId: authorId,
      reason: reason,
    );
    messenger
      ?..hideCurrentSnackBar()
      ..showSnackBar(const SnackBar(content: Text('Thanks — our team will review.')));
  } catch (e) {
    messenger
      ?..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(e is StateError ? e.message : '$e')));
  }
}

class _ReportDialog extends StatefulWidget {
  const _ReportDialog({required this.quoted});

  final String quoted;

  @override
  State<_ReportDialog> createState() => _ReportDialogState();
}

class _ReportDialogState extends State<_ReportDialog> {
  final TextEditingController _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final r = _controller.text.trim();
    if (r.isEmpty) {
      setState(() => _error = 'Please describe what we should review.');
      return;
    }
    final quoted = widget.quoted.length > 200
        ? '${widget.quoted.substring(0, 200)}…'
        : widget.quoted;
    Navigator.of(context).pop('$r\n\n— Reported message: "$quoted"');
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF1A1A1A),
      title: const Text('Report message'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _controller,
              maxLines: 4,
              autofocus: true,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'What should we review?',
                hintText: 'Describe the issue…',
                alignLabelWithHint: true,
              ),
              onChanged: (_) {
                if (_error != null) setState(() => _error = null);
              },
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                style: TextStyle(color: Colors.red.shade400, fontSize: 13),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _submit,
          style: FilledButton.styleFrom(
            backgroundColor: ConferenceColors.gold,
            foregroundColor: Colors.black,
          ),
          child: const Text('Submit'),
        ),
      ],
    );
  }
}
