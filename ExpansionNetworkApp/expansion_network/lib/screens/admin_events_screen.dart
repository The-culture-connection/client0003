import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/community_event.dart';
import '../services/events_repository.dart';
import '../theme/app_theme.dart';
import '../utils/staff_claims.dart';

/// Staff: review user-submitted events (`approval_status: pending`).
class AdminEventsScreen extends StatelessWidget {
  const AdminEventsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: currentUserHasStaffClaim(),
      builder: (context, authSnap) {
        if (!authSnap.hasData) {
          return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
        }
        if (authSnap.data != true) {
          return Scaffold(
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
                    const SizedBox(height: 16),
                    const Text(
                      'You need staff access to review events.',
                      style: TextStyle(color: AppColors.mutedForeground),
                    ),
                  ],
                ),
              ),
            ),
          );
        }
        return const _AdminEventsBody();
      },
    );
  }
}

class _AdminEventsBody extends StatelessWidget {
  const _AdminEventsBody();

  @override
  Widget build(BuildContext context) {
    final repo = EventsRepository();

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_back),
                          onPressed: () => context.pop(),
                        ),
                        Text(
                          'Pending user events',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Tap a card for full metadata, then approve or decline.',
                      style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                    ),
                  ],
                ),
              ),
            ),
            StreamBuilder<List<CommunityEvent>>(
              stream: repo.watchPendingUserEvents(),
              builder: (context, snap) {
                if (snap.hasError) {
                  return SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text('${snap.error}', style: const TextStyle(color: AppColors.mutedForeground)),
                    ),
                  );
                }
                final list = snap.data ?? [];
                if (list.isEmpty) {
                  return const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: Text(
                        'No pending events.',
                        style: TextStyle(color: AppColors.mutedForeground),
                      ),
                    ),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 48),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, i) {
                        final e = list[i];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _PendingEventCard(event: e, repo: repo),
                        );
                      },
                      childCount: list.length,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _PendingEventCard extends StatelessWidget {
  const _PendingEventCard({required this.event, required this.repo});

  final CommunityEvent event;
  final EventsRepository repo;

  void _openDetail(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.88,
          minChildSize: 0.45,
          maxChildSize: 0.95,
          builder: (context, scroll) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              child: ListView(
                controller: scroll,
                children: [
                  Text(event.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 16),
                  _metaRow('Document ID', event.id),
                  _metaRow('Created by UID', event.createdBy ?? '—'),
                  _metaRow('Date', event.date?.toIso8601String() ?? '—'),
                  _metaRow('Time', event.time),
                  _metaRow('Location', event.location),
                  _metaRow('Type', event.eventType),
                  _metaRow('Image URL', event.imageUrl ?? '—'),
                  _metaRow('Approval', event.approvalStatus ?? '—'),
                  _metaRow('Created at', _ts(event.createdAt)),
                  _metaRow('Updated at', _ts(event.updatedAt)),
                  const SizedBox(height: 12),
                  const Text('Details', style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Text(event.details, style: const TextStyle(fontSize: 14, height: 1.4)),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () async {
                            final reason = await _promptRejectReason(ctx);
                            if (reason == null || !ctx.mounted) return;
                            try {
                              await repo.setEventApproval(
                                eventId: event.id,
                                approve: false,
                                rejectionReason: reason.isEmpty ? null : reason,
                              );
                              if (ctx.mounted) Navigator.pop(ctx);
                            } catch (e) {
                              if (ctx.mounted) {
                                ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('$e')));
                              }
                            }
                          },
                          child: const Text('Decline'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: () async {
                            try {
                              await repo.setEventApproval(eventId: event.id, approve: true);
                              if (ctx.mounted) Navigator.pop(ctx);
                            } catch (e) {
                              if (ctx.mounted) {
                                ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('$e')));
                              }
                            }
                          },
                          child: const Text('Accept'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  static String _ts(DateTime? d) => d?.toIso8601String() ?? '—';

  static Widget _metaRow(String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(k, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
          ),
          Expanded(child: Text(v, style: const TextStyle(fontSize: 12))),
        ],
      ),
    );
  }

  static Future<String?> _promptRejectReason(BuildContext context) async {
    final ctrl = TextEditingController();
    final r = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Decline event'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(
            labelText: 'Reason (optional)',
            hintText: 'Shown to the submitter in metadata',
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, ctrl.text.trim()),
            child: const Text('Decline'),
          ),
        ],
      ),
    );
    ctrl.dispose();
    return r;
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.card,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: () => _openDetail(context),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(event.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
              const SizedBox(height: 8),
              Text(
                '${event.time} · ${event.location}',
                style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
              ),
              const SizedBox(height: 8),
              Text(
                'Submitted by ${event.createdBy ?? "unknown"}',
                style: const TextStyle(fontSize: 11, color: AppColors.primary),
              ),
              const SizedBox(height: 8),
              const Text('Tap for full details', style: TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
            ],
          ),
        ),
      ),
    );
  }
}
