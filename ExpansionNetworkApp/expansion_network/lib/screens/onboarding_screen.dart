import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../auth/auth_controller.dart';
import '../data/curriculum_onboarding_data.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/curriculum_skill_category_card.dart';

/// Digital curriculum–aligned flow: identity → goals → skills ×2 → industry → work structure → profile links.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _stepIndex = 0;

  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _cohortId = TextEditingController();
  final _bio = TextEditingController();
  final _profession = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();

  final _linkedin = TextEditingController();
  final _portfolio = TextEditingController();
  final _instagram = TextEditingController();
  final _facebook = TextEditingController();
  final _tiktok = TextEditingController();

  bool _notInCohort = false;

  final Set<String> _selectedGoals = {};
  final Set<String> _confidentSkills = {};
  final Set<String> _desiredSkills = {};

  String? _expandedOfferedCategoryTitle;
  String? _expandedSeekingCategoryTitle;

  String? _selectedIndustry;

  int _flexibility = 5;
  int _weeklyHours = 40;
  int _ownership = 5;

  bool _saving = false;
  String? _error;

  static const _minSkills = 3;
  static const _pageCount = 7;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final auth = context.read<AuthController>();
      final cid = auth.provisionedCohortId;
      if (cid != null && cid.isNotEmpty) {
        setState(() {
          _cohortId.text = cid;
          _notInCohort = false;
        });
      }
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _firstName.dispose();
    _lastName.dispose();
    _cohortId.dispose();
    _bio.dispose();
    _profession.dispose();
    _city.dispose();
    _state.dispose();
    _linkedin.dispose();
    _portfolio.dispose();
    _instagram.dispose();
    _facebook.dispose();
    _tiktok.dispose();
    super.dispose();
  }

  bool _validateStep1() {
    if (_firstName.text.trim().isEmpty ||
        _lastName.text.trim().isEmpty ||
        _bio.text.trim().isEmpty ||
        _profession.text.trim().isEmpty ||
        _city.text.trim().isEmpty ||
        _state.text.trim().isEmpty) {
      _error = 'Please fill in all fields on this step.';
      return false;
    }
    if (!_notInCohort && _cohortId.text.trim().isEmpty) {
      _error = 'Enter your cohort ID or choose “Not in a cohort”.';
      return false;
    }
    _error = null;
    return true;
  }

  bool _validateGoals() {
    if (_selectedGoals.isEmpty) {
      _error = 'Select at least one goal (required).';
      return false;
    }
    _error = null;
    return true;
  }

  bool _validateConfident() {
    if (_confidentSkills.length < _minSkills) {
      _error = 'Select a minimum of $_minSkills skills you are confident in.';
      return false;
    }
    _error = null;
    return true;
  }

  bool _validateDesired() {
    if (_desiredSkills.length < _minSkills) {
      _error = 'Select a minimum of $_minSkills skills you want to acquire.';
      return false;
    }
    _error = null;
    return true;
  }

  bool _validateIndustry() {
    if (_selectedIndustry == null || _selectedIndustry!.isEmpty) {
      _error = 'Select the industry you are in.';
      return false;
    }
    _error = null;
    return true;
  }

  void _nextStep() {
    if (_stepIndex == 0) {
      if (!_validateStep1()) {
        setState(() {});
        return;
      }
    } else if (_stepIndex == 1) {
      if (!_validateGoals()) {
        setState(() {});
        return;
      }
    } else if (_stepIndex == 2) {
      if (!_validateConfident()) {
        setState(() {});
        return;
      }
    } else if (_stepIndex == 3) {
      if (!_validateDesired()) {
        setState(() {});
        return;
      }
    } else if (_stepIndex == 4) {
      if (!_validateIndustry()) {
        setState(() {});
        return;
      }
    } else if (_stepIndex == 5) {
      // Work structure — sliders always valid
      setState(() => _error = null);
    } else {
      return;
    }
    setState(() {
      _error = null;
      _stepIndex = _stepIndex + 1;
    });
    _pageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeOutCubic);
  }

  void _previousStep() {
    if (_stepIndex == 0) return;
    setState(() {
      _error = null;
      _stepIndex = _stepIndex - 1;
    });
    _pageController.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeOutCubic);
  }

  Future<void> _save() async {
    if (!_validateStep1() ||
        !_validateGoals() ||
        !_validateConfident() ||
        !_validateDesired() ||
        !_validateIndustry()) {
      setState(() {});
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final roles = context.read<AuthController>().expansionOnboardingRoles;
      if (roles.isEmpty) {
        setState(() => _error =
            'Your alumni roles could not be loaded. Sign out and sign in again, or contact support.');
        return;
      }
      await UserProfileRepository().saveExpansionProfile(
        roles: roles,
        firstName: _firstName.text.trim(),
        lastName: _lastName.text.trim(),
        notInCohort: _notInCohort,
        cohortId: _notInCohort ? null : _cohortId.text.trim(),
        bio: _bio.text.trim(),
        profession: _profession.text.trim(),
        city: _city.text.trim(),
        state: _state.text.trim(),
        businessGoals: _selectedGoals.toList(),
        confidentSkills: _confidentSkills.toList(),
        desiredSkills: _desiredSkills.toList(),
        industry: _selectedIndustry!,
        workFlexibility: _flexibility,
        weeklyHours: _weeklyHours,
        workOwnership: _ownership,
        linkedin: _linkedin.text,
        portfolio: _portfolio.text,
        instagram: _instagram.text,
        facebook: _facebook.text,
        tiktok: _tiktok.text,
      );
      if (!mounted) return;
      context.read<AuthController>().markExpansionOnboardingComplete();
      context.go('/welcome-intro');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _stepSubtitle() {
    const titles = [
      'About you',
      'How can we help your business grow?',
      'Skills you’re confident in',
      'Skills you want to acquire',
      'Industry',
      'Ideal work structure',
      'Profile links',
    ];
    return 'Step ${_stepIndex + 1} of $_pageCount — ${titles[_stepIndex]}';
  }

  void _toggleOfferedCategory(String title) {
    setState(() {
      _expandedOfferedCategoryTitle =
          _expandedOfferedCategoryTitle == title ? null : title;
    });
  }

  void _toggleSeekingCategory(String title) {
    setState(() {
      _expandedSeekingCategoryTitle =
          _expandedSeekingCategoryTitle == title ? null : title;
    });
  }

  void _toggleConfidentSkill(String skill) {
    setState(() {
      if (_confidentSkills.contains(skill)) {
        _confidentSkills.remove(skill);
      } else {
        _confidentSkills.add(skill);
      }
    });
  }

  void _toggleDesiredSkill(String skill) {
    setState(() {
      if (_desiredSkills.contains(skill)) {
        _desiredSkills.remove(skill);
      } else {
        _desiredSkills.add(skill);
      }
    });
  }

  void _toggleGoal(String goal) {
    setState(() {
      if (_selectedGoals.contains(goal)) {
        _selectedGoals.remove(goal);
      } else {
        _selectedGoals.add(goal);
      }
    });
  }

  static String _flexibilityLabel(int v) {
    if (v <= 2) return 'Strict 9-5';
    if (v <= 4) return 'Mostly structured';
    if (v <= 6) return 'Some flexibility';
    if (v <= 8) return 'Very flexible';
    return 'No set schedule';
  }

  static String _ownershipLabel(int v) {
    if (v <= 2) return 'Employee';
    if (v <= 4) return 'Contractor/Freelancer';
    if (v <= 6) return 'Co-founder/Partner';
    if (v <= 8) return 'Majority owner';
    return 'Full company owner';
  }

  @override
  Widget build(BuildContext context) {
    final email = FirebaseAuth.instance.currentUser?.email ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Get started'),
        actions: [
          TextButton(
            onPressed: _saving
                ? null
                : () async {
                    await FirebaseAuth.instance.signOut();
                    if (context.mounted) context.go('/');
                  },
            child: const Text('Sign out'),
          ),
        ],
      ),
      body: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: Row(
              children: [
                for (var i = 0; i < _pageCount; i++) ...[
                  if (i > 0) const SizedBox(width: 4),
                  _StepDot(active: _stepIndex == i, label: '${i + 1}'),
                ],
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                _stepSubtitle(),
                style: Theme.of(context).textTheme.labelLarge?.copyWith(color: AppColors.mutedForeground),
              ),
            ),
          ),
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              onPageChanged: (i) => setState(() => _stepIndex = i),
              children: [
                _buildStepAbout(context, email),
                _buildStepGoals(context),
                _buildStepConfidentSkills(context),
                _buildStepDesiredSkills(context),
                _buildStepIndustry(context),
                _buildStepWorkStructure(context),
                _buildStepProfileLinks(context),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepAbout(BuildContext context, String email) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Step 1: Identity + location',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            'Please provide your basic information (required).',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(child: _labeledField('First name', _firstName)),
              const SizedBox(width: 12),
              Expanded(child: _labeledField('Last name', _lastName)),
            ],
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: _labeledField('City', _city)),
              const SizedBox(width: 12),
              Expanded(child: _labeledField('State (or metro)', _state)),
            ],
          ),
          Text('Cohort', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          RadioListTile<bool>(
            title: const Text('I am in a cohort'),
            value: false,
            groupValue: _notInCohort,
            onChanged: (v) => setState(() => _notInCohort = false),
            contentPadding: EdgeInsets.zero,
          ),
          RadioListTile<bool>(
            title: const Text('Not in a cohort'),
            value: true,
            groupValue: _notInCohort,
            onChanged: (v) => setState(() => _notInCohort = true),
            contentPadding: EdgeInsets.zero,
          ),
          if (!_notInCohort) ...[
            const SizedBox(height: 4),
            _labeledField('Cohort ID', _cohortId),
          ],
          _labeledField('Bio', _bio, maxLines: 4),
          _labeledField('Profession', _profession),
          const SizedBox(height: 8),
          InputDecorator(
            decoration: const InputDecoration(
              labelText: 'Email',
              border: OutlineInputBorder(),
            ),
            child: Text(email.isEmpty ? '—' : email, style: const TextStyle(color: AppColors.mutedForeground)),
          ),
          if (_error != null && _stepIndex == 0) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.redAccent)),
          ],
          const SizedBox(height: 24),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            onPressed: _nextStep,
            child: const Text('Continue'),
          ),
        ],
      ),
    );
  }

  Widget _buildStepGoals(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'How can we help your business grow?',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Text(
                  'Select all that apply (required)',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground),
                ),
                const SizedBox(height: 20),
                Card(
                  color: AppColors.secondary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: AppColors.border),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: kBusinessGoals.map((goal) {
                        return CheckboxListTile(
                          value: _selectedGoals.contains(goal),
                          onChanged: (_) => _toggleGoal(goal),
                          title: Text(goal, style: const TextStyle(height: 1.35)),
                          controlAffinity: ListTileControlAffinity.leading,
                          contentPadding: EdgeInsets.zero,
                        );
                      }).toList(),
                    ),
                  ),
                ),
                if (_error != null && _stepIndex == 1) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: Colors.redAccent)),
                ],
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              OutlinedButton(
                onPressed: _saving ? null : _previousStep,
                child: const Text('Back'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: _nextStep,
                  child: const Text('Continue'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStepConfidentSkills(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'What skills are you confident in?',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(
                'Select a minimum of $_minSkills skills (required). Expand a category to choose specific skills.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground),
              ),
              const SizedBox(height: 4),
              Text(
                'Selected: ${_confidentSkills.length} ${_confidentSkills.length == 1 ? 'skill' : 'skills'}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            children: [
              for (final cat in kCurriculumSkillCategories)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: CurriculumSkillCategoryCard(
                    category: cat,
                    expanded: _expandedOfferedCategoryTitle == cat.title,
                    selectedSkills: _confidentSkills,
                    onHeaderTap: () => _toggleOfferedCategory(cat.title),
                    onSkillToggle: _toggleConfidentSkill,
                  ),
                ),
            ],
          ),
        ),
        if (_error != null && _stepIndex == 2)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(_error!, style: const TextStyle(color: Colors.redAccent)),
          ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              OutlinedButton(
                onPressed: _saving ? null : _previousStep,
                child: const Text('Back'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: _nextStep,
                  child: const Text('Continue'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStepDesiredSkills(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'What skills do you want to acquire?',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(
                'Select a minimum of $_minSkills skills (required). Expand a category to choose specific skills.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground),
              ),
              const SizedBox(height: 4),
              Text(
                'Selected: ${_desiredSkills.length} ${_desiredSkills.length == 1 ? 'skill' : 'skills'}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            children: [
              for (final cat in kCurriculumSkillCategories)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: CurriculumSkillCategoryCard(
                    category: cat,
                    expanded: _expandedSeekingCategoryTitle == cat.title,
                    selectedSkills: _desiredSkills,
                    onHeaderTap: () => _toggleSeekingCategory(cat.title),
                    onSkillToggle: _toggleDesiredSkill,
                  ),
                ),
            ],
          ),
        ),
        if (_error != null && _stepIndex == 3)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(_error!, style: const TextStyle(color: Colors.redAccent)),
          ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              OutlinedButton(
                onPressed: _saving ? null : _previousStep,
                child: const Text('Back'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: _nextStep,
                  child: const Text('Continue'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStepIndustry(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'What industry are you in?',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Text(
                  'Select one (required)',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground),
                ),
                const SizedBox(height: 16),
                Card(
                  color: AppColors.secondary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: AppColors.border),
                  ),
                  child: Column(
                    children: kIndustries.map((ind) {
                      return RadioListTile<String>(
                        title: Text(ind, style: const TextStyle(height: 1.25)),
                        value: ind,
                        groupValue: _selectedIndustry,
                        onChanged: (v) => setState(() => _selectedIndustry = v),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                      );
                    }).toList(),
                  ),
                ),
                if (_error != null && _stepIndex == 4) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: Colors.redAccent)),
                ],
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              OutlinedButton(
                onPressed: _saving ? null : _previousStep,
                child: const Text('Back'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: _nextStep,
                  child: const Text('Continue'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStepWorkStructure(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'What is your ideal work structure?',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Text(
                  'Adjust the sliders to match your preferences',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground),
                ),
                const SizedBox(height: 20),
                Card(
                  color: AppColors.secondary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: AppColors.border),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Flexibility', style: Theme.of(context).textTheme.titleSmall),
                            Text(
                              _flexibilityLabel(_flexibility),
                              style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13),
                            ),
                          ],
                        ),
                        Slider(
                          value: _flexibility.toDouble(),
                          min: 1,
                          max: 10,
                          divisions: 9,
                          label: '$_flexibility',
                          onChanged: (v) => setState(() => _flexibility = v.round()),
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('1 — Strict 9-5', style: Theme.of(context).textTheme.bodySmall),
                            Text('10 — No set schedule', style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ),
                        const SizedBox(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Weekly hours', style: Theme.of(context).textTheme.titleSmall),
                            Text(
                              '$_weeklyHours hours/week',
                              style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13),
                            ),
                          ],
                        ),
                        Slider(
                          value: _weeklyHours.toDouble(),
                          min: 20,
                          max: 80,
                          divisions: 12,
                          label: '$_weeklyHours',
                          onChanged: (v) => setState(() => _weeklyHours = (v / 5).round() * 5),
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('20 hours', style: Theme.of(context).textTheme.bodySmall),
                            Text('80 hours', style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ),
                        const SizedBox(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Ownership', style: Theme.of(context).textTheme.titleSmall),
                            Text(
                              _ownershipLabel(_ownership),
                              style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13),
                            ),
                          ],
                        ),
                        Slider(
                          value: _ownership.toDouble(),
                          min: 1,
                          max: 10,
                          divisions: 9,
                          label: '$_ownership',
                          onChanged: (v) => setState(() => _ownership = v.round()),
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('1 — Employee', style: Theme.of(context).textTheme.bodySmall),
                            Text('10 — Company owner', style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              OutlinedButton(
                onPressed: _saving ? null : _previousStep,
                child: const Text('Back'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: _nextStep,
                  child: const Text('Continue'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStepProfileLinks(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Profile links & visibility',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Text(
                  'Add your social media and portfolio links (optional)',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground),
                ),
                const SizedBox(height: 20),
                Card(
                  color: AppColors.secondary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: AppColors.border),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        _labeledField('LinkedIn URL', _linkedin),
                        _labeledField('Portfolio URL', _portfolio),
                        _labeledField('Instagram', _instagram),
                        _labeledField('Facebook', _facebook),
                        _labeledField('TikTok', _tiktok),
                      ],
                    ),
                  ),
                ),
                if (_error != null && _stepIndex == 6) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: Colors.redAccent)),
                ],
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              OutlinedButton(
                onPressed: _saving ? null : _previousStep,
                child: const Text('Back'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                        )
                      : const Text('Complete profile'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _labeledField(String label, TextEditingController c, {int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: c,
        maxLines: maxLines,
        keyboardType: maxLines > 1 ? TextInputType.multiline : TextInputType.text,
        decoration: InputDecoration(labelText: label, alignLabelWithHint: maxLines > 1),
      ),
    );
  }
}

class _StepDot extends StatelessWidget {
  const _StepDot({required this.active, required this.label});

  final bool active;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 28,
      height: 28,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: active ? AppColors.primary : AppColors.secondary,
      ),
      child: Text(
        label,
        style: TextStyle(
          color: active ? AppColors.onPrimary : AppColors.mutedForeground,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
