import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../services/admin_moderation_repository.dart';
import '../services/user_reports_repository.dart';
import '../services/expansion_session_service.dart';
import '../theme/app_theme.dart';
import '../utils/staff_claims.dart';

/// Staff-only: triage `user_reports` with Ban / Unsuspend and structured profile snapshot.
class AdminReportsScreen extends StatelessWidget {
  const AdminReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: currentUserHasStaffClaim(),
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
          );
        }
        if (snap.data != true) {
          return Scaffold(
            appBar: AppBar(title: const Text('User reports')),
            body: const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'You need an Admin or superAdmin role to view reports.',
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          );
        }
        return const _AdminReportsBody();
      },
    );
  }
}

String _str(dynamic v) {
  if (v == null) return '';
  if (v is String) return v;
  return v.toString();
}

Map<String, dynamic> _asStringKeyedMap(dynamic raw) {
  if (raw is Map) {
    return raw.map((k, v) => MapEntry(_str(k), v));
  }
  return {};
}

bool _isFinalized(Map<String, dynamic> data) {
  final sr = _str(data['staff_resolution']);
  return sr == 'ban' || sr == 'unsuspend';
}

List<QueryDocumentSnapshot<Map<String, dynamic>>> _visibleSorted(
  List<QueryDocumentSnapshot<Map<String, dynamic>>> docs,
) {
  final list = docs.where((d) {
    final data = d.data();
    if (_isFinalized(data)) return true;
    final s = _str(data['status']);
    return s == 'open' || s == 'investigating';
  }).toList();
  list.sort((a, b) {
    final fa = _isFinalized(a.data()) ? 1 : 0;
    final fb = _isFinalized(b.data()) ? 1 : 0;
    if (fa != fb) return fa.compareTo(fb);
    final ta = a.data()['created_at'];
    final tb = b.data()['created_at'];
    if (ta is Timestamp && tb is Timestamp) return tb.compareTo(ta);
    return 0;
  });
  return list;
}

class _ModerationSnapshotPanel extends StatelessWidget {
  const _ModerationSnapshotPanel({required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final user = _asStringKeyedMap(data['user']);
    final feedPosts = (data['feedPosts'] is List) ? data['feedPosts'] as List : const [];
    final eventsMobile = (data['eventsMobile'] is List) ? data['eventsMobile'] as List : const [];
    final reportsAbout = (data['reportsAboutUser'] is List) ? data['reportsAboutUser'] as List : const [];

    final name = [_str(user['first_name']), _str(user['last_name'])].where((e) => e.isNotEmpty).join(' ').trim();
    final nameLine = name.isNotEmpty ? name : (_str(user['display_name']).isNotEmpty ? _str(user['display_name']) : '—');
    final tribe = _str(user['tribe']).isNotEmpty ? _str(user['tribe']) : _str(user['industry']);
    final flags = <String>[
      if (user['account_banned'] == true) 'Account banned',
      if (user['content_suspended'] == true) 'Content suspended',
    ];

    Widget row(String label, String value) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 120,
              child: Text(label, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground, fontWeight: FontWeight.w600)),
            ),
            Expanded(child: Text(value.isEmpty ? '—' : value, style: const TextStyle(fontSize: 13, height: 1.35))),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Member profile', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.mutedForeground)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.secondary,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              row('Name', nameLine),
              row('Email', _str(user['email'])),
              row('Profession', _str(user['profession'])),
              row('Tribe', tribe.isEmpty ? '—' : tribe),
              row('City / state', [_str(user['city']), _str(user['state'])].where((e) => e.isNotEmpty).join(', ')),
              row('Flags', flags.isEmpty ? 'None' : flags.join(' · ')),
              if (_str(user['bio']).isNotEmpty) ...[
                const Divider(height: 20, color: AppColors.border),
                const Text('Bio', style: TextStyle(fontSize: 11, color: AppColors.mutedForeground, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(_str(user['bio']), style: const TextStyle(fontSize: 13, height: 1.35)),
              ],
            ],
          ),
        ),
        const SizedBox(height: 20),
        Text('Recent feed posts (${feedPosts.length})', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.mutedForeground)),
        const SizedBox(height: 8),
        if (feedPosts.isEmpty)
          const Text('No recent posts found.', style: TextStyle(fontSize: 13, color: AppColors.mutedForeground))
        else
          ...feedPosts.take(6).map((raw) {
            final p = _asStringKeyedMap(raw);
            final text = [
              _str(p['post_title']),
              _str(p['post_details']),
              _str(p['description']),
              _str(p['body']),
            ].firstWhere((e) => e.isNotEmpty, orElse: () => '(no text)');
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
                color: AppColors.card,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_str(p['id']), style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: AppColors.mutedForeground)),
                  const SizedBox(height: 4),
                  Text(text, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, height: 1.3)),
                ],
              ),
            );
          }),
        const SizedBox(height: 16),
        Text('Events — mobile (${eventsMobile.length})', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.mutedForeground)),
        const SizedBox(height: 8),
        if (eventsMobile.isEmpty)
          const Text('No events found.', style: TextStyle(fontSize: 13, color: AppColors.mutedForeground))
        else
          ...eventsMobile.take(6).map((raw) {
            final e = _asStringKeyedMap(raw);
            final meta = [_str(e['date']), _str(e['time']), _str(e['approval_status'])].where((x) => x.isNotEmpty).join(' · ');
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
                color: AppColors.card,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_str(e['title']).isEmpty ? 'Event' : _str(e['title']), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  if (meta.isNotEmpty) Text(meta, style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                ],
              ),
            );
          }),
        const SizedBox(height: 16),
        Text('Other reports about this member (${reportsAbout.length})', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.mutedForeground)),
        const SizedBox(height: 8),
        if (reportsAbout.isEmpty)
          const Text('None in snapshot.', style: TextStyle(fontSize: 13, color: AppColors.mutedForeground))
        else
          ...reportsAbout.take(5).map((raw) {
            final r = _asStringKeyedMap(raw);
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
                color: AppColors.card,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_str(r['status']), style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                  const SizedBox(height: 4),
                  Text(_str(r['reason']), maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, height: 1.3)),
                ],
              ),
            );
          }),
      ],
    );
  }
}

