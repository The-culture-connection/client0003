import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../services/explore_listings_repository.dart';
import '../theme/app_theme.dart';

class SkillCreateScreen extends StatefulWidget {
  const SkillCreateScreen({super.key});

  @override
  State<SkillCreateScreen> createState() => _SkillCreateScreenState();
}

class _SkillCreateScreenState extends State<SkillCreateScreen> {
  final _title = TextEditingController();
  final _summary = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final _repo = ExploreListingsRepository();
  bool _busy = false;

  @override
  void dispose() {
    _title.dispose();
    _summary.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    try {
      await _repo.createSkillListing(
        title: _title.text.trim(),
        summary: _summary.text.trim().isEmpty ? null : _summary.text.trim(),
      );
      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Skill listing posted.')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
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
                    IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
                    Text(
                      'Offer a skill',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          Expanded(
            child: Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  TextFormField(
                    controller: _title,
                    decoration: const InputDecoration(
                      labelText: 'Headline',
                      hintText: 'e.g. Pitch deck design, SQL tutoring',
                    ),
                    validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _summary,
                    decoration: const InputDecoration(
                      labelText: 'Summary',
                      hintText: 'What you offer, availability, etc.',
                    ),
                    maxLines: 5,
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      minimumSize: const Size.fromHeight(48),
                    ),
                    onPressed: _busy ? null : _submit,
                    child: _busy
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                          )
                        : const Text('Publish'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
