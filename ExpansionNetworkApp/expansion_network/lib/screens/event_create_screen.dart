import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';

/// Port of [UI Basis/src/app/pages/EventCreate.tsx]
class EventCreateScreen extends StatefulWidget {
  const EventCreateScreen({super.key});

  @override
  State<EventCreateScreen> createState() => _EventCreateScreenState();
}

class _EventCreateScreenState extends State<EventCreateScreen> {
  final _title = TextEditingController();
  final _date = TextEditingController();
  final _time = TextEditingController();
  final _location = TextEditingController();
  final _description = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _title.dispose();
    _date.dispose();
    _time.dispose();
    _location.dispose();
    _description.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      context.go('/events');
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
                        child: TextFormField(
                          controller: _date,
                          decoration: const InputDecoration(labelText: 'Date'),
                          validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: TextFormField(
                          controller: _time,
                          decoration: const InputDecoration(labelText: 'Time'),
                          validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _location,
                    decoration: const InputDecoration(labelText: 'Location'),
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
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.border, style: BorderStyle.solid),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.cloud_upload_outlined, size: 36, color: AppColors.mutedForeground),
                        const SizedBox(height: 8),
                        const Text('Click to upload flyer', style: TextStyle(color: AppColors.mutedForeground, fontSize: 13)),
                        const Text('PNG, JPG up to 10MB', style: TextStyle(color: AppColors.mutedForeground, fontSize: 11)),
                      ],
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
                    onPressed: _submit,
                    child: const Text('Submit for Approval'),
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
