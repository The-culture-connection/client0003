import 'package:cached_network_image/cached_network_image.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/community_event.dart';
import '../services/events_repository.dart';
import '../theme/app_theme.dart';
import '../utils/relative_time.dart';
import '../widgets/page_header.dart';

/// Community feed: published [events] only (no feed posts).
class FeedScreen extends StatelessWidget {
  const FeedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    final repo = EventsRepository();

    return Scaffold(
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 72),
        child: FloatingActionButton(
          onPressed: () => context.push('/events/create'),
          child: const Icon(Icons.add),
        ),
      ),
      body: CustomScrollView(
        slivers: [
          const SliverToBoxAdapter(
            child: PageHeader(
              title: 'Feed',
              subtitle: 'Upcoming community events',
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
            sliver: StreamBuilder<List<CommunityEvent>>(
              stream: repo.watchPublishedEvents(),
              builder: (context, evSnap) {
                if (evSnap.hasError) {
                  return SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        'Could not load events.\n${evSnap.error}',
                        style: const TextStyle(color: AppColors.mutedForeground),
                      ),
                    ),
                  );
                }
                if (!evSnap.hasData) {
                  return const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(48),
                      child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                    ),
                  );
                }
                final events = evSnap.data!;
                if (events.isEmpty) {
                  return const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: Text(
                        'No upcoming events yet.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.mutedForeground),
                      ),
                    ),
                  );
                }
                final u = uid;
                final registeredCount = u == null ? 0 : events.where((e) => e.isRegistered(u)).length;
                return SliverList(
                  delegate: SliverChildListDelegate([
                    _EventsSummaryBar(eventCount: events.length, registeredCount: registeredCount),
                    const SizedBox(height: 16),
                    for (final e in events)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: _EventListTile(
                          event: e,
                          uid: uid,
                          onTap: () => context.push('/events/${e.id}'),
                        ),
                      ),
                  ]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _EventsSummaryBar extends StatelessWidget {
  const _EventsSummaryBar({required this.eventCount, required this.registeredCount});

  final int eventCount;
  final int registeredCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.primary.withValues(alpha: 0.85)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: _StatCell(value: '$eventCount', label: 'Events', color: AppColors.onPrimary),
          ),
          Expanded(
            child: _StatCell(value: '$registeredCount', label: 'Registered', color: AppColors.onPrimary),
          ),
        ],
      ),
    );
  }
}

class _StatCell extends StatelessWidget {
  const _StatCell({required this.value, required this.label, required this.color});

  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: color,
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: color.withValues(alpha: 0.9),
              ),
        ),
      ],
    );
  }
}

class _EventListTile extends StatelessWidget {
  const _EventListTile({required this.event, required this.uid, required this.onTap});

  final CommunityEvent event;
  final String? uid;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final registered = uid != null && event.isRegistered(uid!);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (event.imageUrl != null && event.imageUrl!.isNotEmpty)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: CachedNetworkImage(
                    imageUrl: event.imageUrl!,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: AppColors.secondary),
                    errorWidget: (_, __, ___) => const SizedBox.shrink(),
                  ),
                ),
              ),
            if (event.imageUrl != null && event.imageUrl!.isNotEmpty) const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: Text(event.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16))),
                if (registered)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('Registered', style: TextStyle(fontSize: 11, color: AppColors.onPrimary)),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            _iconRow(Icons.calendar_today, formatEventDate(event.date)),
            _iconRow(Icons.schedule, event.time),
            _iconRow(Icons.place_outlined, event.location),
            _iconRow(Icons.category_outlined, event.eventType),
            _iconRow(Icons.people_outline, '${event.registeredCount} registered'),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onTap,
                child: const Text('View details'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _iconRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.mutedForeground),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground))),
        ],
      ),
    );
  }
}
