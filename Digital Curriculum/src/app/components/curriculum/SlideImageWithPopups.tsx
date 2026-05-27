/**
 * Image slide with clickable emoji popups for learners
 */

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import type { SlidePopup } from "../../lib/curriculum";

interface SlideImageWithPopupsProps {
  src: string;
  alt?: string;
  popups?: SlidePopup[];
  className?: string;
  /** When true, clicking the image adds a popup (builder mode) */
  editMode?: boolean;
  onImageClick?: (xPercent: number, yPercent: number) => void;
}

export function SlideImageWithPopups({
  src,
  alt = "Slide",
  popups = [],
  className = "",
  editMode = false,
  onImageClick,
}: SlideImageWithPopupsProps) {
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editMode || !onImageClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPercent = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    onImageClick(
      Math.min(95, Math.max(5, xPercent)),
      Math.min(95, Math.max(5, yPercent))
    );
  };

  return (
    <div
      className={`relative w-full min-h-[400px] bg-black flex items-center justify-center p-6 ${className}`}
    >
      <div
        className={`relative inline-block max-w-full ${editMode ? "cursor-crosshair" : ""}`}
        onClick={handleImageClick}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[70vh] object-contain block"
          draggable={false}
        />
        {popups.map((popup) => (
          <Popover
            key={popup.id}
            open={!editMode && openPopupId === popup.id}
            onOpenChange={(open) => setOpenPopupId(open ? popup.id : null)}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg border-2 border-accent flex items-center justify-center text-xl hover:scale-110 transition-transform z-10"
                style={{
                  left: `${popup.x_percent}%`,
                  top: `${popup.y_percent}%`,
                }}
                onClick={(e) => {
                  if (editMode) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                {popup.emoji || "💬"}
              </button>
            </PopoverTrigger>
            {!editMode && (
              <PopoverContent className="max-w-xs z-[200]" side="top">
                <p className="text-sm whitespace-pre-wrap">{popup.message}</p>
              </PopoverContent>
            )}
          </Popover>
        ))}
      </div>
      {editMode && (
        <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          Click the image to place a popup
        </p>
      )}
    </div>
  );
}
