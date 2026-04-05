import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/explore_posting_industries.dart';
import '../services/explore_listings_repository.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/explore_curriculum_skills_multiselect.dart';

class JobCreateScreen extends StatefulWidget {
  const JobCreateScreen({super.key});

  @override
  State<JobCreateScreen> createState() => _JobCreateScreenState();
}

class _JobCreateScreenState extends State<JobCreateScreen> {
  final _title = TextEditingController();
  final _company = TextEditingController();
  final _location = TextEditingController();
  final _description = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final _repo = ExploreListingsRepository();
  final _users = UserProfileRepository();
  bool _busy = false;
  bool _inPerson = false;
  String? _industry;
  final Set<String> _skillsSeeking = {};
  String? _expandedSeekingCategory;

  @override
  void dispose() {
    _title.dispose();
    _company.dispose();
    _location.dispose();
    _description.dispose();
    super.dispose();
  }

  void _toggleSeekingCategory(String title) {
    setState(() {
      _expandedSeekingCategory = _expandedSeekingCategory == title ? null : title;
    });
  }

  void _toggleSeekingSkill(String skill) {
    if (_skillsSeeking.contains(skill)) {
      setState(() => _skillsSeeking.remove(skill));
      return;
    }
    if (_skillsSeeking.length >= ExploreListingsRepository.maxSkillsPerListing) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('At most ${ExploreListingsRepository.maxSkillsPerListing} skills per job.'),
        ),
      );
      return;
    }
    setState(() => _skillsSeeking.add(skill));
  }

  Future<void> _onLocationModeChanged(Set<bool> selected) async {
    final inPerson = selected.contains(true);
    setState(() => _inPerson = inPerson);
    if (inPerson) {
      final uid = FirebaseAuth.instance.currentUser?.uid;
      if (uid != null && _location.text.trim().isEmpty) {
        final line = await _users.getCityStateLineForUser(uid);
        if (mounted && line != null) {
          setState(() => _location.text = line);
        }
      }
    } else {
      setState(() => _location.clear());
    }
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_industry == null || _industry!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select an industry.')));
      return;
    }
    if (_skillsSeeking.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select at least one skill you are seeking.')),
      );
      return;
    }
    final locMode = _inPerson ? 'in_person' : 'remote';
    final locText = _inPerson ? _location.text.trim() : 'Remote';
    if (_inPerson && locText.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add a location or update your profile city/state.')),
      );
      return;
    }

    setState(() => _busy = true);
    try {
      await _repo.createJob(
        title: _title.text.trim(),
        skillsSeeking: _skillsSeeking.toList(),
        company: _company.text.trim().isEmpty ? null : _company.text.trim(),
        location: locText,
        locationMode: locMode,
        industry: _industry!,
        description: _description.text.trim().isEmpty ? null : _description.text.trim(),
      );
      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Job posted.')));
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
                      'Post a job',
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
                    decoration: const InputDecoration(labelText: 'Title'),
                    validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 20),
                  ExploreCurriculumSkillsMultiselect(
                    sectionTitle: 'Skills seeking',
                    sectionHint:
                        'Expand a category and check every skill this role needs — same curriculum list as onboarding. You can pick more than one.',
                    selectedSkills: _skillsSeeking,
                    expandedCategoryTitle: _expandedSeekingCategory,
                    onCategoryHeaderTap: _toggleSeekingCategory,
                    onSkillToggle: _toggleSeekingSkill,
                    maxSkills: ExploreListingsRepository.maxSkillsPerListing,
                  ),
                  const SizedBox(height: 20),
                  TextFormField(controller: _company, decoration: const InputDecoration(labelText: 'Company (optional)')),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    key: ValueKey(_industry ?? ''),
                    initialValue: _industry,
                    decoration: const InputDecoration(labelText: 'Industry'),
                    items: [
                      for (final i in kExplorePostingIndustries)
                        DropdownMenuItem(value: i, child: Text(i, overflow: TextOverflow.ellipsis)),
                    ],
                    onChanged: (v) => setState(() => _industry = v),
                    validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  const Text('Location', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  SegmentedButton<bool>(
                    segments: const [
                      ButtonSegment<bool>(value: false, label: Text('Remote'), icon: Icon(Icons.wifi_tethering, size: 18)),
                      ButtonSegment<bool>(value: true, label: Text('In person'), icon: Icon(Icons.place_outlined, size: 18)),
                    ],
                    selected: {_inPerson},
                    onSelectionChanged: _onLocationModeChanged,
                  ),
                  const SizedBox(height: 12),
                  if (_inPerson)
                    TextFormField(
                      controller: _location,
                      decoration: const InputDecoration(
                        labelText: 'Location',
                        hintText: 'Prefilled from your city & state — edit if needed',
                      ),
                      validator: (v) => (_inPerson && (v == null || v.trim().isEmpty)) ? 'Required for in person' : null,
                    )
                  else
                    const Text(
                      'This job will show as Remote.',
                      style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                    ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _description,
                    decoration: const InputDecoration(labelText: 'Description (optional)'),
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
