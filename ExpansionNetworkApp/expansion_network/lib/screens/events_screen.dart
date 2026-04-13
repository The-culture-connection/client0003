import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/community_event.dart';
import '../services/events_repository.dart';
import '../theme/app_theme.dart';
import '../utils/content_action_guard.dart';
import '../utils/event_calendar_prompt.dart';
import '../utils/relative_time.dart';
import '../widgets/event_poster_byline.dart';
import '../widgets/event_rsvp_attendee_tile.dart';
import '../widgets/event_source_badge.dart';
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
          onPressed: () async {
            if (await blockContentActionIfSuspended(context)) return;
            if (context.mounted) context.push('/events/create');
          },
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
                            decoration: mortarEventListCardDecoration(e),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.center,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              e.title,
                                              style: const TextStyle(fontWeight: FontWeight.w500),
                                            ),
                                          ),
                                          if (e.isMortarHostedEvent) ...[
                                            const SizedBox(width: 8),
                                            const MortarOfficialVerifiedSeal(),
                                          ],
                                        ],
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
                                if (e.isMortarHostedEvent) ...[
                                  const SizedBox(height: 8),
                                  EventSourceBadges(event: e, dense: true),
                                ],
                                if (e.showsMemberPoster) ...[
                                  const SizedBox(height: 8),
                                  EventPosterByline(userId: e.createdBy!, dense: true),
                                ],
                                const SizedBox(height: 12),
                                _row(Icons.calendar_today, formatEventDate(e.date), mortarAccent: e.isMortarHostedEvent),
                                _row(Icons.schedule, e.time, mortarAccent: e.isMortarHostedEvent),
                                _row(Icons.place_outlined, e.location, mortarAccent: e.isMortarHostedEvent),
                                _row(Icons.category_outlined, e.eventType, mortarAccent: e.isMortarHostedEvent),
                                _row(Icons.people_outline, '${e.registeredCount} attending', mortarAccent: e.isMortarHostedEvent),
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
                                          style: e.isMortarHostedEvent
                                              ? OutlinedButton.styleFrom(
                                                  foregroundColor: AppColors.primary,
                                                  side: const BorderSide(color: AppColors.primary, width: 1.5),
                                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                                )
                                              : OutlinedButton.styleFrom(
                                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                                ),
                                          child: const Text('View details'),
                                        )
                                      : FilledButton(
                                          style: FilledButton.styleFrom(
                                            backgroundColor: AppColors.primary,
                                            foregroundColor: AppColors.onPrimary,
                                            elevation: e.isMortarHostedEvent ? 3 : 0,
                                            shadowColor: e.isMortarHostedEvent
                                                ? AppColors.primary.withValues(alpha: 0.55)
                                                : Colors.transparent,
                                            padding: const EdgeInsets.symmetric(vertical: 12),
                                          ),
                                          onPressed: (e.isFull || uid == null)
                                              ? null
                                              : () async {
                                                  final currentUid = uid;
                                                  try {
                                                    await repo.register(e.id);
                                                    if (!context.mounted) return;
                                                    final fresh = await repo.getEvent(e.id);
                                                    if (!context.mounted) return;
                                                    if (fresh != null &&
                                                        fresh.date != null &&
                                                        fresh.isRegistered(currentUid)) {
                                                      await showPostRegisterCalendarSheet(context, fresh);
                                                    }
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

  Widget _row(IconData icon, String text, {required bool mortarAccent}) {
    final iconColor = mortarAccent ? AppColors.primary : AppColors.mutedForeground;
    final textColor =
        mortarAccent ? AppColors.foreground.withValues(alpha: 0.92) : AppColors.mutedForeground;
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 16, color: iconColor),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: TextStyle(fontSize: 13, color: textColor))),
        ],
      ),
    );
  }
}
