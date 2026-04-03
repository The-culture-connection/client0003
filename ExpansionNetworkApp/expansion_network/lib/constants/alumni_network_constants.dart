/// Roles that may use Expansion Network when granted via admin bypass (`users/{uid}.roles`).
const Set<String> kExpansionNetworkAllowedRoles = {
  'superAdmin',
  'Admin',
  'Alumni',
  'Digital Curriculum Alumni',
};

/// Shown when the signed-in email is not on an in-person cohort upload (or equivalent access).
const String kAlumniNetworkAccessDeniedMessage =
    "You are not apart of the alumni network, go to Mortar's digital curriculum platform to find out how to get access to this app";

/// Document ID = [email.trim().toLowerCase()]; fields: `cohort_id` (cohort title from admin), `updated_at`.
const String kExpansionCohortEmailsCollection = 'expansion_cohort_emails';
