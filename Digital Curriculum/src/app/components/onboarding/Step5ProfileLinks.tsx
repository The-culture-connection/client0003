import { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface Step5ProfileLinksProps {
  profileLinks: {
    linkedin?: string;
    portfolio?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  onUpdate: (links: {
    linkedin?: string;
    portfolio?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  }) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step5ProfileLinks({
  profileLinks,
  onUpdate,
  onNext,
  onBack,
}: Step5ProfileLinksProps) {
  const [links, setLinks] = useState(profileLinks);

  const updateLink = (key: keyof typeof links, value: string) => {
    const newLinks = { ...links, [key]: value };
    setLinks(newLinks);
    onUpdate(newLinks);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Profile Links & Visibility</h1>
        <p className="text-muted-foreground">Add your social media and portfolio links (optional)</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="linkedin" className="text-foreground">
            LinkedIn URL
          </Label>
          <Input
            id="linkedin"
            type="url"
            placeholder="https://linkedin.com/in/yourprofile"
            value={links.linkedin || ""}
            onChange={(e) => updateLink("linkedin", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="portfolio" className="text-foreground">
            Portfolio URL
          </Label>
          <Input
            id="portfolio"
            type="url"
            placeholder="https://yourportfolio.com"
            value={links.portfolio || ""}
            onChange={(e) => updateLink("portfolio", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instagram" className="text-foreground">
            Instagram
          </Label>
          <Input
            id="instagram"
            type="text"
            placeholder="@yourusername or https://instagram.com/yourusername"
            value={links.instagram || ""}
            onChange={(e) => updateLink("instagram", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="facebook" className="text-foreground">
            Facebook
          </Label>
          <Input
            id="facebook"
            type="url"
            placeholder="https://facebook.com/yourprofile"
            value={links.facebook || ""}
            onChange={(e) => updateLink("facebook", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tiktok" className="text-foreground">
            TikTok
          </Label>
          <Input
            id="tiktok"
            type="text"
            placeholder="@yourusername"
            value={links.tiktok || ""}
            onChange={(e) => updateLink("tiktok", e.target.value)}
          />
        </div>
      </Card>

      <div className="mt-8 flex justify-between">
        <Button onClick={onBack} variant="outline">
          Back
        </Button>
        <Button
          onClick={onNext}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          Complete Profile
        </Button>
      </div>
    </div>
  );
}
