/// Canonical roles for Expansion Network (exact strings — do not rename).
const Set<String> kExpansionNetworkAllowedRoles = {
  'superAdmin',
  'Admin',
  'Alumni',
  'Digital Curriculum Alumni',
  'Digital Curriculum Students',
};

/// Legacy / generic copy when eligibility is unknown to the client.
const String kAlumniNetworkAccessDeniedMessage =
    "This email is not approved for alumni network access.";

const String kSessionNotAuthorizedMessage =
    'Your account is not authorized for this network.';

const String kSessionNoNetworkAccessMessage =
    'Your account is recognized, but you do not currently have alumni network access.';

/// `expansion_cohort_emails` — legacy cohort CSV (optional migration path).
const String kExpansionCohortEmailsCollection = 'expansion_cohort_emails';

const String kUserFieldExpansionMobileAppAccountCreated =
    'expansion_mobile_app_account_created';

const String kUserFieldExpansionMobileAppAccountCreatedAt =
    'expansion_mobile_app_account_created_at';

const String kCohortEmailFieldLinkedFirebaseUid =
    'expansion_linked_firebase_uid';

const String kExpansionCohortEmailAlreadyLinkedMessage =
    'This email is already linked to another Expansion Network account. Sign in with that account or contact support.';
