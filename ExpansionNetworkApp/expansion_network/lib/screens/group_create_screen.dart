import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/group_categories.dart';
import '../services/group_thread_repository.dart';
import '../theme/app_theme.dart';

/// Create a community in Firestore `groups_mobile` (open to all; any signed-in user).
class GroupCreateScreen extends StatefulWidget {
  const GroupCreateScreen({super.key});

  @override
  State<GroupCreateScreen> createState() => _GroupCreateScreenState();
}

class _GroupCreateScreenState extends State<GroupCreateScreen> {
  final _repo = GroupThreadRepository();
  final _name = TextEditingController();
  final _description = TextEditingController();
  final _rules = TextEditingController();
  String? _category;
  bool _submitting = false;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _rules.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final n = _name.text.trim();
    if (n.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a community name.')));
      return;
    }
    setState(() => _submitting = true);
    try {
      final id = await _repo.createGroup(
        name: n,
        description: _description.text.trim().isEmpty ? null : _description.text.trim(),
        rulesText: _rules.text.trim().isEmpty ? null : _rules.text.trim(),
        category: _category,
      );
      if (!mounted) return;
      context.go('/groups/$id');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.foreground,
        title: const Text('Create community'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Like a subreddit: this is a public space. Anyone signed in can join and start threads.',
            style: TextStyle(fontSize: 13, color: AppColors.mutedForeground.withValues(alpha: 0.95), height: 1.35),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _name,
            style: const TextStyle(color: AppColors.foreground),
            decoration: const InputDecoration(
              labelText: 'Community name',
              hintText: 'e.g. Austin Alumni Founders',
              filled: true,
              fillColor: AppColors.secondary,
            ),
            textCapitalization: TextCapitalization.words,
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String?>(
            // Controlled selection; `value` still required until FormField API stabilizes.
            // ignore: deprecated_member_use
            value: _category,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Category (optional)',
              filled: true,
              fillColor: AppColors.secondary,
            ),
            items: [
              const DropdownMenuItem<String?>(value: null, child: Text('Choose a category')),
              ...kGroupCategories.map(
                (c) => DropdownMenuItem<String?>(value: c, child: Text(c)),
              ),
            ],
            onChanged: (v) => setState(() => _category = v),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _description,
            maxLines: 3,
            style: const TextStyle(color: AppColors.foreground),
            decoration: const InputDecoration(
              labelText: 'About (optional)',
              hintText: 'What is this community for?',
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
              labelText: 'Rules (optional)',
              filled: true,
              fillColor: AppColors.secondary,
            ),
          ),
          const SizedBox(height: 28),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              minimumSize: const Size(double.infinity, 48),
            ),
            child: _submitting
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                  )
                : const Text('Create community'),
          ),
        ],
      ),
    );
  }
}
