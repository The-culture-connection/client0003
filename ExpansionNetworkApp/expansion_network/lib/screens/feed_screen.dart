import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:go_router/go_router.dart';

import '../analytics/expansion_analytics.dart';
import '../models/community_event.dart';
import '../services/events_repository.dart';
import '../theme/app_theme.dart';
import '../utils/content_action_guard.dart';
import '../utils/relative_time.dart';
import '../widgets/event_poster_byline.dart';
import '../widgets/event_rsvp_attendee_tile.dart';
import '../widgets/event_source_badge.dart';
import '../widgets/page_header.dart';

/// Community feed: published [events] only (no feed posts).
class FeedScreen extends StatefulWidget {
  const FeedScreen({super.key});

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  /// 0 = All Events, 1 = Registered Events
  int _tabIndex = 0;
  bool _eventsStreamErrorLogged = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(ExpansionAnalytics.log('events_feed_tab_started', sourceScreen: 'events_feed'));
    });
  }

  List<CommunityEvent> _visibleEvents(List<CommunityEvent> all, String? uid) {
    if (_tabIndex == 0) return all;
    if (uid == null) return [];
    return all.where((e) => e.isRegistered(uid)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    final repo = EventsRepository();

    return Scaffold(
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 72),
        child: FloatingActionButton(
          onPressed: () async {
            unawaited(
              ExpansionAnalytics.log('events_feed_create_event_fab_clicked', sourceScreen: 'events_feed'),
            );
            if (await blockContentActionIfSuspended(context, blockedSurfaceEvent: 'events_feed_create_blocked_suspended')) {
              return;
            }
            if (context.mounted) context.push('/events/create');
          },
          child: const Icon(Icons.add),
        ),
      ),
      body: CustomScrollView(
        slivers: [
          const SliverToBoxAdapter(
            child: PageHeader(
              title: 'Events',
              subtitle: 'Upcoming community events',
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: SegmentedButton<int>(
                segments: const [
                  ButtonSegment<int>(value: 0, label: Text('All Events')),
                  ButtonSegment<int>(value: 1, label: Text('Registered Events')),
                ],
                selected: {_tabIndex},
                onSelectionChanged: (Set<int> next) {
                  final to = next.first;
                  if (to != _tabIndex) {
                    unawaited(
                      ExpansionAnalytics.log(
                        'events_feed_subtab_changed',
                        sourceScreen: 'events_feed',
                        extra: <String, Object?>{'from_tab': _tabIndex, 'to_tab': to},
                      ),
                    );
                  }
                  setState(() => _tabIndex = to);
                },
                style: SegmentedButton.styleFrom(
                  selectedBackgroundColor: AppColors.primary,
                  selectedForegroundColor: AppColors.onPrimary,
                  backgroundColor: AppColors.secondary,
                  foregroundColor: AppColors.foreground,
                  side: const BorderSide(color: AppColors.border),
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
            sliver: StreamBuilder<List<CommunityEvent>>(
              stream: repo.watchPublishedEvents(),
              builder: (context, evSnap) {
                if (evSnap.hasError) {
                  if (!_eventsStreamErrorLogged) {
                    _eventsStreamErrorLogged = true;
                    final err = evSnap.error!;
                    SchedulerBinding.instance.addPostFrameCallback((_) {
                      unawaited(
                        ExpansionAnalytics.log(
                          'events_feed_stream_error',
                          sourceScreen: 'events_feed',
                          extra: ExpansionAnalytics.errorExtras(err, code: 'watchPublishedEvents'),
                        ),
                      );
                    });
                  }
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
                final visible = _visibleEvents(events, uid);
                if (visible.isEmpty) {
                  final message = _tabIndex == 1 && uid == null
                      ? 'Sign in to see events you\'re registered for.'
                      : 'You haven\'t registered for any events yet.';
                  return SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(8, 24, 8, 32),
                      child: Text(
                        message,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.mutedForeground, fontSize: 15),
                      ),
                    ),
                  );
                }
                return SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final e = visible[index];
                      return Padding(
                        padding: EdgeInsets.only(bottom: index < visible.length - 1 ? 16 : 0),
                        child: _EventListTile(
                          event: e,
                          uid: uid,
                          onTap: () {
                            unawaited(
                              ExpansionAnalytics.log(
                                'events_feed_event_tile_opened',
                                entityId: e.id,
                                sourceScreen: 'events_feed',
                              ),
                            );
                            context.push('/events/${e.id}');
                          },
                        ),
                      );
                    },
                    childCount: visible.length,
                  ),
                );
              },
            ),
          ),
        ],
      ),
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
        decoration: mortarEventListCardDecoration(event),
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
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(
                            child: Text(
                              event.title,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                            ),
                          ),
                          if (event.isMortarHostedEvent) ...[
                            const SizedBox(width: 8),
                            const MortarOfficialVerifiedSeal(),
                          ],
                        ],
                      ),
                      if (event.isMortarHostedEvent) ...[
                        const SizedBox(height: 8),
                        EventSourceBadges(event: event, dense: true),
                      ],
                    ],
                  ),
                ),
                if (registered) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('Registered', style: TextStyle(fontSize: 11, color: AppColors.onPrimary)),
                  ),
                ],
              ],
            ),
            if (event.showsMemberPoster) ...[
              const SizedBox(height: 10),
              EventPosterByline(userId: event.createdBy!, dense: true),
            ],
            const SizedBox(height: 12),
            _iconRow(Icons.calendar_today, formatEventDate(event.date)),
            _iconRow(Icons.schedule, event.time),
            _iconRow(Icons.place_outlined, event.location),
            _iconRow(Icons.category_outlined, event.eventType),
            _iconRow(Icons.people_outline, '${event.registeredCount} registered'),
            if (event.registeredCount > 0) ...[
              const SizedBox(height: 12),
              const Text(
                'RSVPs',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
              const SizedBox(height: 8),
              ...event.registeredUsers
                  .take(5)
                  .map((id) => EventRsvpAttendeeTile(userId: id, dense: true)),
              if (event.registeredCount > 5)
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: () => context.push('/events/${event.id}'),
                    child: Text('View all ${event.registeredCount} RSVPs'),
                  ),
                ),
            ],
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onTap,
                style: event.isMortarHostedEvent
                    ? OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary, width: 1.5),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      )
                    : OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                child: const Text('View details'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _iconRow(IconData icon, String text) {
    final accent = event.isMortarHostedEvent;
    final iconColor = accent ? AppColors.primary : AppColors.mutedForeground;
    final textColor = accent ? AppColors.foreground.withValues(alpha: 0.92) : AppColors.mutedForeground;
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
