# MORTAR Authentication System

## Overview
This document describes the authentication flow implemented for the MORTAR platform.

## Features

### ✅ Google Sign-In Simulation
- Google OAuth button on login and signup pages
- Simulates Google authentication flow with mock user creation

### ✅ Email/Password Authentication
- Traditional email/password login and signup
- Password validation (minimum 6 characters)
- Password confirmation on signup
- Terms of Service agreement checkbox

### ✅ User Onboarding Flow
- 3-step onboarding process for new users
- Collects: Full name, City, Cohort (optional), and Role selection
- Role options:
  - **In-Person Alumni** (Free) - Full access
  - **Digital Alumni** (Paid) - Purchased bundle access
  - **Digital Student** (Paid) - New students

### ✅ Protected Routes
- All main app routes require authentication
- Automatic redirect to `/login` for unauthenticated users
- Loading state while checking authentication

### ✅ User Profile Management
- User dropdown menu in navigation (web & mobile)
- Display user name, email, and initials
- Logout functionality with redirect to login

### ✅ Persistent Sessions
- User data stored in localStorage
- Automatic session restoration on page reload
- Multiple users supported via localStorage

## Pages

### Public Pages
- `/login` - Login page with Google and email options
- `/signup` - Signup page with Google and email options

### Protected Pages
- `/onboarding` - 3-step onboarding for new users
- `/dashboard` - Main dashboard (and all other app pages)

## Authentication Context

The authentication system is managed by `AuthContext` which provides:

```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  isAuthenticated: boolean;
}
```

## User Data Model

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  city: string;
  cohort: string;
  completedBusinessProfile: boolean;
  badges: string[];
  points: number;
}

type UserRole = 
  | "admin"
  | "digital-student"
  | "digital-alumni"
  | "in-person-student"
  | "in-person-alumni";
```

## Demo Mode

**Important:** This is a prototype implementation using localStorage for demonstration purposes.

- Any email/password combination will work
- Google sign-in is simulated (no actual OAuth)
- User data persists in browser localStorage only
- Not suitable for production use with real user data

## Usage

### For Testing

1. **New User Flow:**
   - Click "Sign up" or "Continue with Google"
   - Complete the 3-step onboarding
   - Access the dashboard

2. **Returning User:**
   - Use email/password login
   - Session persists across page reloads

3. **Logout:**
   - Click user avatar in top right
   - Select "Log out"
   - Redirected to login page

## Next Steps for Production

To make this production-ready, you would need:

1. **Backend Integration**
   - Real OAuth with Google
   - Secure password hashing (bcrypt)
   - JWT or session-based authentication
   - Database for user storage (PostgreSQL, MongoDB, etc.)

2. **Security Enhancements**
   - HTTPS enforcement
   - CSRF protection
   - Rate limiting
   - Email verification
   - Password reset flow
   - Two-factor authentication

3. **Supabase Integration** (Recommended)
   - Built-in authentication with multiple providers
   - Row-level security
   - Real-time subscriptions
   - Automatic JWT management

## Files Modified/Created

### Created
- `/src/app/lib/auth-context.tsx` - Authentication context and provider
- `/src/app/pages/Login.tsx` - Login page
- `/src/app/pages/Signup.tsx` - Signup page
- `/src/app/pages/Onboarding.tsx` - Onboarding flow
- `/src/app/components/ProtectedRoute.tsx` - Route protection HOC

### Modified
- `/src/app/App.tsx` - Added AuthProvider wrapper
- `/src/app/routes.ts` - Added auth routes and protection
- `/src/app/components/web/WebNavigation.tsx` - Added user menu
- `/src/app/components/mobile/MobileNavigation.tsx` - Added user menu
- `/src/app/pages/web/Dashboard.tsx` - Display authenticated user data
