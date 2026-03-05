"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Award,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Edit,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export function MobileProfilePage() {
  const { user } = useAuth();

  return (
    <div className="p-4 pb-24">
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-2xl font-bold">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <h1 className="text-xl text-foreground font-medium">
                {user?.displayName || user?.email?.split("@")[0] || "User"}
              </h1>
              <p className="text-sm text-muted-foreground">Class of 2025</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {user?.roles && user.roles.length > 0 && (
            <Badge className="bg-accent text-accent-foreground">
              {user.roles[0]}
            </Badge>
          )}
          <Badge variant="secondary" className="bg-accent/10 text-accent">
            🏆 Early Adopter
          </Badge>
          <Badge variant="secondary" className="bg-accent/10 text-accent">
            🎯 Quiz Master
          </Badge>
        </div>
      </div>

      <Card className="p-4 bg-card border-border mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg text-foreground font-medium">About</h2>
          <Button variant="ghost" size="sm" className="text-accent">
            <Edit className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Passionate entrepreneur with a focus on sustainable business
          practices. Alumni of Mortar&apos;s 2025 cohort, now running a successful
          marketing consultancy.
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="w-4 h-4" />
            <span>Marketing Consultant</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>San Francisco, CA</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>{user?.email || "user@example.com"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>(555) 123-4567</span>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-card border-border mb-4">
        <h2 className="text-lg text-foreground font-medium mb-4">
          Achievements
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Certificates", value: "5" },
            { label: "Courses", value: "12" },
            { label: "Badges", value: "8" },
            { label: "Connections", value: "156" },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="p-3 border border-border rounded-lg text-center"
            >
              <p className="text-2xl font-bold text-foreground mb-1">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 bg-card border-border">
        <h2 className="text-lg text-foreground font-medium mb-4">
          Recent Certificates
        </h2>
        <div className="space-y-3">
          {[
            { title: "Business Fundamentals", date: "Jan 20, 2026" },
            { title: "Marketing Strategy", date: "Feb 5, 2026" },
          ].map((cert, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 border border-border rounded-lg"
            >
              <div className="p-2 rounded-lg bg-accent/10">
                <Award className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h4 className="text-foreground text-sm font-medium">
                  {cert.title}
                </h4>
                <p className="text-xs text-muted-foreground">{cert.date}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
