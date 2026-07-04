import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../models/conference_session.dart';
import '../services/conference_repository.dart';
import '../theme/conference_colors.dart';
import '../widgets/conference_scope.dart';

class ConferenceScheduleScreen extends StatelessWidget {
  ConferenceScheduleScreen({super.key});

  final ConferenceRepository _repository = ConferenceRepository();

  @override
  Widget build(BuildContext context) {
    final conferenceId = ConferenceScope.of(context).conferenceId;
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: const Text('SCHEDULE', style: TextStyle(letterSpacing: 1)),
      ),
      body: StreamBuilder<List<ConferenceSession>>(
        stream: _repository.watchSessions(conferenceId),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator(color: ConferenceColors.gold));
          }
          final sessions = snapshot.data!;
          if (sessions.isEmpty) {
            return const Center(
              child: Text('No sessions published yet.', style: TextStyle(color: ConferenceColors.mutedForeground)),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 140),
            itemCount: sessions.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final session = sessions[index];
              return Material(
                color: Colors.white.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(16),
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () => context.push('/conference/schedule/${session.id}'),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                session.title,
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _subtitle(session),
                                style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded, color: ConferenceColors.gold),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  String _subtitle(ConferenceSession session) {
    final parts = <String>[];
    final start = session.startTime;
    if (start != null) parts.add(DateFormat('EEE, MMM d • h:mm a').format(start));
    if (session.roomLabel != null) parts.add(session.roomLabel!);
    return parts.join(' • ');
  }
}
