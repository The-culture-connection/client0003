import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../services/admin_moderation_repository.dart';
import '../services/user_reports_repository.dart';
import '../services/expansion_session_service.dart';
import '../theme/app_theme.dart';
import '../utils/staff_claims.dart';

/// Staff-only: triage `user_reports` and toggle `users.{uid}.content_suspended`.
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

  Future<void> _moderate(String reportedUid, String action, String label) async {
    final key = '$reportedUid:$action';
    setState(() => _actionLoading.add(key));
    try {
      await _moderation.moderateUserAccount(uid: reportedUid, action: action);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$label applied.')));
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
                'Expand a report for profile + activity (callable). Ban disables the account; Unsuspend clears content suspension only. Investigate / Resolve still update the report doc.',
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
                  final docs = snap.data!
                      .where((d) {
                        final s = d.data()['status'] as String? ?? '';
                        return s == 'open' || s == 'investigating';
                      })
                      .toList();
                  if (docs.isEmpty) {
                    return const Center(
                      child: Text('No open reports.', style: TextStyle(color: AppColors.mutedForeground)),
                    );
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    itemCount: docs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, i) {
                      final d = docs[i];
                      final data = d.data();
                      final reporter = data['reporter_id'] as String? ?? '';
                      final reported = data['reported_user_id'] as String? ?? '';
                      final reason = data['reason'] as String? ?? '';
                      final status = data['status'] as String? ?? '';
                      final created = data['created_at'];
                      String? ts;
                      if (created is Timestamp) {
                        ts = created.toDate().toLocal().toString();
                      }
                      final expanded = _expandedId == d.id;
                      final snapLoading = _snapshotLoading.contains(d.id);
                      final snapData = _snapshots[d.id];
                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Status: $status', style: const TextStyle(fontWeight: FontWeight.w600)),
                            if (ts != null) Text(ts, style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                            const SizedBox(height: 8),
                            Text('Reported UID: $reported', style: const TextStyle(fontSize: 12)),
                            Text('Reporter UID: $reporter', style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                            const SizedBox(height: 8),
                            Text(reason, style: const TextStyle(fontSize: 13, height: 1.35)),
                            const SizedBox(height: 10),
                            TextButton.icon(
                              onPressed: () => _toggleExpanded(d.id, reported),
                              icon: Icon(expanded ? Icons.expand_less : Icons.expand_more),
                              label: Text(expanded ? 'Hide profile & activity' : 'Show profile & activity'),
                            ),
                            if (expanded) ...[
                              if (snapLoading)
                                const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 12),
                                  child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                                )
                              else if (snapData != null)
                                Container(
                                  width: double.infinity,
                                  margin: const EdgeInsets.only(bottom: 12),
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.secondary,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  child: SelectableText(
                                    const JsonEncoder.withIndent('  ').convert(snapData),
                                    style: const TextStyle(fontSize: 10, fontFamily: 'monospace', height: 1.25),
                                  ),
                                ),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  FilledButton(
                                    style: FilledButton.styleFrom(backgroundColor: Colors.red.shade800),
                                    onPressed: reported.isEmpty ||
                                            _actionLoading.contains('$reported:ban')
                                        ? null
                                        : () => _moderate(reported, 'ban', 'Ban'),
                                    child: _actionLoading.contains('$reported:ban')
                                        ? const SizedBox(
                                            height: 18,
                                            width: 18,
                                            child: CircularProgressIndicator(strokeWidth: 2),
                                          )
                                        : const Text('Ban'),
                                  ),
                                  OutlinedButton(
                                    onPressed: reported.isEmpty ||
                                            _actionLoading.contains('$reported:lift_content_suspension')
                                        ? null
                                        : () => _moderate(
                                              reported,
                                              'lift_content_suspension',
                                              'Unsuspend',
                                            ),
                                    child: _actionLoading.contains('$reported:lift_content_suspension')
                                        ? const SizedBox(
                                            height: 18,
                                            width: 18,
                                            child: CircularProgressIndicator(strokeWidth: 2),
                                          )
                                        : const Text('Unsuspend'),
                                  ),
                                  OutlinedButton(
                                    onPressed: reported.isEmpty ||
                                            _actionLoading.contains('$reported:unban')
                                        ? null
                                        : () => _moderate(reported, 'unban', 'Unban'),
                                    child: _actionLoading.contains('$reported:unban')
                                        ? const SizedBox(
                                            height: 18,
                                            width: 18,
                                            child: CircularProgressIndicator(strokeWidth: 2),
                                          )
                                        : const Text('Unban'),
                                  ),
                                ],
                              ),
                            ],
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                if (status == 'open')
                                  FilledButton(
                                    onPressed: () async {
                                      try {
                                        await _reports.startInvestigation(
                                          reportId: d.id,
                                          reportedUserId: reported,
                                        );
                                        if (context.mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(
                                              content: Text('Marked investigating; member suspended from posting.'),
                                            ),
                                          );
                                        }
                                      } catch (e) {
                                        if (context.mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                                        }
                                      }
                                    },
                                    child: const Text('Investigate'),
                                  ),
                                if (status == 'investigating' || status == 'open')
                                  OutlinedButton(
                                    onPressed: () async {
                                      try {
                                        await _reports.resolveAndLiftSuspension(
                                          reportId: d.id,
                                          reportedUserId: reported,
                                        );
                                        if (context.mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(content: Text('Resolved; suspension lifted.')),
                                          );
                                        }
                                      } catch (e) {
                                        if (context.mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                                        }
                                      }
                                    },
                                    child: const Text('Resolve & lift'),
                                  ),
                                TextButton(
                                  onPressed: () async {
                                    try {
                                      await _reports.dismissReport(d.id);
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Report dismissed.')),
                                        );
                                      }
                                    } catch (e) {
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                                      }
                                    }
                                  },
                                  child: const Text('Dismiss'),
                                ),
                              ],
                            ),
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
