import 'dart:async';
import 'dart:typed_data';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../analytics/expansion_analytics.dart';
import '../router/feed_post_navigation.dart';
import '../services/feed_posts_repository.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../utils/content_action_guard.dart';

/// Create a community feed post: description and optional image (no separate title/category in UI).
class CreatePostScreen extends StatefulWidget {
  const CreatePostScreen({super.key});

  @override
  State<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends State<CreatePostScreen> {
  static const int _maxImageBytes = 10 * 1024 * 1024;

  final _details = TextEditingController();
  final _posts = FeedPostsRepository();
  final _users = UserProfileRepository();
  final _picker = ImagePicker();

  bool _saving = false;
  XFile? _pickedImage;
  Uint8List? _pickedPreviewBytes;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(ExpansionAnalytics.log('feed_post_compose_started', sourceScreen: 'feed_post_compose'));
    });
  }

  @override
  void dispose() {
    _details.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    if (_saving) return;
    try {
      final x = await _picker.pickImage(source: ImageSource.gallery, maxWidth: 2048, maxHeight: 2048, imageQuality: 88);
      if (x == null) return;
      final len = await x.length();
      if (len > _maxImageBytes) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Image must be 10MB or smaller.')),
          );
        }
        return;
      }
      final bytes = await x.readAsBytes();
      setState(() {
        _pickedImage = x;
        _pickedPreviewBytes = bytes;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open photo library: $e')),
        );
      }
    }
  }

  void _clearImage() {
    if (_saving) return;
    setState(() {
      _pickedImage = null;
      _pickedPreviewBytes = null;
    });
  }

  Future<String?> _uploadImage() async {
    final x = _pickedImage;
    if (x == null) return null;
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');

    final safeName = x.name.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    final objectName = '${DateTime.now().millisecondsSinceEpoch}_$safeName';
    final ref = FirebaseStorage.instance.ref().child('feed_posts/member_uploads/$uid/$objectName');

    final bytes = await x.readAsBytes();
    if (bytes.length > _maxImageBytes) {
      throw StateError('Image must be 10MB or smaller.');
    }

    final contentType = _guessImageContentType(safeName);
    await ref.putData(bytes, SettableMetadata(contentType: contentType));
    return ref.getDownloadURL();
  }

  static String _guessImageContentType(String name) {
    final lower = name.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
  }

  String? _validateBody() {
    final d = _details.text.trim();
    final hasImage = _pickedImage != null;
    if (d.isEmpty && !hasImage) {
      return 'Add a description or a photo';
    }
    return null;
  }

  Future<void> _submit() async {
    final bodyErr = _validateBody();
    if (bodyErr != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(bodyErr)));
      return;
    }
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;

    if (await blockContentActionIfSuspended(context, blockedSurfaceEvent: 'feed_post_create_blocked_suspended')) {
      return;
    }

    unawaited(ExpansionAnalytics.log('feed_post_create_submitted', sourceScreen: 'feed_post_compose'));
    setState(() => _saving = true);
    try {
      await _users.assertCallerNotContentSuspended();
      String? imageUrl;
      if (_pickedImage != null) {
        imageUrl = await _uploadImage();
      }

      final data = await _users.getUserDoc(uid);
      final fn = _s(data?['first_name']) ?? _s(data?['firstName']);
      final ln = _s(data?['last_name']) ?? _s(data?['lastName']);
      final combined = '${fn ?? ''} ${ln ?? ''}'.trim();
      final authorName = combined.isNotEmpty
          ? combined
          : (FirebaseAuth.instance.currentUser?.email ?? 'Member');

      final details = _details.text.trim();
      final title = (details.isEmpty && _pickedImage != null) ? 'Photo' : '';

      final id = await _posts.createPost(
        postCategory: 'General',
        postTitle: title,
        postDetails: details,
        authorName: authorName,
        imageUrl: imageUrl,
      );
      await ExpansionAnalytics.log(
        'feed_post_create_succeeded',
        entityId: id,
        sourceScreen: 'feed_post_compose',
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
                      onPressed: _saving ? null : () => context.pop(),
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
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                Text(
                  'Description',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _details,
                  decoration: const InputDecoration(
                    hintText: 'What would you like to share?',
                    alignLabelWithHint: true,
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 8,
                  minLines: 4,
                  enabled: !_saving,
                ),
                const SizedBox(height: 20),
                Text(
                  'Photo',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                if (_pickedImage == null)
                  OutlinedButton.icon(
                    onPressed: _saving ? null : _pickImage,
                    icon: const Icon(Icons.add_photo_alternate_outlined),
                    label: const Text('Add image'),
                  )
                else
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: _pickedPreviewBytes != null
                            ? Image.memory(_pickedPreviewBytes!, fit: BoxFit.cover)
                            : const SizedBox(
                                height: 200,
                                child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                              ),
                      ),
                      TextButton.icon(
                        onPressed: _saving ? null : _clearImage,
                        icon: const Icon(Icons.delete_outline),
                        label: const Text('Remove image'),
                      ),
                    ],
                  ),
                const SizedBox(height: 24),
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
        ],
      ),
    );
  }
}
