import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/mock_data.dart';
import '../theme/app_theme.dart';

/// Port of [UI Basis/src/app/pages/AdminEvents.tsx]
class AdminEventsScreen extends StatefulWidget {
  const AdminEventsScreen({super.key});

  @override
  State<AdminEventsScreen> createState() => _AdminEventsScreenState();
}

class _AdminEventsScreenState extends State<AdminEventsScreen> {
  late List<MockEvent> _events;

  @override
  void initState() {
    super.initState();
    _events = List<MockEvent>.from(mockEvents);
  }

  void _approve(String id) {
    setState(() {
      _events = _events
          .map((e) => e.id == id ? MockEvent(
                id: e.id,
                title: e.title,
                date: e.date,
                time: e.time,
                location: e.location,
                image: e.image,
                attendees: e.attendees,
                maxAttendees: e.maxAttendees,
                status: 'approved',
              ) : e)
          .toList();
    });
  }

  void _reject(String id) {
    setState(() {
      _events = _events
          .map((e) => e.id == id ? MockEvent(
                id: e.id,
                title: e.title,
                date: e.date,
                time: e.time,
                location: e.location,
                image: e.image,
                attendees: e.attendees,
                maxAttendees: e.maxAttendees,
                status: 'rejected',
              ) : e)
          .toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    final pending = _events.where((e) => e.status == 'pending').toList();
    final approved = _events.where((e) => e.status == 'approved').toList();
    final rejected = _events.where((e) => e.status == 'rejected').toList();

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
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
                          'Event Approvals',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 16,
                      children: [
                        Text('Pending: ${pending.length}', style: const TextStyle(fontSize: 13)),
                        Text('Approved: ${approved.length}', style: const TextStyle(fontSize: 13)),
                        Text('Rejected: ${rejected.length}', style: const TextStyle(fontSize: 13)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          if (pending.isNotEmpty)
            SliverToBoxAdapter(
              child: _section(
                'Pending Approval',
                pending,
                showActions: true,
              ),
            ),
          if (approved.isNotEmpty)
            SliverToBoxAdapter(
              child: _section('Approved Events', approved, showActions: false),
            ),
          if (rejected.isNotEmpty)
            SliverToBoxAdapter(
              child: _section('Rejected Events', rejected, showActions: false),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: 48)),
        ],
      ),
    ),
    );
  }

  Widget _section(String title, List<MockEvent> list, {required bool showActions}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 16)),
          const SizedBox(height: 12),
          for (final e in list)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: _AdminEventCard(
                event: e,
                showActions: showActions,
                onApprove: () => _approve(e.id),
                onReject: () => _reject(e.id),
              ),
            ),
        ],
      ),
    );
  }
}

class _AdminEventCard extends StatelessWidget {
  const _AdminEventCard({
    required this.event,
    required this.showActions,
    required this.onApprove,
    required this.onReject,
  });

  final MockEvent event;
  final bool showActions;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 140,
            child: CachedNetworkImage(imageUrl: event.image, fit: BoxFit.cover),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(event.title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 16)),
                const SizedBox(height: 8),
                Text('${event.date} · ${event.time}', style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                Text(event.location, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                if (showActions) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: onReject,
                          style: OutlinedButton.styleFrom(foregroundColor: AppColors.foreground),
                          child: const Text('Reject'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                          onPressed: onApprove,
                          child: const Text('Approve'),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
