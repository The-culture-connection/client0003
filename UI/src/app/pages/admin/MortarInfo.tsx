import { useNavigate } from "react-router";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Megaphone, ArrowLeft } from "lucide-react";

export function MortarInfo() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/admin")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Admin Dashboard
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Mortar Info</h1>
        <p className="text-muted-foreground">
          Manage platform announcements and important updates
        </p>
      </div>

      <Card className="p-12 text-center">
        <Megaphone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Mortar Info Panel</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This feature is available in your Digital Curriculum repo. Import the MortarInfoAdminPanel component from your existing codebase.
        </p>
      </Card>
    </div>
  );
}
