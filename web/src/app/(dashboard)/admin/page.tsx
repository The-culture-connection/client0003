"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  Settings,
  FileText,
  Calendar,
  Award,
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Admin Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage users, content, and platform analytics
        </p>
      </div>

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

        <Card className="p-6 bg-card border-border hover:border-accent transition-all cursor-pointer">
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

        <Card className="p-6 bg-card border-border hover:border-accent transition-all cursor-pointer">
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

        <Card className="p-6 bg-card border-border hover:border-accent transition-all cursor-pointer">
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

        <Card className="p-6 bg-card border-border hover:border-accent transition-all cursor-pointer">
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

        <Card className="p-6 bg-card border-border hover:border-accent transition-all cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent/10">
              <Settings className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Settings
              </h3>
              <p className="text-sm text-muted-foreground">
                Platform configuration
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
