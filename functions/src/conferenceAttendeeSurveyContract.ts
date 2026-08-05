/**
 * The conference registration survey — one source of truth for its shape.
 *
 * Attendees fill this in before checkout (Flutter: `conference_attendee_survey_screen.dart`),
 * `saveConferenceAttendeeSurvey` persists it, and `getAdminConferenceAttendeeProfiles`
 * hands it back to the admin panel. The admin UI renders columns and builds its CSV
 * from the field list the callable returns rather than a second hard-coded copy, so
 * adding a question here is the only edit the web app needs.
 */

/** Subcollection under `conferences/{conferenceId}` holding one doc per attendee, keyed by uid. */
export const CONFERENCE_ATTENDEE_PROFILES = "attendee_profiles";

export interface AttendeeSurveyField {
  key: string;
  label: string;
  /** Fixed choices, when the question is a dropdown rather than free text. */
  options?: readonly string[];
}

export const ANNUAL_GROSS_INCOME_OPTIONS = [
  "Less than $25k",
  "$25k - $75k",
  "More than $75k",
] as const;

export const EDUCATION_LEVEL_OPTIONS = [
  "High School",
  "Some college",
  "Bachelor degree",
  "Advanced degree",
] as const;

/**
 * Ordered as the survey asks them. This is also the CSV column order, after the
 * identity columns the export prepends.
 */
export const ATTENDEE_SURVEY_FIELDS: readonly AttendeeSurveyField[] = [
  { key: "company_name", label: "Company or Business name" },
  { key: "title", label: "Title" },
  { key: "home_address", label: "Home Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip_code", label: "Zip Code" },
  { key: "email", label: "Email" },
  { key: "heard_about_us", label: "How did you hear about Our North Star" },
  { key: "phone_number", label: "Phone Number" },
  { key: "race_ethnicity", label: "Race/Ethnicity" },
  { key: "gender", label: "Gender" },
  {
    key: "annual_gross_income",
    label: "Annual Gross Income",
    options: ANNUAL_GROSS_INCOME_OPTIONS,
  },
  {
    key: "education_level",
    label: "Level of Education",
    options: EDUCATION_LEVEL_OPTIONS,
  },
] as const;

export const ATTENDEE_SURVEY_KEYS = ATTENDEE_SURVEY_FIELDS.map((f) => f.key);

/**
 * Survey answers mirrored back onto `users/{uid}`, so the next conference the
 * attendee registers for autofills fields the curriculum profile never collected
 * (company, job title, street address, zip, phone).
 *
 * `city` / `state` are deliberately absent: the curriculum profile already owns
 * those and the survey asks for a *home* address, which may differ. See
 * `mirrorFieldsIfEmpty` for the ones filled only when currently blank.
 */
export const SURVEY_TO_USER_PROFILE: Record<string, string> = {
  company_name: "company_name",
  title: "job_title",
  home_address: "home_address",
  zip_code: "zip_code",
  phone_number: "phone_number",
};

/** Written to `users/{uid}` only when that field is currently empty. */
export const SURVEY_TO_USER_PROFILE_IF_EMPTY: Record<string, string> = {
  city: "city",
  state: "state",
};
