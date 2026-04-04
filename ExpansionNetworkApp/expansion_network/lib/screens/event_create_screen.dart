import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../services/events_repository.dart';
import '../theme/app_theme.dart';

class EventCreateScreen extends StatefulWidget {
  const EventCreateScreen({super.key});

  @override
  State<EventCreateScreen> createState() => _EventCreateScreenState();
}

class _EventCreateScreenState extends State<EventCreateScreen> {
  final _title = TextEditingController();
  final _location = TextEditingController();
  final _description = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final _eventsRepo = EventsRepository();
  final _imagePicker = ImagePicker();
  bool _submitting = false;
  /// `false` = in person (`In-person`), `true` = online (`Online`) — matches curriculum `event_type`.
  bool _online = false;
  DateTime? _eventDate;
  TimeOfDay? _eventTime;
  XFile? _pickedFlyer;
  static const int _maxFlyerBytes = 10 * 1024 * 1024;

  @override
  void dispose() {
    _title.dispose();
    _location.dispose();
    _description.dispose();
    super.dispose();
  }

  String _formatTime(BuildContext context, TimeOfDay t) {
    return t.format(context);
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: _eventDate ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 5),
      builder: (context, child) {
        final base = Theme.of(context);
        return Theme(
          data: base.copyWith(
            colorScheme: base.colorScheme.copyWith(primary: AppColors.primary),
          ),
          child: child!,
        );
      },
    );
    if (d != null) setState(() => _eventDate = d);
  }

  Future<void> _pickTime() async {
    final t = await showTimePicker(
      context: context,
      initialTime: _eventTime ?? TimeOfDay.now(),
      builder: (context, child) {
        final base = Theme.of(context);
        return Theme(
          data: base.copyWith(
            colorScheme: base.colorScheme.copyWith(primary: AppColors.primary),
          ),
          child: child!,
        );
      },
    );
    if (t != null) setState(() => _eventTime = t);
  }

  Future<void> _pickFlyer() async {
    try {
      final x = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        imageQuality: 85,
      );
      if (x == null) return;
      final len = await x.length();
      if (len > _maxFlyerBytes) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Image must be 10MB or smaller.')),
          );
        }
        return;
      }
      setState(() => _pickedFlyer = x);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open photo library: $e')),
        );
      }
    }
  }

  Future<String?> _uploadFlyerToStorage() async {
    final x = _pickedFlyer;
    if (x == null) return null;
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');

    final safeName = x.name.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    final objectName = '${DateTime.now().millisecondsSinceEpoch}_$safeName';
    final ref = FirebaseStorage.instance.ref().child('events/member_uploads/$uid/$objectName');

    final bytes = await x.readAsBytes();
    if (bytes.length > _maxFlyerBytes) {
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

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final time = _eventTime;
    if (time == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pick a time.')));
      return;
    }
    final timeStr = _formatTime(context, time);

    setState(() => _submitting = true);
    try {
      String? imageUrl;
      if (_pickedFlyer != null) {
        imageUrl = await _uploadFlyerToStorage();
      }
      await _eventsRepo.submitUserEventForApproval(
        title: _title.text.trim(),
        date: _eventDate,
        time: timeStr,
        location: _location.text.trim(),
        details: _description.text.trim(),
        eventType: _online ? 'Online' : 'In-person',
        imageUrl: imageUrl,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Submitted for approval. You’ll see it on the feed once staff approves.')),
        );
        context.go('/feed');
      }
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
    final dateLabel = _eventDate == null
        ? 'Pick date (optional)'
        : MaterialLocalizations.of(context).formatMediumDate(_eventDate!);
    final timeLabel = _eventTime == null ? 'Pick time' : _formatTime(context, _eventTime!);

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
                    Text(
                      'Create Event',
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
                    decoration: const InputDecoration(labelText: 'Event Title'),
                    validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _pickDate,
                          icon: const Icon(Icons.calendar_today_outlined, size: 18),
                          label: Text(dateLabel, maxLines: 1, overflow: TextOverflow.ellipsis),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.foreground,
                            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                            side: const BorderSide(color: AppColors.border),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _pickTime,
                          icon: const Icon(Icons.schedule, size: 18),
                          label: Text(timeLabel, maxLines: 1, overflow: TextOverflow.ellipsis),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: AppColors.onPrimary,
                            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Date is optional; time is required.',
                    style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                  ),
                  const SizedBox(height: 16),
                  const Text('Format', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  SegmentedButton<bool>(
                    segments: const [
                      ButtonSegment<bool>(
                        value: false,
                        label: Text('In person'),
                        icon: Icon(Icons.place_outlined, size: 18),
                      ),
                      ButtonSegment<bool>(
                        value: true,
                        label: Text('Online'),
                        icon: Icon(Icons.videocam_outlined, size: 18),
                      ),
                    ],
                    selected: {_online},
                    onSelectionChanged: (s) {
                      final v = s.contains(true);
                      setState(() => _online = v);
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _location,
                    decoration: InputDecoration(
                      labelText: _online ? 'Link or how to join' : 'Location',
                      hintText: _online ? 'e.g. Zoom link, Google Meet, or platform name' : 'Address or venue',
                    ),
                    validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _description,
                    decoration: const InputDecoration(labelText: 'Description'),
                    maxLines: 4,
                    validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 24),
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: _submitting ? null : _pickFlyer,
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          border: Border.all(color: AppColors.border, style: BorderStyle.solid),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          children: [
                            Icon(Icons.cloud_upload_outlined, size: 36, color: AppColors.mutedForeground),
                            const SizedBox(height: 8),
                            Text(
                              _pickedFlyer == null ? 'Tap to add flyer (optional)' : _pickedFlyer!.name,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: AppColors.foreground, fontSize: 13),
                            ),
                            const Text('PNG, JPG up to 10MB', style: TextStyle(color: AppColors.mutedForeground, fontSize: 11)),
                            if (_pickedFlyer != null) ...[
                              const SizedBox(height: 12),
                              TextButton(
                                onPressed: _submitting ? null : () => setState(() => _pickedFlyer = null),
                                child: const Text('Remove image'),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF8E1),
                      border: Border.all(color: const Color(0xFFFFE082)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Your event will be submitted for approval and will be visible to all members once approved.',
                      style: TextStyle(fontSize: 13, color: Color(0xFF5D4037)),
                    ),
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      minimumSize: const Size.fromHeight(48),
                    ),
                    onPressed: _submitting ? null : _submit,
                    child: _submitting
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                          )
                        : const Text('Submit for Approval'),
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
