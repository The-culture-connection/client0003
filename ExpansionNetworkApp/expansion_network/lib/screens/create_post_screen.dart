import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../router/feed_post_navigation.dart';
import '../data/feed_post_categories.dart';
import '../services/feed_posts_repository.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';

/// Create a community feed post (category, title, details) — mirrors curriculum discussions.
class CreatePostScreen extends StatefulWidget {
  const CreatePostScreen({super.key});

  @override
  State<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends State<CreatePostScreen> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _details = TextEditingController();
  final _posts = FeedPostsRepository();
  final _users = UserProfileRepository();

  String _category = kFeedPostCategories.first;
  bool _saving = false;

  @override
  void dispose() {
    _title.dispose();
    _details.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;

    setState(() => _saving = true);
    try {
      final data = await _users.getUserDoc(uid);
      final fn = _s(data?['first_name']) ?? _s(data?['firstName']);
      final ln = _s(data?['last_name']) ?? _s(data?['lastName']);
      final combined = '${fn ?? ''} ${ln ?? ''}'.trim();
      final authorName = combined.isNotEmpty
          ? combined
          : (FirebaseAuth.instance.currentUser?.email ?? 'Member');

      final id = await _posts.createPost(
        postCategory: _category,
        postTitle: _title.text.trim(),
        postDetails: _details.text.trim(),
        authorName: authorName,
      );
      if (!mounted) return;
      context.pop();
      pushFeedPostDetail(context, id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not post: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String? _s(dynamic v) => v is String && v.trim().isNotEmpty ? v.trim() : null;

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
                    IconButton(
                      icon: const Icon(Icons.arrow_back),
                      onPressed: () => context.pop(),
                    ),
                    Expanded(
                      child: Text(
                        'New post',
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
            child: Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  Text('Category', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: _category,
                    decoration: const InputDecoration(border: OutlineInputBorder()),
                    items: [
                      for (final c in kFeedPostCategories)
                        DropdownMenuItem(value: c, child: Text(c, overflow: TextOverflow.ellipsis)),
                    ],
                    onChanged: _saving ? null : (v) => setState(() => _category = v ?? _category),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Same categories as the digital curriculum discussions.',
                    style: TextStyle(fontSize: 12, color: AppColors.mutedForeground.withValues(alpha: 0.9)),
                  ),
                  const SizedBox(height: 20),
                  TextFormField(
                    controller: _title,
                    decoration: const InputDecoration(
                      labelText: 'Post title',
                      border: OutlineInputBorder(),
                    ),
                    maxLength: 200,
                    enabled: !_saving,
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter a title' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _details,
                    decoration: const InputDecoration(
                      labelText: 'Post details',
                      alignLabelWithHint: true,
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 10,
                    minLines: 5,
                    enabled: !_saving,
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter details' : null,
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _saving ? null : _submit,
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
