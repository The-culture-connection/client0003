import 'package:cached_network_image/cached_network_image.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/community_event.dart';
import '../services/events_repository.dart';
import '../theme/app_theme.dart';
import '../utils/relative_time.dart';
import '../widgets/event_rsvp_attendee_tile.dart';

class EventDetailScreen extends StatefulWidget {
  const EventDetailScreen({super.key, required this.eventId});

  final String eventId;

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  final _events = EventsRepository();
  bool _loading = true;
  bool _busy = false;
  CommunityEvent? _event;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final e = await _events.getEvent(widget.eventId);
      if (!mounted) return;
      setState(() {
        _event = e;
        _loading = false;
        if (e == null) _error = 'Event not found.';
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = e.toString();
        });
      }
    }
  }

  Future<void> _toggleRegister(CommunityEvent e) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    setState(() => _busy = true);
    try {
      if (e.isRegistered(uid)) {
        await _events.unregister(widget.eventId);
      } else {
        await _events.register(widget.eventId);
      }
      await _load();
    } catch (err) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$err')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final e = _event;
    final uid = FirebaseAuth.instance.currentUser?.uid;
    final u = uid;
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
                      icon: const Icon(Icons.arrow_back),
                      onPressed: () => context.pop(),
                    ),
                    Expanded(
                      child: Text(
                        'Event',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _error != null
                    ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!)))
                    : e == null
                        ? const SizedBox.shrink()
                        : ListView(
                            padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                            children: [
                              if (!e.isPublished) ...[
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: AppColors.secondary,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  child: Text(
                                    e.approvalStatus == 'pending'
                                        ? 'This event is pending approval and is not visible on the public feed yet.'
                                        : e.approvalStatus == 'rejected'
                                            ? 'This event was not approved.${e.rejectionReason != null && e.rejectionReason!.isNotEmpty ? ' ${e.rejectionReason}' : ''}'
                                            : 'This event is not published.',
                                    style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                                  ),
                                ),
                                const SizedBox(height: 16),
                              ],
                              if (e.imageUrl != null && e.imageUrl!.isNotEmpty)
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: AspectRatio(
                                    aspectRatio: 16 / 9,
                                    child: CachedNetworkImage(
                                      imageUrl: e.imageUrl!,
                                      fit: BoxFit.cover,
                                      placeholder: (_, __) => Container(color: AppColors.secondary),
                                      errorWidget: (_, __, ___) => Container(
                                        color: AppColors.secondary,
                                        alignment: Alignment.center,
                                        child: const Icon(Icons.event, size: 48, color: AppColors.mutedForeground),
                                      ),
                                    ),
                                  ),
                                ),
                              if (e.imageUrl != null && e.imageUrl!.isNotEmpty) const SizedBox(height: 16),
                              Text(
                                e.title,
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  Chip(
                                    label: Text(e.eventType),
                                    backgroundColor: AppColors.secondary,
                                    side: const BorderSide(color: AppColors.border),
                                  ),
                                  if (e.date != null)
                                    Chip(
                                      label: Text(formatEventDate(e.date)),
                                      backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                                      side: BorderSide.none,
                                    ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              _row(Icons.schedule, e.time),
                              _row(Icons.place_outlined, e.location),
                              _row(Icons.people_outline, '${e.registeredCount} registered'),
                              if (e.totalSpots != null && e.totalSpots! > 0)
                                _row(Icons.event_seat, '${e.availableSpots ?? 0} spots left of ${e.totalSpots}'),
                              const SizedBox(height: 20),
                              Text(
                                'Details',
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                e.details,
                                style: const TextStyle(fontSize: 15, height: 1.45, color: AppColors.foreground),
                              ),
                              const SizedBox(height: 24),
                              Text(
                                'RSVPs · ${e.registeredCount} going',
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 8),
                              if (e.registeredUsers.isEmpty)
                                const Text(
                                  'No RSVPs yet. Be the first to register.',
                                  style: TextStyle(fontSize: 14, color: AppColors.mutedForeground),
                                )
                              else
                                ...e.registeredUsers.map(
                                  (id) => EventRsvpAttendeeTile(userId: id),
                                ),
                              const SizedBox(height: 24),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: (!e.isPublished ||
                                          _busy ||
                                          u == null ||
                                          (e.isFull && !e.isRegistered(u)))
                                      ? null
                                      : () => _toggleRegister(e),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: AppColors.onPrimary,
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                  ),
                                  child: _busy
                                      ? const SizedBox(
                                          height: 22,
                                          width: 22,
                                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                                        )
                                      : Text(
                                          u != null && e.isRegistered(u)
                                              ? 'Unregister'
                                              : e.isFull
                                                  ? 'Event full'
                                                  : 'Register',
                                        ),
                                ),
                              ),
                            ],
                          ),
          ),
        ],
      ),
    );
  }

  Widget _row(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: AppColors.mutedForeground),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 15, color: AppColors.mutedForeground))),
        ],
      ),
    );
  }
}
