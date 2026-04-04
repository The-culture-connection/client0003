/**
 * Role and Permission Configuration
 *
 * Defines all available roles and their associated permissions.
 * Roles are assigned via the Admin dashboard (except Digital Curriculum Students, which is the default signup role).
 */

export type Role =
  | "Admin"
  | "Digital Curriculum Students"
  | "Digital Curriculum Alumni"
  | "In Person Curriculum Alumni"
  | "In Person Curriculum Students";

export type Permission =
  | "admin_dashboard"
  | "all_offered_courses"
  | "expansion_network"
  | "event_posting"
  | "post_posting"
  | "group_creation"
  | "job_posting"
  | "skill_posting"
  | "paid_for_course_modules";

/**
 * Role to Permissions Mapping
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  "Admin": [
    "admin_dashboard",
    "all_offered_courses",
    "expansion_network",
    "event_posting",
    "post_posting",
    "group_creation",
    "job_posting",
    "skill_posting",
  ],
  "Digital Curriculum Students": [
    "paid_for_course_modules",
    "post_posting",
    "skill_posting",
  ],
  "Digital Curriculum Alumni": [
    "paid_for_course_modules",
    "expansion_network",
    "post_posting",
    "skill_posting",
  ],
  "In Person Curriculum Alumni": [
    "all_offered_courses",
    "expansion_network",
    "event_posting",
    "post_posting",
    "group_creation",
    "job_posting",
    "skill_posting",
  ],
  "In Person Curriculum Students": [
    "expansion_network",
    "post_posting",
    "job_posting",
    "skill_posting",
  ],
};

/**
 * Default role assigned to new users on signup
 */
export const DEFAULT_SIGNUP_ROLE: Role = "Digital Curriculum Students";

/**
 * Check if a role has a specific permission
 * @param {Role} role - The role to check
 * @param {Permission} permission - The permission to check for
 * @return {boolean} True if the role has the permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a user (with multiple roles) has a specific permission
 * @param {string[]} roles - Array of user roles
 * @param {Permission} permission - The permission to check for
 * @return {boolean} True if any of the user's roles has the permission
 */
export function userHasPermission(roles: string[], permission: Permission): boolean {
  // Admin has all permissions
  if (roles.includes("Admin")) {
    return true;
  }

  // Check if any role has the permission
  return roles.some((role) => hasPermission(role as Role, permission));
}

/**
 * Get all permissions for a set of roles
 * @param {string[]} roles - Array of user roles
 * @return {Permission[]} Array of all unique permissions for the roles
 */
export function getPermissionsForRoles(roles: string[]): Permission[] {
  const permissions = new Set<Permission>();

  roles.forEach((role) => {
    const rolePermissions = ROLE_PERMISSIONS[role as Role] || [];
    rolePermissions.forEach((perm) => permissions.add(perm));
  });

  return Array.from(permissions);
}

/**
 * Validate that a role string is a valid role
 * @param {string} role - The role string to validate
 * @return {boolean} True if the role is valid
 */
export function isValidRole(role: string): role is Role {
  return role in ROLE_PERMISSIONS;
}

/**
 * All available roles (for validation/enumeration)
 */
export const ALL_ROLES: Role[] = [
  "Admin",
  "Digital Curriculum Students",
  "Digital Curriculum Alumni",
  "In Person Curriculum Alumni",
  "In Person Curriculum Students",
];
