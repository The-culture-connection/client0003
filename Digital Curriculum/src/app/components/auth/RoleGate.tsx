import { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "./AuthProvider";

interface RoleGateProps {
  children: ReactNode;
  allowedRoles?: string[];
  deniedRoles?: string[];
  fallbackPath?: string;
}

/**
 * RoleGate component that restricts access based on user roles
 * 
 * @param allowedRoles - Array of roles that are allowed to access (if provided, user must have at least one)
 * @param deniedRoles - Array of roles that are denied access (if user has any of these, access is denied)
 * @param fallbackPath - Path to redirect to if access is denied (default: "/dashboard")
 */
export function RoleGate({
  children,
  allowedRoles,
  deniedRoles,
  fallbackPath = "/dashboard",
}: RoleGateProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = user.roles || [];

  const hasRole = (role: string) =>
    userRoles.some((r) => String(r).trim().toLowerCase() === role.trim().toLowerCase());

  // Check denied roles first (most restrictive)
  if (deniedRoles && deniedRoles.length > 0) {
    const hasDeniedRole = deniedRoles.some((role) => hasRole(role));
    if (hasDeniedRole) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // Check allowed roles
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some((role) => hasRole(role));
    if (!hasAllowedRole) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return <>{children}</>;
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role: string): boolean {
  const { user } = useAuth();
  if (!user || !user.roles) return false;
  return user.roles.includes(role);
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasAnyRole(roles: string[]): boolean {
  const { user } = useAuth();
  if (!user || !user.roles) return false;
  return roles.some((role) => user.roles?.includes(role));
}

/**
 * Hook to check if user has all of the specified roles
 */
export function useHasAllRoles(roles: string[]): boolean {
  const { user } = useAuth();
  if (!user || !user.roles) return false;
  return roles.every((role) => user.roles?.includes(role));
}
