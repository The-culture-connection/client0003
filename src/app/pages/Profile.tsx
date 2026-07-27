import { Settings, Award, Briefcase, MapPin, Mail, Phone, Edit } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';

export default function Profile() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-border px-4 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-2xl font-bold">
                JD
              </div>
              <div>
                <h1 className="text-xl text-foreground font-medium">
                  John Doe
                </h1>
                <p className="text-sm text-muted-foreground">Class of 2025</p>
              </div>
            </div>
            <button className="text-muted-foreground">
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2 flex-wrap mt-4">
            <span className="bg-accent text-accent-foreground px-2 py-1 rounded text-xs">
              Alumni
            </span>
            <span className="bg-accent/10 text-accent px-2 py-1 rounded text-xs">
              🏆 Early Adopter
            </span>
            <span className="bg-accent/10 text-accent px-2 py-1 rounded text-xs">
              🎯 Quiz Master
            </span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* About */}
          <div className="p-4 bg-card border border-border rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg text-foreground font-medium">About</h2>
              <button className="text-accent">
                <Edit className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Passionate entrepreneur with a focus on sustainable business
              practices. Alumni of Mortar's 2025 cohort, now running a successful
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
                <span>john.doe@example.com</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>(555) 123-4567</span>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="p-4 bg-card border border-border rounded-xl">
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
          </div>

          {/* Recent Certificates */}
          <div className="p-4 bg-card border border-border rounded-xl">
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
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}