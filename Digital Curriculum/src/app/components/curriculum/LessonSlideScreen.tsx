/**
 * Learner-facing media image slide shown inside a fixed 16:9 "screen".
 * Slides are tall (PDF-dimension) renders, so the screen scrolls vertically.
 * Any links captured from the source slide render as clickable buttons below.
 */
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { ExternalLink, Download } from "lucide-react";
import type { SlidePopup, SlideLink } from "../../lib/curriculum";

interface LessonSlideScreenProps {
  src: string;
  alt?: string;
  popups?: SlidePopup[];
  links?: SlideLink[];
}

function isDownload(link: SlideLink): boolean {
  return /download|\.pdf|\.docx?|\.xlsx?|canvas|template/i.test(`${link.label} ${link.url}`);
}

export function LessonSlideScreen({
  src,
  alt = "Slide",
  popups = [],
  links = [],
}: LessonSlideScreenProps) {
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-2 md:p-3">
      {/* Viewer window — sized to the viewport height (not a fixed 16:9
          letterbox) so more of each tall slide is visible at once; vertical
          scroll for the rest. Content fills nearly the whole page (beta
          feedback: less scrolling, no decorative texture on the surface). */}
      <div className="relative w-full max-w-[1400px] h-[calc(100vh-150px)] min-h-[420px] overflow-hidden rounded-xl lesson-card-surface shadow-2xl ring-1 ring-black/10">
        <div className="absolute inset-0 overflow-y-auto">
          <div className="relative w-full">
            <img src={src} alt={alt} className="w-full block" draggable={false} />
            {popups.map((popup) => (
              <Popover
                key={popup.id}
                open={openPopupId === popup.id}
                onOpenChange={(open) => setOpenPopupId(open ? popup.id : null)}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg border-2 border-verse flex items-center justify-center text-xl hover:scale-110 transition-transform z-10"
                    style={{ left: `${popup.x_percent}%`, top: `${popup.y_percent}%` }}
                  >
                    {popup.emoji || "💬"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="max-w-xs z-[200]" side="top">
                  <p className="text-sm whitespace-pre-wrap">{popup.message}</p>
                </PopoverContent>
              </Popover>
            ))}
          </div>
        </div>
      </div>

      {links.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {links.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">
                {isDownload(link) ? (
                  <Download className="w-4 h-4" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                {link.label}
              </Button>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
