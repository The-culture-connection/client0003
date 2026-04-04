import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/group_categories.dart';
import '../models/group_thread_firestore.dart';
import '../services/group_thread_repository.dart';
import '../theme/app_theme.dart';
import '../utils/staff_claims.dart';

/// Edit community metadata (`groups_mobile`). Creator or staff (custom claims) only.
class GroupEditScreen extends StatefulWidget {
  const GroupEditScreen({required this.groupId, super.key});

  final String groupId;

  @override
  State<GroupEditScreen> createState() => _GroupEditScreenState();
}

class _GroupEditScreenState extends State<GroupEditScreen> {
  final _repo = GroupThreadRepository();
  final _name = TextEditingController();
  final _description = TextEditingController();
  final _rules = TextEditingController();
  String? _category;
  String _status = 'Open';
  bool _seeded = false;
  bool _saving = false;
  bool _deleting = false;

  @override
  void didUpdateWidget(covariant GroupEditScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.groupId != widget.groupId) {
      _seeded = false;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _rules.dispose();
    super.dispose();
  }

  void _seedFrom(FsGroup g) {
    if (_seeded) return;
    _seeded = true;
    _name.text = g.name;
    _description.text = g.description ?? '';
    _rules.text = g.rulesText ?? '';
    _category = (g.category != null && g.category!.isNotEmpty) ? g.category : null;
    _status = g.status == 'Closed' ? 'Closed' : 'Open';
  }

  Future<void> _save() async {
    final n = _name.text.trim();
    if (n.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Name is required.')));
      return;
    }
    setState(() => _saving = true);
    try {
      await _repo.updateGroupMetadata(
        groupId: widget.groupId,
        name: n,
        description: _description.text,
        category: _category ?? '',
        rulesText: _rules.text,
        status: _status,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved.')));
      context.pop();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete community?'),
        content: const Text(
          'This permanently removes the group and all threads and comments. This cannot be undone.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _deleting = true);
    try {
      await _repo.deleteGroup(widget.groupId);
      if (!mounted) return;
      context.go('/groups');
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Community deleted.')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<FsGroup?>(
      stream: _repo.watchGroup(widget.groupId),
      builder: (context, snap) {
        final g = snap.data;
        if (snap.connectionState == ConnectionState.waiting && g == null) {
          return Scaffold(
            backgroundColor: AppColors.background,
            appBar: AppBar(
              backgroundColor: AppColors.background,
              foregroundColor: AppColors.foreground,
              title: const Text('Edit community'),
            ),
            body: const Center(child: CircularProgressIndicator(color: AppColors.primary)),
          );
        }
        if (g == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Edit community')),
            body: const Center(child: Text('Group not found.')),
          );
        }
        _seedFrom(g);

        final uid = FirebaseAuth.instance.currentUser?.uid;
        return FutureBuilder<bool>(
          future: canManageMobileGroup(uid: uid, createdBy: g.createdBy),
          builder: (context, permSnap) {
            if (permSnap.connectionState != ConnectionState.done) {
              return Scaffold(
                backgroundColor: AppColors.background,
                appBar: AppBar(
                  backgroundColor: AppColors.background,
                  foregroundColor: AppColors.foreground,
                  title: const Text('Edit community'),
                ),
                body: const Center(child: CircularProgressIndicator(color: AppColors.primary)),
              );
            }
            if (permSnap.data != true) {
              return Scaffold(
                appBar: AppBar(title: const Text('Edit community')),
                body: const Center(child: Text('You do not have permission to edit this community.')),
              );
            }
            return Scaffold(
              backgroundColor: AppColors.background,
              appBar: AppBar(
                backgroundColor: AppColors.background,
                foregroundColor: AppColors.foreground,
                title: const Text('Edit community'),
              ),
              body: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  TextField(
                    controller: _name,
                    style: const TextStyle(color: AppColors.foreground),
                    decoration: const InputDecoration(
                      labelText: 'Community name',
                      filled: true,
                      fillColor: AppColors.secondary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String?>(
                    // ignore: deprecated_member_use
                    value: _category,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      labelText: 'Category',
                      filled: true,
                      fillColor: AppColors.secondary,
                    ),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text('None'),
                      ),
                      ...kGroupCategories.map(
                        (c) => DropdownMenuItem<String?>(value: c, child: Text(c)),
                      ),
                    ],
                    onChanged: (v) => setState(() => _category = v),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _description,
                    maxLines: 4,
                    style: const TextStyle(color: AppColors.foreground),
                    decoration: const InputDecoration(
                      labelText: 'About',
                      filled: true,
                      fillColor: AppColors.secondary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _rules,
                    maxLines: 4,
                    style: const TextStyle(color: AppColors.foreground),
                    decoration: const InputDecoration(
                      labelText: 'Rules',
                      filled: true,
                      fillColor: AppColors.secondary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text('Access', style: TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
                  const SizedBox(height: 8),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'Open', label: Text('Open'), icon: Icon(Icons.lock_open, size: 18)),
                      ButtonSegment(value: 'Closed', label: Text('Closed'), icon: Icon(Icons.lock_outline, size: 18)),
                    ],
                    selected: {_status},
                    onSelectionChanged: (s) => setState(() => _status = s.first),
                  ),
                  const SizedBox(height: 28),
                  FilledButton(
                    onPressed: (_saving || _deleting) ? null : _save,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      minimumSize: const Size(double.infinity, 48),
                    ),
                    child: _saving
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                          )
                        : const Text('Save changes'),
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton(
                    onPressed: (_saving || _deleting) ? null : _delete,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                      minimumSize: const Size(double.infinity, 48),
                    ),
                    child: _deleting
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.red),
                          )
                        : const Text('Delete community'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
