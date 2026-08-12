import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../services/expansion_session_service.dart'
    show userMessageForFirebaseCallableError;
import '../../services/user_profile_repository.dart';
import '../models/conference.dart';
import '../models/conference_attendee_survey.dart';
import '../services/conference_attendee_survey_service.dart';
import '../theme/conference_colors.dart';
import '../../theme/cosmic_content.dart';

/// Presents the registration survey and resolves `true` once it is saved.
///
/// Callers gate checkout on the result: a `false` (dismissed, or failed to save)
/// must not fall through to Stripe, otherwise the attendee pays without a profile.
Future<bool> showConferenceAttendeeSurvey(
  BuildContext context,
  Conference conference,
) async {
  final saved = await Navigator.of(context).push<bool>(
    MaterialPageRoute<bool>(
      fullscreenDialog: true,
      builder: (_) => ConferenceAttendeeSurveyScreen(conference: conference),
    ),
  );
  return saved == true;
}

/// Pre-checkout registration survey.
///
/// Everything the curriculum profile already knows is prefilled but left
/// editable — the answers are a point-in-time record for the conference, not a
/// view onto the profile.
class ConferenceAttendeeSurveyScreen extends StatefulWidget {
  const ConferenceAttendeeSurveyScreen({super.key, required this.conference});

  final Conference conference;

  @override
  State<ConferenceAttendeeSurveyScreen> createState() =>
      _ConferenceAttendeeSurveyScreenState();
}

