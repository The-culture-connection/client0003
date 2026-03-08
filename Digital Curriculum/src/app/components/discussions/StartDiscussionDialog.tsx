import { useState } from "react";
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
import { Textarea } from "../ui/textarea";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { DISCUSSION_CATEGORIES, type DiscussionCategory } from "../../lib/discussions";

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
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      const { createDiscussion } = await import("../../lib/discussions");
      createDiscussion(title.trim(), category, content.trim());
      
      // Reset form
      setCategory(undefined);
      setTitle("");
      setContent("");
      setStep("category");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating discussion:", error);
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
