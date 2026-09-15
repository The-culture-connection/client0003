/**
 * Learner-facing media image slide shown inside a fixed 16:9 "screen".
 * Slides are tall (PDF-dimension) renders, so the screen scrolls vertically.
 * Any links captured from the source slide render as clickable buttons below.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { ExternalLink, Download, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { SlidePopup, SlideLink } from "../../lib/curriculum";
import {
  normalizeSlideLinkUrl,
  isDownloadLink,
  showsDownloadIcon,
} from "../../lib/slideLinks";

interface LessonSlideScreenProps {
  src: string;
  alt?: string;
  popups?: SlidePopup[];
  links?: SlideLink[];
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export function LessonSlideScreen({
  src,
  alt = "Slide",
  popups = [],
  links = [],
}: LessonSlideScreenProps) {
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);
  /**
   * Beta feedback (Aug 31, koree@ on a 411×771 phone, twice): "The text in the
   * paragraph is extremely small. Even with readers on, it was hard to read
   * without zooming in." Slides are rendered at deck width (~1920px) and were
   * always scaled to fit the viewport width, so on a phone the body copy landed
   * around 4pt. Learners can now zoom the slide itself rather than fighting the
   * browser's page zoom, which also fights the fixed player chrome.
   */
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const scrollRef = useRef<HTMLDivElement>(null);

  // A new slide should never inherit the previous slide's zoom or scroll.
  useEffect(() => {
    setZoom(MIN_ZOOM);
    setOpenPopupId(null);
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [src]);

  /**
   * Zoom about the centre of what the learner is currently looking at.
   *
   * The scroll re-anchoring runs OUTSIDE the setZoom updater on purpose: React
   * may call an updater twice under StrictMode, and an updater is required to
   * be pure, so scheduling a rAF from inside one is a bug waiting to happen.
   */
  const applyZoom = useCallback(
    (next: number) => {
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(next.toFixed(2))));
      if (clamped === zoom) return;

      const el = scrollRef.current;
      if (el) {
        const ratio = clamped / zoom;
        const centerX = el.scrollLeft + el.clientWidth / 2;
        const centerY = el.scrollTop + el.clientHeight / 2;
        // Re-anchor once the browser has laid the resized image out.
        requestAnimationFrame(() => {
          el.scrollTo({
            left: centerX * ratio - el.clientWidth / 2,
            top: centerY * ratio - el.clientHeight / 2,
          });
        });
      }
      setZoom(clamped);
    },
    [zoom]
  );

  const zoomedIn = zoom > MIN_ZOOM;
  /**
   * Resolve links up front and keep only the ones that will actually render.
   * `links.length > 0` was not the same question: a slide whose links are all
   * blank produced an empty button row AND still reserved 60px of viewport for
   * it — on exactly the small phones this component is trying to help.
   */
  const usableLinks = links
    .map((link) => ({ link, href: normalizeSlideLinkUrl(link?.url) }))
    .filter((entry) => entry.href);
  const hasLinks = usableLinks.length > 0;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-2 md:p-3">
      {/* Beta feedback: the slide's own "Download Here" call-out sits partway
          down a tall image, and the link buttons used to render below the
          viewer where they were easy to miss. They now sit at the TOP of the
          screen, above the slide, so the download is visible immediately. */}
      {hasLinks && (
        <div className="w-full max-w-[1400px] flex flex-wrap items-center justify-center gap-3">
          {usableLinks.map(({ link, href }, i) => (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              // Hints the browser to save rather than navigate. Ignored for
              // cross-origin hosts, which is why target="_blank" stays as the
              // fallback — either way the learner ends up with the file.
              {...(isDownloadLink(link) ? { download: "" } : {})}
            >
              <Button size="lg" className="gap-2 shadow-lg">
                {showsDownloadIcon(link) ? (
                  <Download className="w-4 h-4" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                {link.label?.trim() || href}
              </Button>
            </a>
          ))}
        </div>
      )}

      {/* Viewer window — sized to the viewport height (not a fixed 16:9
          letterbox) so more of each tall slide is visible at once; vertical
          scroll for the rest. Content fills nearly the whole page (beta
          feedback: less scrolling, no decorative texture on the surface). */}
      <div
        className={`relative w-full max-w-[1400px] min-h-[420px] overflow-hidden rounded-xl lesson-card-surface shadow-2xl ring-1 ring-black/10 ${
          hasLinks ? "h-[calc(100vh-210px)]" : "h-[calc(100vh-150px)]"
        }`}
      >
        <div
          ref={scrollRef}
          className={`absolute inset-0 overflow-y-auto ${zoomedIn ? "overflow-x-auto" : "overflow-x-hidden"}`}
          /**
           * Read by LessonPlayer's window-level arrow-key handler: while the
           * slide is zoomed, Left/Right must pan the slide rather than jump to
           * the next one, or a keyboard user cannot reach the right-hand side
           * of a zoomed slide at all.
           */
          data-slide-zoomed={zoomedIn ? "true" : undefined}
        >
          <div className="relative" style={{ width: `${zoom * 100}%` }}>
            <img
              src={src}
              alt={alt}
              className="w-full block"
              draggable={false}
              onDoubleClick={() => applyZoom(zoomedIn ? MIN_ZOOM : 2)}
            />
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

        {/* Zoom controls, pinned inside the viewer so they travel with the
            slide rather than colliding with the fixed Previous/Next bar. */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-full bg-background/85 backdrop-blur-sm border border-border shadow-lg p-1">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => applyZoom(zoom - ZOOM_STEP)}
            disabled={zoom <= MIN_ZOOM}
            className="flex items-center justify-center w-8 h-8 rounded-full text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs tabular-nums text-foreground w-10 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => applyZoom(zoom + ZOOM_STEP)}
            disabled={zoom >= MAX_ZOOM}
            className="flex items-center justify-center w-8 h-8 rounded-full text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {zoomedIn && (
            <button
              type="button"
              aria-label="Fit slide to width"
              onClick={() => applyZoom(MIN_ZOOM)}
              className="flex items-center justify-center w-8 h-8 rounded-full text-foreground hover:bg-muted transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
