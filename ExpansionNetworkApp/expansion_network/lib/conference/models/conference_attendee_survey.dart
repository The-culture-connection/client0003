import '../../profile/profile_utils.dart';

/// The registration survey an attendee completes before checkout.
///
/// Field keys mirror `functions/src/conferenceAttendeeSurveyContract.ts` exactly —
/// `saveConferenceAttendeeSurvey` validates against that contract, so a rename on
/// either side has to happen on both.
class ConferenceAttendeeSurvey {
  const ConferenceAttendeeSurvey({
    required this.companyName,
    required this.title,
    required this.homeAddress,
    required this.city,
    required this.state,
    required this.zipCode,
    required this.email,
    required this.heardAboutUs,
    required this.phoneNumber,
    required this.raceEthnicity,
    required this.gender,
    required this.annualGrossIncome,
    required this.educationLevel,
  });

  final String companyName;
  final String title;
  final String homeAddress;
  final String city;
  final String state;
  final String zipCode;
  final String email;
  final String heardAboutUs;
  final String phoneNumber;
  final String raceEthnicity;
  final String gender;
  final String annualGrossIncome;
  final String educationLevel;

  Map<String, dynamic> toAnswers() => <String, dynamic>{
        'company_name': companyName.trim(),
        'title': title.trim(),
        'home_address': homeAddress.trim(),
        'city': city.trim(),
        'state': state.trim(),
        'zip_code': zipCode.trim(),
        'email': email.trim(),
        'heard_about_us': heardAboutUs.trim(),
        'phone_number': phoneNumber.trim(),
        'race_ethnicity': raceEthnicity.trim(),
        'gender': gender.trim(),
        'annual_gross_income': annualGrossIncome.trim(),
        'education_level': educationLevel.trim(),
      };
}

/// Choice lists for the dropdown questions.
///
/// Income and education strings must match `ANNUAL_GROSS_INCOME_OPTIONS` /
/// `EDUCATION_LEVEL_OPTIONS` in the backend contract — those two are validated
/// as enums server-side and a mismatch rejects the submission.
abstract final class ConferenceSurveyOptions {
  static const List<String> annualGrossIncome = [
    'Less than \$25k',
    '\$25k - \$75k',
    'More than \$75k',
  ];

  static const List<String> educationLevel = [
    'High School',
    'Some college',
    'Bachelor degree',
    'Advanced degree',
  ];

  /// Free-text is stored instead when the attendee picks [selfDescribe].
  static const List<String> raceEthnicity = [
    'American Indian or Alaska Native',
    'Asian',
    'Black or African American',
    'Hispanic or Latino',
    'Middle Eastern or North African',
    'Native Hawaiian or Other Pacific Islander',
    'White',
    'Two or more races',
    selfDescribe,
    preferNotToSay,
  ];

  static const List<String> gender = [
    'Woman',
    'Man',
    'Non-binary',
    selfDescribe,
    preferNotToSay,
  ];

  /// Selecting this reveals a free-text field; the typed value is what gets saved.
  static const String selfDescribe = 'Prefer to self-describe';
  static const String preferNotToSay = 'Prefer not to say';
}

/// Best-effort prefill pulled from `users/{uid}`.
///
/// Coverage is partial by design: the curriculum profile has never collected a
/// company, phone number, street address or zip. `saveConferenceAttendeeSurvey`
/// mirrors those back onto the user doc after the first submission, so a second
/// registration autofills completely.
class ConferenceSurveyPrefill {
  const ConferenceSurveyPrefill({
    this.companyName = '',
    this.title = '',
    this.homeAddress = '',
    this.city = '',
    this.state = '',
    this.zipCode = '',
    this.email = '',
    this.phoneNumber = '',
  });

  final String companyName;
  final String title;
  final String homeAddress;
  final String city;
  final String state;
  final String zipCode;
  final String email;
  final String phoneNumber;

  /// [authEmail] backs up the profile's `email` for accounts that predate it.
  factory ConferenceSurveyPrefill.fromUserDoc(
    Map<String, dynamic>? doc, {
    String? authEmail,
  }) {
    String pick(List<String> keys) {
      if (doc == null) return '';
      for (final k in keys) {
        final v = profileString(doc[k]);
        if (v != null) return v;
      }
      return '';
    }

    return ConferenceSurveyPrefill(
      companyName: pick(['company_name', 'company', 'business_name']),
      // `profession` is the curriculum profile's nearest thing to a job title.
      title: pick(['job_title', 'title', 'profession']),
      homeAddress: pick(['home_address', 'street_address', 'address']),
      city: pick(['city']),
      state: pick(['state']),
      zipCode: pick(['zip_code', 'zip', 'postal_code']),
      email: pick(['email']).isNotEmpty ? pick(['email']) : (authEmail ?? ''),
      phoneNumber: pick(['phone_number', 'phone', 'phone_num']),
    );
  }
}
