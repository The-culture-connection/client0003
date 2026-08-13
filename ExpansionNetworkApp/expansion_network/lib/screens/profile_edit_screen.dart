import 'package:cached_network_image/cached_network_image.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../data/curriculum_onboarding_data.dart';
import '../profile/profile_edit_sections.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/curriculum_skill_category_card.dart';
import '../widgets/mortar_card.dart';
import '../theme/cosmic_content.dart';

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
  final _company = TextEditingController();
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
  bool _uploadingPhoto = false;

  final _picker = ImagePicker();
  static const int _maxImageBytes = 10 * 1024 * 1024;

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
    _company.text = _s(d['company_name']) ?? '';
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

    _selectedIndustry = _s(d['tribe']) ?? _s(d['industry']);

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
    _company.dispose();
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
        _company.text.trim().isEmpty ||
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
      _error = 'Select your tribe.';
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
          _error = 'Select your tribe.';
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

  /// Pick a new avatar, upload it, and save `photo_url` immediately.
  ///
  /// Uses the same Android-Photo-Picker gallery pick and the same
  /// `users/{uid}/profile/` Storage path onboarding uploads to, so the
  /// existing Storage rules cover it.
  Future<void> _changePhoto() async {
    if (_saving || _uploadingPhoto) return;
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    try {
      final x = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 88,
      );
      if (x == null) return;
      setState(() => _uploadingPhoto = true);
      final bytes = await x.readAsBytes();
      if (bytes.length > _maxImageBytes) {
        throw StateError('Image must be 10MB or smaller.');
      }
      final safeName = x.name.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
      final objectName = 'avatar_${DateTime.now().millisecondsSinceEpoch}_$safeName';
      final ref = FirebaseStorage.instance.ref().child('users/$uid/profile/$objectName');
      await ref.putData(bytes, SettableMetadata(contentType: _guessImageContentType(safeName)));
      final url = await ref.getDownloadURL();
      await _repo.updateProfilePhotoUrl(url);
      // Best-effort mirror onto the Auth profile (matches onboarding).
      try {
        await FirebaseAuth.instance.currentUser?.updatePhotoURL(url);
      } catch (_) {}
      if (!mounted) return;
      setState(() => _photoUrl = url);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile photo updated.')),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not update photo: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  static String _guessImageContentType(String name) {
    final lower = name.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
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
        companyName: _company.text.trim(),
        city: _city.text.trim(),
        state: _state.text.trim(),
        businessGoals: _selectedGoals.toList(),
        confidentSkills: _confidentSkills.toList(),
        desiredSkills: _desiredSkills.toList(),
        tribe: _selectedIndustry!,
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
      // Opened via a stack replacement (e.g. an old Mortarverse widget link)
      // there is nothing to pop — popping anyway threw the on-screen
      // "GoError: There is nothing to pop". Fall back to the Mortarverse.
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/mortarverse');
      }
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
            color: Color(0xE6000000),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back),
                      onPressed: () => context.canPop()
                          ? context.pop()
                          : context.go('/mortarverse'),
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
                    child: Semantics(
                      button: true,
                      label: 'Change profile photo',
                      child: GestureDetector(
                        onTap: (_saving || _uploadingPhoto) ? null : _changePhoto,
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
                            if (_uploadingPhoto)
                              Positioned.fill(
                                child: ClipOval(
                                  child: ColoredBox(
                                    color: Colors.black54,
                                    child: Center(
                                      child: SizedBox(
                                        width: 28,
                                        height: 28,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2.5,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
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
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: Text(
                      _uploadingPhoto ? 'Uploading photo…' : 'Tap the photo to change it',
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
                  _field('Business or Company name', _company),
                  InputDecorator(
                    decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                    child: Text(email.isEmpty ? '—' : email, style: const TextStyle(color: AppColors.mutedForeground)),
                  ),
                  const SizedBox(height: 24),
                ],
                if (show(ProfileEditSections.goals)) ...[
                  _blockTitle(context, 'Business goals', _keyGoals),
                  _whyWeAsk(),
                  MortarCard(
                    shape: RoundedRectangleBorder(
                      borderRadius: Cosmic.chipRadius,
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
                  _whyWeAsk(),
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
                  _whyWeAsk(),
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
                  _blockTitle(context, 'Tribe', _keyIndustry),
                  _whyWeAsk(),
                  MortarCard(
                    shape: RoundedRectangleBorder(
                      borderRadius: Cosmic.chipRadius,
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
                  _whyWeAsk(),
                  MortarCard(
                    shape: RoundedRectangleBorder(
                      borderRadius: Cosmic.chipRadius,
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
                // Account deletion, required in-app by App Store Guideline
                // 5.1.1(v). Shown on the full profile edit only — a deep link
                // to one section ("?section=industry") is a focused task and
                // has no business offering to delete the account.
                if (showAll) _dangerZone(context),
                const SizedBox(height: 32),
              ],
            ),
          ),
          Material(
            color: Color(0xE6000000),
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

  /// Bottom-of-page destructive section. Deliberately understated — it opens a
  /// screen that explains the consequences and takes a typed confirmation, so
  /// this button itself does nothing irreversible.
  Widget _dangerZone(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 40),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFB3261E).withValues(alpha: 0.35)),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Delete account',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
            ),
            const SizedBox(height: 6),
            const Text(
              'Permanently delete your MORTAR account and your data. This '
              'cannot be undone.',
              style: TextStyle(
                fontSize: 13,
                height: 1.4,
                color: AppColors.mutedForeground,
              ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFFF8B95),
                  side: BorderSide(
                      color: const Color(0xFFB3261E).withValues(alpha: 0.6)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: _saving
                    ? null
                    : () => context.push('/profile/delete-account'),
                icon: const Icon(Icons.delete_forever_rounded, size: 18),
                label: const Text('Delete my account',
                    style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
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
      // Uppercase + tracking, matching the app's section-header idiom. Also a
      // deliberate fix for "the I in Identity looks like another character":
      // Poppins' bar-like capital I reads fine inside an all-caps word, where
      // in title case it looked like a stray lowercase L.
      child: Text(
        title.toUpperCase(),
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
              letterSpacing: 1.4,
            ),
      ),
    );
  }

  /// One reusable line telling members why survey-style sections exist.
  Widget _whyWeAsk() {
    return const Padding(
      padding: EdgeInsets.only(bottom: 12),
      child: Text(
        'Why we ask: this helps us match you with relevant people, events, and resources.',
        style: TextStyle(
          fontSize: 12,
          color: AppColors.mutedForeground,
          fontStyle: FontStyle.italic,
          height: 1.35,
        ),
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
