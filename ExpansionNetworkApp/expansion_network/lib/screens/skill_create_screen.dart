import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../analytics/expansion_analytics.dart';
import '../data/explore_posting_industries.dart';
import '../services/explore_listings_repository.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/explore_curriculum_skills_multiselect.dart';

class SkillCreateScreen extends StatefulWidget {
  const SkillCreateScreen({super.key});

  @override
  State<SkillCreateScreen> createState() => _SkillCreateScreenState();
}

class _SkillCreateScreenState extends State<SkillCreateScreen> {
  final _title = TextEditingController();
  final _summary = TextEditingController();
  final _location = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final _repo = ExploreListingsRepository();
  final _users = UserProfileRepository();
  bool _busy = false;
  bool _inPerson = false;
  String? _industry;
  final Set<String> _skillsOffering = {};
  String? _expandedOfferingCategory;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(ExpansionAnalytics.log('skill_listing_create_started', sourceScreen: 'skill_listing_create'));
    });
  }

  @override
  void dispose() {
    _title.dispose();
    _summary.dispose();
    _location.dispose();
    super.dispose();
  }

  void _toggleOfferingCategory(String title) {
    setState(() {
      _expandedOfferingCategory = _expandedOfferingCategory == title ? null : title;
    });
  }

  void _toggleOfferingSkill(String skill) {
    if (_skillsOffering.contains(skill)) {
      setState(() => _skillsOffering.remove(skill));
      unawaited(
        ExpansionAnalytics.log(
          'skill_offering_toggled',
          sourceScreen: 'skill_listing_create',
          extra: <String, Object?>{'skill': skill, 'selected': false},
        ),
      );
      return;
    }
    if (_skillsOffering.length >= ExploreListingsRepository.maxSkillsPerListing) {
      unawaited(
        ExpansionAnalytics.log(
          'job_skills_cap_reached',
          sourceScreen: 'skill_listing_create',
          extra: <String, Object?>{'cap': ExploreListingsRepository.maxSkillsPerListing},
        ),
      );
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('At most ${ExploreListingsRepository.maxSkillsPerListing} skills per listing.'),
        ),
      );
      return;
    }
    setState(() => _skillsOffering.add(skill));
    unawaited(
      ExpansionAnalytics.log(
        'skill_offering_toggled',
        sourceScreen: 'skill_listing_create',
        extra: <String, Object?>{'skill': skill, 'selected': true},
      ),
    );
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
    if (_skillsOffering.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select at least one skill you are offering.')),
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

    unawaited(ExpansionAnalytics.log('skill_listing_create_submitted', sourceScreen: 'skill_listing_create'));
    setState(() => _busy = true);
    try {
      final listingId = await _repo.createSkillListing(
        title: _title.text.trim(),
        skillsOffering: _skillsOffering.toList(),
        summary: _summary.text.trim().isEmpty ? null : _summary.text.trim(),
        location: locText,
        locationMode: locMode,
        industry: _industry!,
      );
      if (mounted) {
        await ExpansionAnalytics.log(
          'skill_listing_create_succeeded',
          entityId: listingId,
          sourceScreen: 'skill_listing_create',
        );
        if (!mounted) return;
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Skill listing posted.')));
      }
    } catch (e) {
      unawaited(
        ExpansionAnalytics.log(
          'skill_listing_create_failed',
          sourceScreen: 'skill_listing_create',
          extra: ExpansionAnalytics.errorExtras(e, code: 'create_skill_listing'),
        ),
      );
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
                  const SizedBox(height: 20),
                  ExploreCurriculumSkillsMultiselect(
                    sectionTitle: 'Skills offering',
                    sectionHint:
                        'Expand a category and check every skill you are offering — same curriculum list as onboarding. You can pick more than one.',
                    selectedSkills: _skillsOffering,
                    expandedCategoryTitle: _expandedOfferingCategory,
                    onCategoryHeaderTap: _toggleOfferingCategory,
                    onSkillToggle: _toggleOfferingSkill,
                    maxSkills: ExploreListingsRepository.maxSkillsPerListing,
                  ),
                  const SizedBox(height: 20),
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
                      'This listing will show as Remote.',
                      style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
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