class _AdminReportsBody extends StatefulWidget {
  const _AdminReportsBody();

  @override
  State<_AdminReportsBody> createState() => _AdminReportsBodyState();
}

class _AdminReportsBodyState extends State<_AdminReportsBody> {
  final _reports = UserReportsRepository();
  final _moderation = AdminModerationRepository();

  String? _expandedId;
  final Map<String, Map<String, dynamic>> _snapshots = {};
  final Set<String> _snapshotLoading = {};
  final Set<String> _actionLoading = {};

  Future<void> _loadSnapshot(String reportId, String reportedUid) async {
    if (_snapshots.containsKey(reportId)) return;
    setState(() => _snapshotLoading.add(reportId));
    try {
      final data = await _moderation.getUserModerationSnapshot(reportedUid);
      if (!mounted) return;
      setState(() {
        _snapshots[reportId] = data;
        _snapshotLoading.remove(reportId);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _snapshotLoading.remove(reportId));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userMessageForFirebaseCallableError(e))),
      );
    }
  }

  void _toggleExpanded(String reportId, String? reportedUid) {
    setState(() {
      if (_expandedId == reportId) {
        _expandedId = null;
      } else {
        _expandedId = reportId;
        if (reportedUid != null && reportedUid.isNotEmpty) {
          _loadSnapshot(reportId, reportedUid);
        }
      }
    });
  }

  Future<void> _finalize(String reportId, String reportedUid, {required bool ban}) async {
    final key = '${reportId}_${ban ? 'ban' : 'unsuspend'}';
    setState(() => _actionLoading.add(key));
    try {
      await _reports.finalizeStaffModeration(reportId: reportId, reportedUserId: reportedUid, ban: ban);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ban ? 'Ban recorded on this report.' : 'Unsuspend recorded on this report.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userMessageForFirebaseCallableError(e))),
      );
    } finally {
      if (mounted) setState(() => _actionLoading.remove(key));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back),
                    onPressed: () => context.pop(),
                  ),
                  Expanded(
                    child: Text(
                      'User reports',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: Text(
                'Ban or Unsuspend from each card. A decision marks the report resolved and cannot be changed from this screen. Expand Profile & activity for a readable summary.',
                style: TextStyle(fontSize: 13, color: AppColors.mutedForeground, height: 1.35),
              ),
            ),
            const Divider(height: 1, color: AppColors.border),
            Expanded(
              child: StreamBuilder<List<QueryDocumentSnapshot<Map<String, dynamic>>>>(
                stream: _reports.watchReports(),
                builder: (context, snap) {
                  if (snap.hasError) {
                    return Center(child: Text('${snap.error}', textAlign: TextAlign.center));
                  }
                  if (!snap.hasData) {
                    return const Center(child: CircularProgressIndicator(color: AppColors.primary));
                  }
                  final docs = _visibleSorted(snap.data!);
                  if (docs.isEmpty) {
                    return const Center(
                      child: Text('No reports in the active queue.', style: TextStyle(color: AppColors.mutedForeground)),
                    );
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    itemCount: docs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, i) {
                      final d = docs[i];
                      final data = d.data();
                      final reported = _str(data['reported_user_id']);
                      final reason = _str(data['reason']);
                      final status = _str(data['status']);
                      final sr = _str(data['staff_resolution']);
                      final finalized = _isFinalized(data);
                      final expanded = _expandedId == d.id;
                      final snapLoading = _snapshotLoading.contains(d.id);
                      final snapData = _snapshots[d.id];
                      final busyBan = _actionLoading.contains('${d.id}_ban');
                      final busyUns = _actionLoading.contains('${d.id}_unsuspend');
                      final anyBusy = _actionLoading.isNotEmpty;

                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: finalized ? AppColors.secondary.withValues(alpha: 0.65) : AppColors.card,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: finalized ? AppColors.mutedForeground.withValues(alpha: 0.35) : AppColors.border,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Wrap(
                                    crossAxisAlignment: WrapCrossAlignment.center,
                                    spacing: 8,
                                    runSpacing: 6,
                                    children: [
                                      const Text('Report', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(color: AppColors.border),
                                        ),
                                        child: Text('Status: $status', style: const TextStyle(fontSize: 11)),
                                      ),
                                      if (finalized)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            borderRadius: BorderRadius.circular(6),
                                            color: sr == 'ban' ? Colors.red.shade900.withValues(alpha: 0.85) : AppColors.primary.withValues(alpha: 0.2),
                                          ),
                                          child: Text(
                                            sr == 'ban' ? 'Final: banned' : 'Final: posting restored',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                              color: sr == 'ban' ? Colors.white : AppColors.primary,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                                TextButton.icon(
                                  onPressed: () => _toggleExpanded(d.id, reported.isEmpty ? null : reported),
                                  icon: Icon(expanded ? Icons.expand_less : Icons.expand_more, size: 18),
                                  label: Text(expanded ? 'Hide profile' : 'Profile & activity'),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text('Reported UID: $reported', style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: AppColors.mutedForeground)),
                            const SizedBox(height: 8),
                            Text(reason, style: const TextStyle(fontSize: 13, height: 1.35)),
                            if (!finalized && reported.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              const Divider(height: 1, color: AppColors.border),
                              const SizedBox(height: 10),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  FilledButton(
                                    style: FilledButton.styleFrom(backgroundColor: Colors.red.shade800),
                                    onPressed: anyBusy
                                        ? null
                                        : () => _finalize(d.id, reported, ban: true),
                                    child: busyBan
                                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                        : const Text('Ban'),
                                  ),
                                  OutlinedButton(
                                    onPressed: anyBusy ? null : () => _finalize(d.id, reported, ban: false),
                                    child: busyUns
                                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                                        : const Text('Unsuspend'),
                                  ),
                                ],
                              ),
                            ],
                            if (finalized) ...[
                              const SizedBox(height: 10),
                              const Divider(height: 1, color: AppColors.border),
                              const SizedBox(height: 8),
                              const Text(
                                'No further actions — decision recorded on this report.',
                                style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                              ),
                            ],
                            if (expanded) ...[
                              const SizedBox(height: 12),
                              const Divider(height: 1, color: AppColors.border),
                              const SizedBox(height: 12),
                              if (snapLoading)
                                const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 16),
                                  child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                                )
                              else if (snapData != null)
                                _ModerationSnapshotPanel(data: snapData)
                              else
                                const Text('Loading or open again to fetch details.', style: TextStyle(color: AppColors.mutedForeground)),
                            ],
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
