/**
 * Editor dialog for emoji popups on an image slide
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Trash2 } from "lucide-react";
import { SlideImageWithPopups } from "./SlideImageWithPopups";
import { EmojiPicker } from "./EmojiPicker";
import type { SlidePopup } from "../../lib/curriculum";

interface SlidePopupsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  imageAlt?: string;
  popups: SlidePopup[];
  onSave: (popups: SlidePopup[]) => void;
}

function newPopupId() {
  return `popup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function SlidePopupsEditor({
  open,
  onOpenChange,
  imageSrc,
  imageAlt,
  popups: initialPopups,
  onSave,
}: SlidePopupsEditorProps) {
  const [popups, setPopups] = useState<SlidePopup[]>(initialPopups);

  const handleOpenChange = (next: boolean) => {
    if (next) setPopups(initialPopups);
    onOpenChange(next);
  };

  const addPopupAt = (xPercent: number, yPercent: number) => {
    setPopups((prev) => [
      ...prev,
      {
        id: newPopupId(),
        emoji: "💡",
        x_percent: xPercent,
        y_percent: yPercent,
        message: "",
      },
    ]);
  };

  const updatePopup = (id: string, patch: Partial<SlidePopup>) => {
    setPopups((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removePopup = (id: string) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit emoji popups</DialogTitle>
        </DialogHeader>
        <SlideImageWithPopups
          src={imageSrc}
          alt={imageAlt}
          popups={popups}
          editMode
          onImageClick={addPopupAt}
        />
        {popups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center">
            No popups yet. Click the image above to add one.
          </p>
        ) : (
          <ul className="space-y-3">
            {popups.map((popup, index) => (
              <li key={popup.id} className="p-3 border border-border rounded-lg space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Popup {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removePopup(popup.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <EmojiPicker
                    value={popup.emoji}
                    onSelect={(emoji) => updatePopup(popup.id, { emoji })}
                    size="sm"
                  />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">X %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="w-16 h-8"
                      value={popup.x_percent}
                      onChange={(e) =>
                        updatePopup(popup.id, { x_percent: Number(e.target.value) })
                      }
                    />
                    <Label className="text-xs whitespace-nowrap">Y %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="w-16 h-8"
                      value={popup.y_percent}
                      onChange={(e) =>
                        updatePopup(popup.id, { y_percent: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Popup message</Label>
                  <Textarea
                    placeholder="Text shown when learners tap the emoji…"
                    value={popup.message}
                    onChange={(e) => updatePopup(popup.id, { message: e.target.value })}
                    rows={2}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSave(popups);
              onOpenChange(false);
            }}
          >
            Save popups
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
