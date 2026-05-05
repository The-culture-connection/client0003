import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "mortar_admin_view_mode";

export type AdminNavViewMode = "student" | "admin";

interface AdminViewModeContextType {
  adminViewMode: AdminNavViewMode;
  setAdminViewMode: (mode: AdminNavViewMode) => void;
}

const AdminViewModeContext = createContext<AdminViewModeContextType | null>(null);

function readStoredMode(): AdminNavViewMode {
  if (typeof window === "undefined") return "admin";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "admin" || v === "student" ? v : "admin";
}

export function AdminViewModeProvider({ children }: { children: ReactNode }) {
  const [adminViewMode, setAdminViewModeState] = useState<AdminNavViewMode>(readStoredMode);

  const setAdminViewMode = useCallback((mode: AdminNavViewMode) => {
    setAdminViewModeState(mode);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const value = useMemo(() => ({ adminViewMode, setAdminViewMode }), [adminViewMode, setAdminViewMode]);

  return <AdminViewModeContext.Provider value={value}>{children}</AdminViewModeContext.Provider>;
}

export function useAdminViewMode(): AdminViewModeContextType {
  const ctx = useContext(AdminViewModeContext);
  if (!ctx) {
    throw new Error("useAdminViewMode must be used within AdminViewModeProvider");
  }
  return ctx;
}
