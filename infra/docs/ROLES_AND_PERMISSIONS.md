# Roles and Permissions System

## Overview

The MORTAR platform uses a curriculum-based role system with granular permissions. All new users sign up as **Digital Curriculum Students** by default. Other roles are assigned via the Admin dashboard.

## Available Roles

### 1. Admin
**Full system access**
- Admin dashboard
- All offered courses
- Expansion Network
- Event Posting
- Post Posting
- Group Creation
- Job Posting
- Skill Posting

### 2. Digital Curriculum Students
**Default signup role**
- Paid For Course Modules
- Post Posting
- Skill Posting

### 3. Digital Curriculum Alumni
- Paid For Course Modules
- Expansion Network
- Post Posting
- Skill Posting

### 4. In Person Curriculum Alumni
- All offered courses
- Expansion Network
- Event Posting
- Post Posting
- Group Creation
- Job Posting
- Skill Posting

### 5. In Person Curriculum Students
- Expansion Network
- Post Posting
- Job Posting
- Skill Posting

## How Roles Are Assigned

### New User Signup
- **Default Role**: All new users automatically receive `Digital Curriculum Students` role
- **Admin Emails**: Users with emails in the Admin list (see `functions/src/config/superAdmins.ts`) automatically receive `Admin` role on signup

### Role Assignment via Admin Dashboard
- Only users with `Admin` role can assign roles to other users
- Use the `setUserRole` callable function (deployed as a Firebase Function)
- Roles can be added or removed

## Implementation Details

### Backend (Functions)
- **Role Configuration**: `functions/src/config/roles.ts`
- **Admin Email List**: `functions/src/config/superAdmins.ts`
- **Default Role Assignment**: `functions/src/triggers/onUserCreated.ts`
- **Role Management**: `functions/src/callables/setUserRole.ts`

### Frontend (Web)
- **Permissions Utility**: `web/src/lib/permissions.ts`
- **Auth Utilities**: `web/src/lib/auth.ts`
- **UI Display**: `web/src/app/page.tsx`

### Custom Claims
Roles are stored in Firebase Auth custom claims as an array:
```json
{
  "roles": ["Digital Curriculum Students"]
}
```

### Firestore Mirror
Roles are also stored in `/users/{uid}.roles` in Firestore for easy querying:
```json
{
  "roles": ["Digital Curriculum Students"]
}
```

## Using Permissions in Code

### Backend (Functions)
```typescript
import {userHasPermission, hasPermission} from "../config/roles";

// Check if user has permission
if (userHasPermission(userRoles, "admin_dashboard")) {
  // Allow access
}

// Check if specific role has permission
if (hasPermission("Digital Curriculum Alumni", "expansion_network")) {
  // Allow access
}
```

### Frontend (Web)
```typescript
import {userHasPermission, getPermissionsForRoles} from "@/lib/permissions";

// Check if user has permission
if (userHasPermission(user.roles || [], "admin_dashboard")) {
  // Show admin dashboard
}

// Get all permissions for user's roles
const permissions = getPermissionsForRoles(user.roles || []);
```

## Important Notes

### Token Refresh
After role assignment, users must refresh their ID token to see updated roles:
- **Web**: Click "Refresh Roles" button or sign out and back in
- **Programmatic**: Call `getIdToken(user, true)` to force refresh

### Admin Role Protection
- Admins cannot remove their own Admin role
- Only Admins can assign roles to other users
- Admin role grants all permissions automatically

## Scripts

### Assign Admin Role to Existing Users
```bash
# For emulator
npm run assign-superadmin

# For dev environment
npm run assign-superadmin -- --env dev

# For specific user (simple script)
node infra/scripts/assign-superadmin-simple.js user@example.com
```

## Migration Notes

If you have existing users with old roles (`superAdmin`, `contentAdmin`, etc.), you'll need to:
1. Update their roles using the `setUserRole` function
2. Or use the migration script to bulk update roles

## Security Rules

Firestore security rules should check custom claims:
```javascript
match /users/{userId} {
  allow read: if request.auth != null && 
    (request.auth.uid == userId || 
     request.auth.token.roles.hasAny(['Admin']));
}
```

## Future Enhancements

- Role-based UI components (show/hide based on permissions)
- Permission inheritance (e.g., Alumni inherits Student permissions)
- Role expiration dates
- Temporary role assignments
