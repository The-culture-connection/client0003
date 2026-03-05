"use client";

import { useAuth } from "./AuthProvider";
import { userHasPermission } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions";

interface RoleGateProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
}

export function RoleGate({ 
  children, 
  requiredRole, 
  requiredPermission,
  fallback 
}: RoleGateProps) {
  const { user } = useAuth();
  const roles = user?.roles || [];

  if (requiredRole) {
    if (!roles.includes(requiredRole)) {
      return fallback || (
        <div className="p-4 text-center text-muted-foreground">
          You don&apos;t have the required role to access this content.
        </div>
      );
    }
  }

  if (requiredPermission) {
    if (!userHasPermission(roles, requiredPermission)) {
      return fallback || (
        <div className="p-4 text-center text-muted-foreground">
          You don&apos;t have permission to access this content.
        </div>
      );
    }
  }

  return <>{children}</>;
}
