/**
 * Admin Email Configuration
 * Users with these emails will automatically receive Admin role on account creation
 *
 * Source: infra/Credentials/App Metadata
 */

export const ADMIN_EMAILS = [
  "shannon@wearemortar.com",
  "masters@wearemortar.com",
  "grace@wearemortar.com",
  "gshort03@gmail.com",
  "grace-s@the-culture-connection.com",
  "admin@gmail.com",
] as const;

/**
 * Check if an email is an admin email
 * @param {string | null | undefined} email - The email address to check
 * @return {boolean} True if the email is in the admin list
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase();
  return (ADMIN_EMAILS as readonly string[]).includes(normalizedEmail);
}
