import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/community_event.dart';
import '../services/events_repository.dart';
import '../theme/app_theme.dart';
import '../utils/relative_time.dart';
import '../widgets/event_rsvp_attendee_tile.dart';
import '../widgets/page_header.dart';

/// Events list driven by Firestore `events_mobile`.
class EventsScreen extends StatelessWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final repo = EventsRepository();
    final uid = FirebaseAuth.instance.currentUser?.uid;

    return Scaffold(
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 72),
        child: FloatingActionButton(
          onPressed: () => context.push('/events/create'),
          child: const Icon(Icons.add),
        ),
      ),
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            const SliverToBoxAdapter(
              child: PageHeader(
                title: 'Events',
                subtitle: 'Discover upcoming opportunities',
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
              sliver: StreamBuilder<List<CommunityEvent>>(
                stream: repo.watchPublishedEvents(),
                builder: (context, snap) {
                  if (snap.hasError) {
                    return SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          'Could not load events.\\n${snap.error}',
                          style: const TextStyle(color: AppColors.mutedForeground),
                        ),
                      ),
                    );
                  }
                  if (!snap.hasData) {
                    return const SliverToBoxAdapter(
                      child: Padding(
                        padding: EdgeInsets.all(48),
                        child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                      ),
                    );
                  }
                  final events = snap.data!;
                  if (events.isEmpty) {
                    return const SliverToBoxAdapter(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: Text(
                          'No events found.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppColors.mutedForeground),
                        ),
                      ),
                    );
                  }

                  return SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final e = events[index];
                        final registered = uid != null && e.isRegistered(uid);
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
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
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        e.title,
                                        style: const TextStyle(fontWeight: FontWeight.w500),
                                      ),
                                    ),
                                    if (registered)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: AppColors.primary,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Text(
                                          'Registered',
                                          style: TextStyle(fontSize: 11, color: AppColors.onPrimary),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                _row(Icons.calendar_today, formatEventDate(e.date)),
                                _row(Icons.schedule, e.time),
                                _row(Icons.place_outlined, e.location),
                                _row(Icons.category_outlined, e.eventType),
                                _row(Icons.people_outline, '${e.registeredCount} attending'),
                                if (e.registeredCount > 0) ...[
                                  const SizedBox(height: 12),
                                  const Text(
                                    'RSVPs',
                                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                  ),
                                  const SizedBox(height: 8),
                                  ...e.registeredUsers
                                      .take(5)
                                      .map((id) => EventRsvpAttendeeTile(userId: id, dense: true)),
                                  if (e.registeredCount > 5)
                                    Align(
                                      alignment: Alignment.centerLeft,
                                      child: TextButton(
                                        onPressed: () => context.push('/events/${e.id}'),
                                        child: Text(
                                          'View all ${e.registeredCount} RSVPs',
                                        ),
                                      ),
                                    ),
                                ],
                                const SizedBox(height: 12),
                                SizedBox(
                                  width: double.infinity,
                                  child: registered
                                      ? OutlinedButton(
                                          onPressed: () => context.push('/events/${e.id}'),
                                          child: const Text('View details'),
                                        )
                                      : FilledButton(
                                          style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                                          onPressed: (e.isFull || uid == null)
                                              ? null
                                              : () async {
                                                  try {
                                                    await repo.register(e.id);
                                                  } catch (err) {
                                                    if (!context.mounted) return;
                                                    ScaffoldMessenger.of(context).showSnackBar(
                                                      SnackBar(content: Text('$err')),
                                                    );
                                                  }
                                                },
                                          child: Text(e.isFull ? 'Event full' : 'Register'),
                                        ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                      childCount: events.length,
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.mutedForeground),
          const SizedBox(width: 8),
          Text(text, style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
        ],
      ),
    );
  }
}
