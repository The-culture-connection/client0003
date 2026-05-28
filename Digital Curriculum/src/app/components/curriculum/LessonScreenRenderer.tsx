/**
 * Immersive lesson screen — fullscreen dark, proportional scale-down only.
 */

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import type { SlidePopup } from "../../lib/curriculum";

export interface LessonScreenRendererProps {
  src: string;
  alt?: string;
  popups?: SlidePopup[];
  className?: string;
  editMode?: boolean;
  onImageClick?: (xPercent: number, yPercent: number) => void;
}

export function LessonScreenRenderer({
  src,
  alt = "Lesson screen",
  popups = [],
  className = "",
  editMode = false,
  onImageClick,
}: LessonScreenRendererProps) {
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
      className={`w-full h-full min-h-0 bg-black flex items-center justify-center overflow-hidden ${className}`}
    >
      <div
        className={`relative max-w-full max-h-full flex items-center justify-center ${editMode ? "cursor-crosshair" : ""}`}
        onClick={handleImageClick}
      >
        <img
          src={src}
          alt={alt}
          className="block max-w-full max-h-full w-auto h-auto object-contain"
          draggable={false}
          decoding="async"
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
    </div>
  );
}