class _ConferenceAttendeeSurveyScreenState
    extends State<ConferenceAttendeeSurveyScreen> {
  final _formKey = GlobalKey<FormState>();
  final _profiles = UserProfileRepository();
  final _surveys = ConferenceAttendeeSurveyService();

  final _company = TextEditingController();
  final _title = TextEditingController();
  final _address = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();
  final _zip = TextEditingController();
  final _email = TextEditingController();
  final _heardAbout = TextEditingController();
  final _phone = TextEditingController();
  final _raceSelfDescribe = TextEditingController();
  final _genderSelfDescribe = TextEditingController();

  String? _race;
  String? _gender;
  String? _income;
  String? _education;
  String? _heardAboutChoice;

  /// Both beta testers asked for a dropdown here instead of free text.
  /// "Other" reveals a small free-text field; the submitted field is the same
  /// `heardAboutUs` string either way.
  static const List<String> _heardAboutOptions = [
    'Social media',
    'Email from MORTAR',
    'Friend or colleague',
    'MORTAR staff',
    'At the event',
    'Other',
  ];

  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _prefill();
  }

  @override
  void dispose() {
    for (final c in [
      _company,
      _title,
      _address,
      _city,
      _state,
      _zip,
      _email,
      _heardAbout,
      _phone,
      _raceSelfDescribe,
      _genderSelfDescribe,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _prefill() async {
    final user = FirebaseAuth.instance.currentUser;
    Map<String, dynamic>? doc;
    if (user != null) {
      try {
        doc = await _profiles.getUserDoc(user.uid);
      } catch (_) {
        // Prefill is a convenience; an unreadable profile just means empty fields.
      }
    }
    if (!mounted) return;
    final p = ConferenceSurveyPrefill.fromUserDoc(doc, authEmail: user?.email);
    setState(() {
      _company.text = p.companyName;
      _title.text = p.title;
      _address.text = p.homeAddress;
      _city.text = p.city;
      _state.text = p.state;
      _zip.text = p.zipCode;
      _email.text = p.email;
      _phone.text = p.phoneNumber;
      _loading = false;
    });
  }

  /// The dropdown value, or the typed text when they chose to self-describe.
  String _resolveChoice(String? choice, TextEditingController selfDescribe) {
    if (choice == ConferenceSurveyOptions.selfDescribe) {
      return selfDescribe.text.trim();
    }
    return choice ?? '';
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await _surveys.save(
        conferenceId: widget.conference.id,
        survey: ConferenceAttendeeSurvey(
          companyName: _company.text,
          title: _title.text,
          homeAddress: _address.text,
          city: _city.text,
          state: _state.text,
          zipCode: _zip.text,
          email: _email.text,
          heardAboutUs: _heardAboutChoice == 'Other'
              ? _heardAbout.text.trim()
              : (_heardAboutChoice ?? ''),
          phoneNumber: _phone.text,
          raceEthnicity: _resolveChoice(_race, _raceSelfDescribe),
          gender: _resolveChoice(_gender, _genderSelfDescribe),
          annualGrossIncome: _income ?? '',
          educationLevel: _education ?? '',
        ),
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = userMessageForFirebaseCallableError(e);
        _saving = false;
      });
    }
  }

  // ---------------------------------------------------------------- validators

  String? _requiredValidator(String? v, String label) =>
      (v == null || v.trim().isEmpty) ? 'Enter your $label' : null;

  String? _emailValidator(String? v) {
    final s = (v ?? '').trim();
    if (s.isEmpty) return 'Enter your email';
    // Deliberately loose — the server runs the authoritative check.
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(s)) {
      return 'Enter a valid email';
    }
    return null;
  }

  String? _zipValidator(String? v) {
    final s = (v ?? '').trim();
    if (s.isEmpty) return 'Enter your zip code';
    if (!RegExp(r'^\d{5}(-?\d{4})?$').hasMatch(s)) return 'Enter a 5-digit zip code';
    return null;
  }

  String? _phoneValidator(String? v) {
    final digits = (v ?? '').replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return 'Enter your phone number';
    if (digits.length < 10) return 'Enter a 10-digit phone number';
    return null;
  }

  // -------------------------------------------------------------------- build

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ConferenceColors.background,
      appBar: AppBar(
        backgroundColor: ConferenceColors.atmosphere,
        foregroundColor: ConferenceColors.gold,
        elevation: 0,
        title: const Text(
          'REGISTRATION',
          style: TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 15,
            letterSpacing: 1.2,
          ),
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: ConferenceColors.gold),
            )
          : SafeArea(
              child: Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
                  children: [
                    _header(),
                    const SizedBox(height: 24),
                    _sectionLabel('About you'),
                    _field(
                      controller: _company,
                      label: 'Company or Business name',
                      textCapitalization: TextCapitalization.words,
                      validator: (v) => _requiredValidator(v, 'company or business name'),
                    ),
                    _field(
                      controller: _title,
                      label: 'Title',
                      textCapitalization: TextCapitalization.words,
                      validator: (v) => _requiredValidator(v, 'title'),
                    ),
                    const SizedBox(height: 12),
                    _sectionLabel('Contact'),
                    _field(
                      controller: _address,
                      label: 'Home Address',
                      textCapitalization: TextCapitalization.words,
                      validator: (v) => _requiredValidator(v, 'home address'),
                    ),
                    _field(
                      controller: _city,
                      label: 'City',
                      textCapitalization: TextCapitalization.words,
                      validator: (v) => _requiredValidator(v, 'city'),
                    ),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: _field(
                            controller: _state,
                            label: 'State',
                            textCapitalization: TextCapitalization.words,
                            validator: (v) => _requiredValidator(v, 'state'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _field(
                            controller: _zip,
                            label: 'Zip Code',
                            keyboardType: TextInputType.number,
                            inputFormatters: [
                              FilteringTextInputFormatter.allow(RegExp(r'[0-9-]')),
                              LengthLimitingTextInputFormatter(10),
                            ],
                            validator: _zipValidator,
                          ),
                        ),
                      ],
                    ),
                    _field(
                      controller: _email,
                      label: 'Email',
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      validator: _emailValidator,
                    ),
                    _field(
                      controller: _phone,
                      label: 'Phone Number',
                      keyboardType: TextInputType.phone,
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'[0-9+()\-.\s]')),
                        LengthLimitingTextInputFormatter(20),
                      ],
                      validator: _phoneValidator,
                    ),
                    const SizedBox(height: 12),
                    _sectionLabel('A few more questions'),
                    _dropdown(
                      label: 'How did you hear about Our North Star',
                      value: _heardAboutChoice,
                      options: _heardAboutOptions,
                      onChanged: (v) => setState(() => _heardAboutChoice = v),
                    ),
                    if (_heardAboutChoice == 'Other')
                      _field(
                        controller: _heardAbout,
                        label: 'Tell us how you heard about us',
                        textCapitalization: TextCapitalization.sentences,
                        maxLines: 2,
                        validator: (v) => (v == null || v.trim().isEmpty)
                            ? 'Let us know how you heard about us'
                            : null,
                      ),
                    _dropdown(
                      label: 'Race/Ethnicity',
                      value: _race,
                      options: ConferenceSurveyOptions.raceEthnicity,
                      onChanged: (v) => setState(() => _race = v),
                    ),
                    if (_race == ConferenceSurveyOptions.selfDescribe)
                      _field(
                        controller: _raceSelfDescribe,
                        label: 'Self-describe your race/ethnicity',
                        validator: (v) => (v == null || v.trim().isEmpty)
                            ? 'Tell us how you describe yourself'
                            : null,
                      ),
                    _dropdown(
                      label: 'Gender',
                      value: _gender,
                      options: ConferenceSurveyOptions.gender,
                      onChanged: (v) => setState(() => _gender = v),
                    ),
                    if (_gender == ConferenceSurveyOptions.selfDescribe)
                      _field(
                        controller: _genderSelfDescribe,
                        label: 'Self-describe your gender',
                        validator: (v) => (v == null || v.trim().isEmpty)
                            ? 'Tell us how you describe yourself'
                            : null,
                      ),
                    _dropdown(
                      label: 'Annual Gross Income',
                      value: _income,
                      options: ConferenceSurveyOptions.annualGrossIncome,
                      onChanged: (v) => setState(() => _income = v),
                    ),
                    _dropdown(
                      label: 'Level of Education',
                      value: _education,
                      options: ConferenceSurveyOptions.educationLevel,
                      onChanged: (v) => setState(() => _education = v),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.error_outline_rounded,
                              color: Colors.redAccent, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _error!,
                              style: const TextStyle(
                                  color: Colors.redAccent, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 20),
                    SizedBox(
                      height: 54,
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: ConferenceColors.gold,
                          foregroundColor: Colors.black,
                          shape: const RoundedRectangleBorder(
                            borderRadius: Cosmic.chipRadius,
                          ),
                        ),
                        onPressed: _saving ? null : _submit,
                        child: _saving
                            ? const SizedBox(
                                height: 22,
                                width: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.black,
                                ),
                              )
                            : Text(
                                widget.conference.isFree
                                    ? 'Submit & register'
                                    : 'Submit & continue to checkout',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.4,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _header() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        border: Border.all(color: ConferenceColors.goldAlpha(0.45), width: 1.2),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF17130B),
            Colors.black.withValues(alpha: 0.7),
          ],
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: ConferenceColors.goldAlpha(0.14),
              border: Border.all(color: ConferenceColors.gold, width: 1.4),
            ),
            child: const Icon(Icons.assignment_rounded,
                color: ConferenceColors.gold, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.conference.name.toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'A few quick questions before you register. '
                  'We prefilled what we already know — edit anything.',
                  style: TextStyle(color: Cosmic.textMuted, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        text.toUpperCase(),
        style: TextStyle(
          color: ConferenceColors.goldAlpha(0.85),
          fontWeight: FontWeight.w700,
          fontSize: 11,
          letterSpacing: 1.4,
        ),
      ),
    );
  }

  InputDecoration _decoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: TextStyle(color: Cosmic.textMuted, fontSize: 13),
      floatingLabelStyle: const TextStyle(color: ConferenceColors.gold),
      filled: true,
      fillColor: Colors.black.withValues(alpha: 0.4),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      enabledBorder: OutlineInputBorder(
        borderRadius: Cosmic.chipRadius,
        borderSide: BorderSide(color: ConferenceColors.goldAlpha(0.35)),
      ),
      focusedBorder: const OutlineInputBorder(
        borderRadius: Cosmic.chipRadius,
        borderSide: BorderSide(color: ConferenceColors.gold, width: 1.6),
      ),
      errorBorder: const OutlineInputBorder(
        borderRadius: Cosmic.chipRadius,
        borderSide: BorderSide(color: Colors.redAccent),
      ),
      focusedErrorBorder: const OutlineInputBorder(
        borderRadius: Cosmic.chipRadius,
        borderSide: BorderSide(color: Colors.redAccent, width: 1.6),
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    String? Function(String?)? validator,
    TextInputType? keyboardType,
    TextCapitalization textCapitalization = TextCapitalization.none,
    List<TextInputFormatter>? inputFormatters,
    bool autocorrect = true,
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextFormField(
        controller: controller,
        validator: validator,
        keyboardType: keyboardType,
        textCapitalization: textCapitalization,
        inputFormatters: inputFormatters,
        autocorrect: autocorrect,
        maxLines: maxLines,
        maxLength: 300,
        buildCounter: (_, {required currentLength, required isFocused, maxLength}) => null,
        style: const TextStyle(color: Colors.white, fontSize: 15),
        decoration: _decoration(label),
      ),
    );
  }

  Widget _dropdown({
    required String label,
    required String? value,
    required List<String> options,
    required ValueChanged<String?> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: DropdownButtonFormField<String>(
        initialValue: value,
        isExpanded: true,
        dropdownColor: const Color(0xFF17130B),
        iconEnabledColor: ConferenceColors.gold,
        style: const TextStyle(color: Colors.white, fontSize: 15),
        decoration: _decoration(label),
        validator: (v) => (v == null || v.isEmpty) ? 'Select an option' : null,
        items: [
          for (final o in options)
            DropdownMenuItem<String>(value: o, child: Text(o)),
        ],
        onChanged: onChanged,
      ),
    );
  }
}
