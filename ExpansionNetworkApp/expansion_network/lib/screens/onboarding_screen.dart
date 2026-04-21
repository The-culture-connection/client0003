import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../analytics/expansion_analytics.dart';
import '../auth/auth_controller.dart';
import '../data/curriculum_onboarding_data.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/curriculum_skill_category_card.dart';

/// Digital curriculum–aligned flow: identity → goals → skills ×2 → tribe → work structure → profile links.
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
  final _graduatedCityProgram = TextEditingController();

  bool _notInCohort = false;

  final Set<String> _selectedGoals = {};
  final Set<String> _confidentSkills = {};
  final Set<String> _desiredSkills = {};

  String? _expandedOfferedCategoryTitle;
  String? _expandedSeekingCategoryTitle;

  String? _selectedTribe;

  int _flexibility = 5;
  int _weeklyHours = 40;
  int _ownership = 5;

  bool _saving = false;
  String? _error;
  bool _onboardingCompletionEventSent = false;
  bool _profileSaveSucceeded = false;

  final _imagePicker = ImagePicker();
  XFile? _pickedProfilePhoto;
  XFile? _pickedBusinessLogo;
  static const int _maxImageBytes = 10 * 1024 * 1024;

  static const _minSkills = 3;
  static const _pageCount = 7;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(
        ExpansionAnalytics.log('onboarding_screen_started', sourceScreen: 'onboarding'),
      );
    });
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
    if (!_profileSaveSucceeded) {
      unawaited(
        ExpansionAnalytics.log(
          'onboarding_abandoned',
          sourceScreen: 'onboarding',
          extra: <String, Object?>{'step_index': _stepIndex},
        ),
      );
    }
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
    _graduatedCityProgram.dispose();
    super.dispose();
  }

  bool _needsAlumniCityProgram(BuildContext context) {
    final roles = context.read<AuthController>().expansionOnboardingRoles;
    return roles.any((r) => r == 'Alumni' || r == 'Digital Curriculum Alumni');
  }

  bool _cohortIdIsBlank() => _cohortId.text.trim().isEmpty;

  bool _validateStep1(BuildContext context) {
    if (_firstName.text.trim().isEmpty ||
        _lastName.text.trim().isEmpty ||
        _bio.text.trim().isEmpty ||
        _profession.text.trim().isEmpty ||
        _city.text.trim().isEmpty ||
        _state.text.trim().isEmpty) {
      _error = 'Please fill in all fields on this step.';
      return false;
    }
    if (!_notInCohort && _cohortIdIsBlank()) {
      _error = 'Enter your cohort ID or choose “Not in a cohort”.';
      return false;
    }
    if (_needsAlumniCityProgram(context) && _graduatedCityProgram.text.trim().isEmpty) {
      _error = 'Enter the city program you graduated from.';
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

  bool _validateTribe() {
    if (_selectedTribe == null || _selectedTribe!.isEmpty) {
      _error = 'Select your tribe.';
      return false;
    }
    _error = null;
    return true;
  }

  void _nextStep() {
    if (_stepIndex == 0) {
      if (!_validateStep1(context)) {
        unawaited(
          ExpansionAnalytics.log(
            'onboarding_step_validation_failed',
            sourceScreen: 'onboarding',
            extra: const <String, Object?>{'step_key': 'identity'},
          ),
        );
        setState(() {});
        return;
      }
    } else if (_stepIndex == 1) {
      if (!_validateGoals()) {
        unawaited(
          ExpansionAnalytics.log(
            'onboarding_step_validation_failed',
            sourceScreen: 'onboarding',
            extra: const <String, Object?>{'step_key': 'goals'},
          ),
        );
        setState(() {});
        return;
      }
    } else if (_stepIndex == 2) {
      if (!_validateConfident()) {
        unawaited(
          ExpansionAnalytics.log(
            'onboarding_step_validation_failed',
            sourceScreen: 'onboarding',
            extra: const <String, Object?>{'step_key': 'confident_skills'},
          ),
        );
        setState(() {});
        return;
      }
    } else if (_stepIndex == 3) {
      if (!_validateDesired()) {
        unawaited(
          ExpansionAnalytics.log(
            'onboarding_step_validation_failed',
            sourceScreen: 'onboarding',
            extra: const <String, Object?>{'step_key': 'desired_skills'},
          ),
        );
        setState(() {});
        return;
      }
    } else if (_stepIndex == 4) {
      if (!_validateTribe()) {
        unawaited(
          ExpansionAnalytics.log(
            'onboarding_step_validation_failed',
            sourceScreen: 'onboarding',
            extra: const <String, Object?>{'step_key': 'tribe'},
          ),
        );
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
    if (!_validateStep1(context) ||
        !_validateGoals() ||
        !_validateConfident() ||
        !_validateDesired() ||
        !_validateTribe()) {
      setState(() {});
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    unawaited(ExpansionAnalytics.log('onboarding_save_submitted', sourceScreen: 'onboarding'));
    try {
      final roles = context.read<AuthController>().expansionOnboardingRoles;
      if (roles.isEmpty) {
        setState(() => _error =
            'Your alumni roles could not be loaded. Sign out and sign in again, or contact support.');
        return;
      }
      final includeGraduatedCityProgram = _needsAlumniCityProgram(context);
      final uid = FirebaseAuth.instance.currentUser?.uid;
      if (uid == null) throw StateError('Not signed in');
      String? photoUrl;
      String? logoUrl;
      if (_pickedProfilePhoto != null) {
        photoUrl = await _uploadProfileImage(uid, _pickedProfilePhoto!);
      }
      if (_pickedBusinessLogo != null) {
        logoUrl = await _uploadProfileImage(uid, _pickedBusinessLogo!, subfolder: 'logo');
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
        tribe: _selectedTribe!,
        workFlexibility: _flexibility,
        weeklyHours: _weeklyHours,
        workOwnership: _ownership,
        linkedin: _linkedin.text,
        portfolio: _portfolio.text,
        instagram: _instagram.text,
        facebook: _facebook.text,
        tiktok: _tiktok.text,
        photoUrl: photoUrl,
        businessLogoUrl: logoUrl,
        graduatedCityProgram:
            includeGraduatedCityProgram ? _graduatedCityProgram.text.trim() : null,
      );
      if (photoUrl != null && photoUrl.isNotEmpty) {
        await FirebaseAuth.instance.currentUser?.updatePhotoURL(photoUrl);
      }
      if (!mounted) return;
      if (!_onboardingCompletionEventSent) {
        _onboardingCompletionEventSent = true;
        await ExpansionAnalytics.log(
          'onboarding_completed',
          entityId: uid,
          sourceScreen: 'onboarding',
        );
      }
      if (!mounted) return;
      context.read<AuthController>().markExpansionOnboardingComplete();
      _profileSaveSucceeded = true;
      context.go('/welcome-intro');
    } catch (e) {
      unawaited(
        ExpansionAnalytics.log(
          'onboarding_save_failed',
          sourceScreen: 'onboarding',
          extra: ExpansionAnalytics.errorExtras(e, code: 'save_expansion_profile'),
        ),
      );
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
      'Tribe',
      'Ideal work structure',
      'Profile links',
    ];
    return 'Step ${_stepIndex + 1} of $_pageCount — ${titles[_stepIndex]}';
  }

  Future<String> _uploadProfileImage(String uid, XFile x, {String subfolder = 'avatar'}) async {
    final safeName = x.name.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    final objectName = '${subfolder}_${DateTime.now().millisecondsSinceEpoch}_$safeName';
    final ref = FirebaseStorage.instance.ref().child('users/$uid/profile/$objectName');
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

  Future<void> _pickProfilePhoto() async {
    try {
      final x = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        imageQuality: 88,
      );
      if (x == null) return;
      if (await x.length() > _maxImageBytes) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Image must be 10MB or smaller.')),
          );
        }
        return;
      }
      setState(() => _pickedProfilePhoto = x);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _pickBusinessLogo() async {
    try {
      final x = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        imageQuality: 88,
      );
      if (x == null) return;
      if (await x.length() > _maxImageBytes) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Image must be 10MB or smaller.')),
          );
        }
        return;
      }
      setState(() => _pickedBusinessLogo = x);
      unawaited(
        ExpansionAnalytics.log(
          'onboarding_business_logo_picked',
          sourceScreen: 'onboarding',
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
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
    final wasSelected = _confidentSkills.contains(skill);
    setState(() {
      if (wasSelected) {
        _confidentSkills.remove(skill);
      } else {
        _confidentSkills.add(skill);
      }
    });
    unawaited(
      ExpansionAnalytics.log(
        'onboarding_confident_skill_toggled',
        sourceScreen: 'onboarding',
        extra: <String, Object?>{'selected': !wasSelected},
      ),
    );
  }

  void _toggleDesiredSkill(String skill) {
    final wasSelected = _desiredSkills.contains(skill);
    setState(() {
      if (wasSelected) {
        _desiredSkills.remove(skill);
      } else {
        _desiredSkills.add(skill);
      }
    });
    unawaited(
      ExpansionAnalytics.log(
        'onboarding_desired_skill_toggled',
        sourceScreen: 'onboarding',
        extra: <String, Object?>{'selected': !wasSelected},
      ),
    );
  }

  void _toggleGoal(String goal) {
    final wasSelected = _selectedGoals.contains(goal);
    setState(() {
      if (wasSelected) {
        _selectedGoals.remove(goal);
      } else {
        _selectedGoals.add(goal);
      }
    });
    unawaited(
      ExpansionAnalytics.log(
        'onboarding_goal_toggled',
        sourceScreen: 'onboarding',
        extra: <String, Object?>{'selected': !wasSelected},
      ),
    );
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
                _buildStepTribe(context),
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
            onChanged: (v) => setState(() {
              _notInCohort = true;
            }),
            contentPadding: EdgeInsets.zero,
          ),
          if (!_notInCohort) ...[
            const SizedBox(height: 4),
            if (!_cohortIdIsBlank())
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  'Cohort ID: ${_cohortId.text.trim()}',
                  style: const TextStyle(fontSize: 14, color: AppColors.mutedForeground),
                ),
              )
            else ...[
              _labeledField('Cohort ID', _cohortId),
            ],
          ],
          if (_needsAlumniCityProgram(context)) ...[
            const SizedBox(height: 8),
            _labeledField('What city program did you graduate from?', _graduatedCityProgram),
          ],
          const SizedBox(height: 8),
          Text('Profile photo', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.person_outline, size: 40, color: AppColors.mutedForeground),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: _saving ? null : _pickProfilePhoto,
                  child: Text(
                    _pickedProfilePhoto == null
                        ? 'Add profile photo (optional)'
                        : _pickedProfilePhoto!.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              if (_pickedProfilePhoto != null)
                IconButton(
                  onPressed: _saving ? null : () => setState(() => _pickedProfilePhoto = null),
                  icon: const Icon(Icons.clear),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text('Business logo', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.add_photo_alternate_outlined, size: 40, color: AppColors.mutedForeground),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: _saving ? null : _pickBusinessLogo,
                  child: Text(
                    _pickedBusinessLogo == null
                        ? 'Add business logo (optional)'
                        : _pickedBusinessLogo!.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              if (_pickedBusinessLogo != null)
                IconButton(
                  onPressed: _saving ? null : () => setState(() => _pickedBusinessLogo = null),
                  icon: const Icon(Icons.clear),
                ),
            ],
          ),
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

  Widget _buildStepTribe(BuildContext context) {
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
                  'What tribe are you in?',
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
                        groupValue: _selectedTribe,
                        onChanged: (v) => setState(() => _selectedTribe = v),
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
                          onChangeEnd: (v) {
                            unawaited(
                              ExpansionAnalytics.log(
                                'onboarding_work_structure_changed',
                                sourceScreen: 'onboarding',
                                extra: <String, Object?>{'axis': 'flexibility', 'value': v.round()},
                              ),
                            );
                          },
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
                          onChangeEnd: (v) {
                            unawaited(
                              ExpansionAnalytics.log(
                                'onboarding_work_structure_changed',
                                sourceScreen: 'onboarding',
                                extra: <String, Object?>{'axis': 'weekly_hours', 'value': (v / 5).round() * 5},
                              ),
                            );
                          },
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
                          onChangeEnd: (v) {
                            unawaited(
                              ExpansionAnalytics.log(
                                'onboarding_work_structure_changed',
                                sourceScreen: 'onboarding',
                                extra: <String, Object?>{'axis': 'ownership', 'value': v.round()},
                              ),
                            );
                          },
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
