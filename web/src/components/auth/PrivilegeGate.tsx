"use client";

import { RoleGate } from "./RoleGate";
import type { Permission } from "@/lib/permissions";

interface PrivilegeGateProps {
  children: React.ReactNode;
  permission: Permission;
  fallback?: React.ReactNode;
}

export function PrivilegeGate({ children, permission, fallback }: PrivilegeGateProps) {
  return (
    <RoleGate requiredPermission={permission} fallback={fallback}>
      {children}
    </RoleGate>
  );
}
