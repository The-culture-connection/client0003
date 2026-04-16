import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Textarea } from "../ui/textarea";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { DISCUSSION_CATEGORIES, type DiscussionCategory } from "../../lib/discussions";
import { useAuth } from "../auth/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { trackEvent } from "../../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";

interface StartDiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function StartDiscussionDialog({
  open,
  onOpenChange,
  onSuccess,
}: StartDiscussionDialogProps) {
  const [step, setStep] = useState<"category" | "question">("category");
  const [category, setCategory] = useState<DiscussionCategory | undefined>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postAnonymous, setPostAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDisplayName() {
      if (!user?.uid) {
        setDisplayName(null);
        return;
      }
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          if (!cancelled) setDisplayName(user.displayName || user.email || "User");
          return;
        }
        const data = snap.data() as any;
        const name =
          [data?.first_name, data?.last_name].filter(Boolean).join(" ") ||
          data?.display_name ||
          user.displayName ||
          user.email ||
          "User";
        if (!cancelled) setDisplayName(name);
      } catch {
        if (!cancelled) setDisplayName(user.displayName || user.email || "User");
      }
    }
    loadDisplayName();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const handleCategorySelect = (value: string) => {
    setCategory(value as DiscussionCategory);
  };

  const handleNext = () => {
    if (category) {
      setStep("question");
    }
  };

  const handleSubmit = async () => {
    if (!category || !title.trim() || !content.trim()) {
      return;
    }
    if (!user?.uid) {
      alert("Sign in to start a discussion.");
      return;
    }

    setLoading(true);
    try {
      const { createDiscussion } = await import("../../lib/discussions");
      await createDiscussion(title.trim(), category, content.trim(), user.uid, {
        isAnonymous: postAnonymous,
        authorName: displayName || undefined,
      });
      trackEvent(WEB_ANALYTICS_EVENTS.DISCUSSION_CREATE_SUBMIT_CLICKED, {
        category,
      });

      // Reset form
      setCategory(undefined);
      setTitle("");
      setContent("");
      setPostAnonymous(false);
      setStep("category");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating discussion:", error);
      trackEvent(WEB_ANALYTICS_EVENTS.DISCUSSION_CREATE_FAILED, {});
      alert("Failed to create discussion. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCategory(undefined);
    setTitle("");
    setContent("");
    setStep("category");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start a Discussion</DialogTitle>
          <DialogDescription>
            {step === "category"
              ? "First, select a category for your discussion"
              : "Now, write your question"}
          </DialogDescription>
        </DialogHeader>

        {step === "category" && (
          <div className="space-y-4 py-4">
            <RadioGroup value={category || ""} onValueChange={handleCategorySelect}>
              <div className="space-y-3">
                {DISCUSSION_CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <div
                      key={cat}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/50 hover:bg-muted/50"
                      }`}
                      onClick={() => handleCategorySelect(cat)}
                    >
                      <RadioGroupItem value={cat} id={cat} />
                      <Label
                        htmlFor={cat}
                        className="cursor-pointer text-foreground flex-1 font-medium"
                      >
                        {cat}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!category}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === "question" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-display" className="text-foreground">
                Category
              </Label>
              <Input
                id="category-display"
                value={category}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground">
                Question Title *
              </Label>
              <Input
                id="title"
                placeholder="What's your question?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-foreground">
                Question Details *
              </Label>
              <Textarea
                id="content"
                placeholder="Provide more context about your question..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="post-anonymous"
                checked={postAnonymous}
                onCheckedChange={(v) => setPostAnonymous(Boolean(v))}
              />
              <Label htmlFor="post-anonymous" className="cursor-pointer">
                Post anonymously (hide your name)
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep("category")}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || !content.trim() || loading}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {loading ? "Posting..." : "Post Discussion"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
