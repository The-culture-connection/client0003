"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  Settings,
  FileText,
  Calendar,
  Award,
  UserPlus,
  KeyRound,
  ShieldAlert,
  LineChart,
} from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth/AuthProvider";
import { InPersonCohortCsvImport } from "@/components/admin/InPersonCohortCsvImport";
import { EligibleUsersAdminPanel } from "@/components/admin/EligibleUsersAdminPanel";
import { MobileModerationPanel } from "@/components/admin/MobileModerationPanel";
import { MobileAnalyticsSummariesPanel } from "@/components/admin/MobileAnalyticsSummariesPanel";

function isAdminUser(roles: string[] | undefined) {
  const r = roles ?? [];
  return r.includes("Admin") || r.includes("superAdmin");
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const roles = user?.roles ?? [];
  const admin = isAdminUser(roles);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-muted-foreground">Loading…</div>
    );
  }

  if (!admin) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-xl font-semibold text-foreground mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          You need the Admin or superAdmin role to use this area.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <Badge variant="secondary">Admin</Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full gap-4">
        <TabsList className="flex flex-wrap h-auto min-h-9">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="in-person-cohort" className="gap-1">
            <UserPlus className="w-3.5 h-3.5" />
            In-person cohort
          </TabsTrigger>
          <TabsTrigger value="expansion-eligible" className="gap-1">
            <KeyRound className="w-3.5 h-3.5" />
            Expansion invites
          </TabsTrigger>
          <TabsTrigger value="mobile-moderation" className="gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Mobile & reports
          </TabsTrigger>
          <TabsTrigger value="mobile-analytics" className="gap-1">
            <LineChart className="w-3.5 h-3.5" />
            Mobile analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <p className="text-sm text-muted-foreground mb-6">
            Manage users, content, and platform analytics
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/analytics">
              <Card className="p-6 bg-card border-border hover:border-accent transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-accent/10">
                    <BarChart3 className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Analytics
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      View platform metrics
                    </p>
                  </div>
                </div>
              </Card>
            </Link>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/10">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    User Management
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Manage users and roles
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/10">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Content Management
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Manage curriculum and quizzes
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/10">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Event Management
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Create and manage events
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/10">
                  <Award className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Badge Management
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Manage badges and awards
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/10">
                  <Settings className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Platform configuration
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="in-person-cohort" className="mt-4">
          <InPersonCohortCsvImport />
        </TabsContent>

        <TabsContent value="expansion-eligible" className="mt-4">
          <EligibleUsersAdminPanel />
        </TabsContent>

        <TabsContent value="mobile-moderation" className="mt-4">
          <MobileModerationPanel />
        </TabsContent>

        <TabsContent value="mobile-analytics" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Phase 4 summaries driven by <code className="text-xs">expansion_analytics_events</code> (Cloud
            Function rollups). Download merges paginated raw rows for backup / spreadsheet import.
          </p>
          <MobileAnalyticsSummariesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
