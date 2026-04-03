import 'package:cached_network_image/cached_network_image.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/curriculum_onboarding_data.dart';
import '../profile/profile_edit_sections.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/curriculum_skill_category_card.dart';

/// Edit all curriculum profile fields; loads/saves `users/{uid}`.
class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  final _repo = UserProfileRepository();
  final _scrollController = ScrollController();

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

  bool _loading = true;
  bool _saving = false;
  String? _error;
  String? _photoUrl;

  final _keyIdentity = GlobalKey();
  final _keyGoals = GlobalKey();
  final _keyConfident = GlobalKey();
  final _keyDesired = GlobalKey();
  final _keyIndustry = GlobalKey();
  final _keyWork = GlobalKey();
  final _keyLinks = GlobalKey();

  static const _minSkills = 3;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final data = await _repo.getUserDoc(uid);
      if (!mounted) return;
      if (data == null) {
        setState(() {
          _loading = false;
          _error = 'No profile found.';
        });
        return;
      }
      _applyData(data);
      setState(() => _loading = false);
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToQuerySection());
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = e.toString();
        });
      }
    }
  }

  void _applyData(Map<String, dynamic> d) {
    _firstName.text = _s(d['first_name']) ?? _s(d['firstName']) ?? '';
    _lastName.text = _s(d['last_name']) ?? _s(d['lastName']) ?? '';
    _city.text = _s(d['city']) ?? '';
    _state.text = _s(d['state']) ?? '';
    _bio.text = _s(d['bio']) ?? '';
    _profession.text = _s(d['profession']) ?? '';
    _notInCohort = d['not_in_cohort'] == true;
    _cohortId.text = _s(d['cohort_id']) ?? '';

    _selectedGoals
      ..clear()
      ..addAll(_stringList(d['business_goals']));
    _confidentSkills
      ..clear()
      ..addAll(_stringList(d['confident_skills']));
    _desiredSkills
      ..clear()
      ..addAll(_stringList(d['desired_skills']));

    _selectedIndustry = _s(d['industry']);

    final ws = d['work_structure'];
    if (ws is Map) {
      _flexibility = _intFrom(ws['flexibility'], 5).clamp(1, 10);
      _weeklyHours = _intFrom(ws['weekly_hours'], 40).clamp(20, 80);
      _ownership = _intFrom(ws['ownership'], 5).clamp(1, 10);
    }

    final pl = d['profile_links'];
    if (pl is Map) {
      _linkedin.text = _s(pl['linkedin']) ?? '';
      _portfolio.text = _s(pl['portfolio']) ?? '';
      _instagram.text = _s(pl['instagram']) ?? '';
      _facebook.text = _s(pl['facebook']) ?? '';
      _tiktok.text = _s(pl['tiktok']) ?? '';
    }

    _photoUrl = _s(d['photo_url']);
  }

  int _intFrom(dynamic v, int fallback) {
    if (v is int) return v;
    if (v is num) return v.round();
    return fallback;
  }

  @override
  void dispose() {
    _scrollController.dispose();
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

  bool _validateIdentity() {
    if (_firstName.text.trim().isEmpty ||
        _lastName.text.trim().isEmpty ||
        _bio.text.trim().isEmpty ||
        _profession.text.trim().isEmpty ||
        _city.text.trim().isEmpty ||
        _state.text.trim().isEmpty) {
      _error = 'Fill in identity, location, bio, and profession.';
      return false;
    }
    if (!_notInCohort && _cohortId.text.trim().isEmpty) {
      _error = 'Enter cohort ID or choose “Not in a cohort”.';
      return false;
    }
    _error = null;
    return true;
  }

  bool _validateFull() {
    if (!_validateIdentity()) return false;
    if (_selectedGoals.isEmpty) {
      _error = 'Select at least one business goal.';
      return false;
    }
    if (_confidentSkills.length < _minSkills) {
      _error = 'Select at least $_minSkills skills you are confident in.';
      return false;
    }
    if (_desiredSkills.length < _minSkills) {
      _error = 'Select at least $_minSkills skills you want to acquire.';
      return false;
    }
    if (_selectedIndustry == null || _selectedIndustry!.isEmpty) {
      _error = 'Select your industry.';
      return false;
    }
    _error = null;
    return true;
  }

  bool _validateForSection(BuildContext context) {
    final n = normalizeProfileEditSection(GoRouterState.of(context).uri.queryParameters['section']);
    if (isFullProfileEdit(n)) return _validateFull();
    switch (n) {
      case ProfileEditSections.identity:
        return _validateIdentity();
      case ProfileEditSections.goals:
        if (_selectedGoals.isEmpty) {
          _error = 'Select at least one business goal.';
          return false;
        }
        _error = null;
        return true;
      case ProfileEditSections.skillsConfident:
        if (_confidentSkills.length < _minSkills) {
          _error = 'Select at least $_minSkills skills you are confident in.';
          return false;
        }
        _error = null;
        return true;
      case ProfileEditSections.skillsDesired:
        if (_desiredSkills.length < _minSkills) {
          _error = 'Select at least $_minSkills skills you want to acquire.';
          return false;
        }
        _error = null;
        return true;
      case ProfileEditSections.industry:
        if (_selectedIndustry == null || _selectedIndustry!.isEmpty) {
          _error = 'Select your industry.';
          return false;
        }
        _error = null;
        return true;
      case ProfileEditSections.work:
      case ProfileEditSections.links:
        _error = null;
        return true;
      default:
        return _validateFull();
    }
  }

  Future<void> _save() async {
    if (!_validateForSection(context)) {
      setState(() {});
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await _repo.updateProfile(
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile saved')),
      );
      context.pop();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _scrollToQuerySection() {
    if (!mounted) return;
    final n = normalizeProfileEditSection(GoRouterState.of(context).uri.queryParameters['section']);
    if (isFullProfileEdit(n)) return;
    late final GlobalKey target;
    switch (n) {
      case ProfileEditSections.identity:
        target = _keyIdentity;
        break;
      case ProfileEditSections.goals:
        target = _keyGoals;
        break;
      case ProfileEditSections.skillsConfident:
        target = _keyConfident;
        break;
      case ProfileEditSections.skillsDesired:
        target = _keyDesired;
        break;
      case ProfileEditSections.industry:
        target = _keyIndustry;
        break;
      case ProfileEditSections.work:
        target = _keyWork;
        break;
      case ProfileEditSections.links:
        target = _keyLinks;
        break;
      default:
        return;
    }
    final ctx = target.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeOutCubic,
        alignment: 0.05,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }
    if (_error != null && _firstName.text.isEmpty && _lastName.text.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Edit Profile')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(_error!, textAlign: TextAlign.center),
          ),
        ),
      );
    }

    final email = FirebaseAuth.instance.currentUser?.email ?? '';
    final normalized = normalizeProfileEditSection(GoRouterState.of(context).uri.queryParameters['section']);
    final showAll = isFullProfileEdit(normalized);
    bool show(String id) => showAll || normalized == id;

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
                        profileEditAppBarTitle(normalized),
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w500),
                      ),
                    ),
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
              ),
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          if (_error != null)
            Material(
              color: Colors.red.withValues(alpha: 0.12),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
              ),
            ),
          Expanded(
            child: ListView(
              controller: _scrollController,
              padding: const EdgeInsets.all(24),
              children: [
                if (show(ProfileEditSections.identity)) ...[
                  Center(
                    child: Stack(
                      children: [
                        ClipOval(
                          child: _photoUrl != null
                              ? CachedNetworkImage(
                                  imageUrl: _photoUrl!,
                                  width: 96,
                                  height: 96,
                                  fit: BoxFit.cover,
                                  errorWidget: (_, __, ___) => _avatarPlaceholder(),
                                )
                              : _avatarPlaceholder(),
                        ),
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: CircleAvatar(
                            radius: 16,
                            backgroundColor: AppColors.primary,
                            child: const Icon(Icons.camera_alt, size: 16, color: AppColors.onPrimary),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: Text(
                      'Photo updates coming soon',
                      style: TextStyle(fontSize: 12, color: AppColors.mutedForeground.withValues(alpha: 0.8)),
                    ),
                  ),
                  const SizedBox(height: 24),
                  _blockTitle(context, 'Identity & location', _keyIdentity),
                  Row(
                    children: [
                      Expanded(child: _field('First name', _firstName)),
                      const SizedBox(width: 12),
                      Expanded(child: _field('Last name', _lastName)),
                    ],
                  ),
                  Row(
                    children: [
                      Expanded(child: _field('City', _city)),
                      const SizedBox(width: 12),
                      Expanded(child: _field('State (or metro)', _state)),
                    ],
                  ),
                  Text('Cohort', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                  RadioListTile<bool>(
                    title: const Text('I am in a cohort'),
                    value: false,
                    groupValue: _notInCohort,
                    onChanged: _saving ? null : (v) => setState(() => _notInCohort = false),
                    contentPadding: EdgeInsets.zero,
                  ),
                  RadioListTile<bool>(
                    title: const Text('Not in a cohort'),
                    value: true,
                    groupValue: _notInCohort,
                    onChanged: _saving ? null : (v) => setState(() => _notInCohort = true),
                    contentPadding: EdgeInsets.zero,
                  ),
                  if (!_notInCohort) _field('Cohort ID', _cohortId),
                  _field('Bio', _bio, maxLines: 4),
                  _field('Profession', _profession),
                  InputDecorator(
                    decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                    child: Text(email.isEmpty ? '—' : email, style: const TextStyle(color: AppColors.mutedForeground)),
                  ),
                  const SizedBox(height: 24),
                ],
                if (show(ProfileEditSections.goals)) ...[
                  _blockTitle(context, 'Business goals', _keyGoals),
                  Card(
                    color: AppColors.secondary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: AppColors.border),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        children: kBusinessGoals.map((g) {
                          return CheckboxListTile(
                            value: _selectedGoals.contains(g),
                            onChanged: _saving
                                ? null
                                : (_) => setState(() {
                                      if (_selectedGoals.contains(g)) {
                                        _selectedGoals.remove(g);
                                      } else {
                                        _selectedGoals.add(g);
                                      }
                                    }),
                            title: Text(g, style: const TextStyle(height: 1.35)),
                            controlAffinity: ListTileControlAffinity.leading,
                            contentPadding: EdgeInsets.zero,
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
                if (show(ProfileEditSections.skillsConfident)) ...[
                  _blockTitle(context, 'Skills you’re confident in', _keyConfident),
                  Text(
                    'Minimum $_minSkills skills. Expand a category to select.',
                    style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                  ),
                  const SizedBox(height: 8),
                  for (final cat in kCurriculumSkillCategories)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: CurriculumSkillCategoryCard(
                        category: cat,
                        expanded: _expandedOfferedCategoryTitle == cat.title,
                        selectedSkills: _confidentSkills,
                        onHeaderTap: () => setState(() {
                          _expandedOfferedCategoryTitle =
                              _expandedOfferedCategoryTitle == cat.title ? null : cat.title;
                        }),
                        onSkillToggle: (skill) => setState(() {
                          if (_confidentSkills.contains(skill)) {
                            _confidentSkills.remove(skill);
                          } else {
                            _confidentSkills.add(skill);
                          }
                        }),
                      ),
                    ),
                  const SizedBox(height: 8),
                ],
                if (show(ProfileEditSections.skillsDesired)) ...[
                  _blockTitle(context, 'Skills you want to acquire', _keyDesired),
                  Text(
                    'Minimum $_minSkills skills.',
                    style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                  ),
                  const SizedBox(height: 8),
                  for (final cat in kCurriculumSkillCategories)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: CurriculumSkillCategoryCard(
                        category: cat,
                        expanded: _expandedSeekingCategoryTitle == cat.title,
                        selectedSkills: _desiredSkills,
                        onHeaderTap: () => setState(() {
                          _expandedSeekingCategoryTitle =
                              _expandedSeekingCategoryTitle == cat.title ? null : cat.title;
                        }),
                        onSkillToggle: (skill) => setState(() {
                          if (_desiredSkills.contains(skill)) {
                            _desiredSkills.remove(skill);
                          } else {
                            _desiredSkills.add(skill);
                          }
                        }),
                      ),
                    ),
                  const SizedBox(height: 8),
                ],
                if (show(ProfileEditSections.industry)) ...[
                  _blockTitle(context, 'Industry', _keyIndustry),
                  Card(
                    color: AppColors.secondary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: AppColors.border),
                    ),
                    child: Column(
                      children: kIndustries.map((ind) {
                        return RadioListTile<String>(
                          title: Text(ind, style: const TextStyle(height: 1.2)),
                          value: ind,
                          groupValue: _selectedIndustry,
                          onChanged: _saving ? null : (v) => setState(() => _selectedIndustry = v),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
                if (show(ProfileEditSections.work)) ...[
                  _blockTitle(context, 'Ideal work structure', _keyWork),
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
                              const Text('Flexibility', style: TextStyle(fontWeight: FontWeight.w600)),
                              Text(flexibilityLabel(_flexibility), style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
                            ],
                          ),
                          Slider(
                            value: _flexibility.toDouble(),
                            min: 1,
                            max: 10,
                            divisions: 9,
                            onChanged: _saving ? null : (v) => setState(() => _flexibility = v.round()),
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Weekly hours', style: TextStyle(fontWeight: FontWeight.w600)),
                              Text('$_weeklyHours h/wk', style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
                            ],
                          ),
                          Slider(
                            value: _weeklyHours.toDouble(),
                            min: 20,
                            max: 80,
                            divisions: 12,
                            onChanged: _saving
                                ? null
                                : (v) => setState(() => _weeklyHours = (v / 5).round() * 5),
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Ownership', style: TextStyle(fontWeight: FontWeight.w600)),
                              Text(ownershipLabel(_ownership), style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
                            ],
                          ),
                          Slider(
                            value: _ownership.toDouble(),
                            min: 1,
                            max: 10,
                            divisions: 9,
                            onChanged: _saving ? null : (v) => setState(() => _ownership = v.round()),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
                if (show(ProfileEditSections.links)) ...[
                  _blockTitle(context, 'Profile links', _keyLinks),
                  _field('LinkedIn URL', _linkedin),
                  _field('Portfolio URL', _portfolio),
                  _field('Instagram', _instagram),
                  _field('Facebook', _facebook),
                  _field('TikTok', _tiktok),
                ],
                const SizedBox(height: 32),
              ],
            ),
          ),
          Material(
            color: AppColors.background,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.all(16),
                    ),
                    onPressed: _saving ? null : _save,
                    child: _saving
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                          )
                        : Text(showAll ? 'Save changes' : 'Save'),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _avatarPlaceholder() {
    return Container(
      width: 96,
      height: 96,
      color: AppColors.secondary,
      alignment: Alignment.center,
      child: const Icon(Icons.person, size: 48, color: AppColors.mutedForeground),
    );
  }

  Widget _blockTitle(BuildContext context, String title, GlobalKey key) {
    return Padding(
      key: key,
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
      ),
    );
  }

  Widget _field(String label, TextEditingController c, {int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: c,
        maxLines: maxLines,
        enabled: !_saving,
        keyboardType: maxLines > 1 ? TextInputType.multiline : TextInputType.text,
        decoration: InputDecoration(labelText: label, alignLabelWithHint: maxLines > 1),
      ),
    );
  }

}

String? _s(dynamic v) {
  if (v is String && v.trim().isNotEmpty) return v.trim();
  return null;
}

List<String> _stringList(dynamic v) {
  if (v is! List) return [];
  return v.whereType<String>().where((s) => s.trim().isNotEmpty).toList();
}
