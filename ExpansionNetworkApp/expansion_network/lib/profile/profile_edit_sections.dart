/// Query `section` values for `/profile/edit` — one block per onboarding step.
abstract final class ProfileEditSections {
  static const identity = 'identity';
  static const goals = 'goals';
  static const skillsConfident = 'skills_confident';
  static const skillsDesired = 'skills_desired';
  static const industry = 'industry';
  static const work = 'work';
  static const links = 'links';
  /// Show every block (default when no query param).
  static const all = 'all';
}

const _knownSectionIds = <String>{
  ProfileEditSections.identity,
  ProfileEditSections.goals,
  ProfileEditSections.skillsConfident,
  ProfileEditSections.skillsDesired,
  ProfileEditSections.industry,
  ProfileEditSections.work,
  ProfileEditSections.links,
  ProfileEditSections.all,
};

/// Maps legacy `about` / `skills` and normalizes empty → full edit.
/// Unknown values fall back to [ProfileEditSections.all].
String normalizeProfileEditSection(String? raw) {
  if (raw == null || raw.isEmpty) return ProfileEditSections.all;
  switch (raw) {
    case 'about':
      return ProfileEditSections.identity;
    case 'skills':
      return ProfileEditSections.skillsConfident;
    default:
      if (_knownSectionIds.contains(raw)) return raw;
      return ProfileEditSections.all;
  }
}

bool isFullProfileEdit(String? normalized) {
  return normalized == null ||
      normalized.isEmpty ||
      normalized == ProfileEditSections.all;
}

String profileEditAppBarTitle(String? normalized) {
  if (isFullProfileEdit(normalized)) return 'Edit profile';
  switch (normalized) {
    case ProfileEditSections.identity:
      return 'Edit identity & location';
    case ProfileEditSections.goals:
      return 'Edit business goals';
    case ProfileEditSections.skillsConfident:
      return 'Edit skills you’re confident in';
    case ProfileEditSections.skillsDesired:
      return 'Edit skills to acquire';
    case ProfileEditSections.industry:
      return 'Edit industry';
    case ProfileEditSections.work:
      return 'Edit work structure';
    case ProfileEditSections.links:
      return 'Edit profile links';
    default:
      return 'Edit profile';
  }
}

String flexibilityLabel(int v) {
  if (v <= 2) return 'Strict 9-5';
  if (v <= 4) return 'Mostly structured';
  if (v <= 6) return 'Some flexibility';
  if (v <= 8) return 'Very flexible';
  return 'No set schedule';
}

String ownershipLabel(int v) {
  if (v <= 2) return 'Employee';
  if (v <= 4) return 'Contractor/Freelancer';
  if (v <= 6) return 'Co-founder/Partner';
  if (v <= 8) return 'Majority owner';
  return 'Full company owner';
}
