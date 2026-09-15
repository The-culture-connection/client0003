/**
 * Editor dialog for the clickable link buttons attached to an image slide.
 *
 * Beta feedback (Aug 22 / Aug 31, three separate testers): slides that show a
 * "Download Here" or "Visit SCORE" call-to-action are flat PNG renders, so the
 * button painted into the image does nothing when tapped. LessonSlideScreen has
 * always been able to render real link buttons above the slide, but nothing in
 * the app ever WROTE `LessonContentSlide.links`, so every slide shipped with
 * `links: undefined` and no buttons appeared. This dialog is the missing half.
 */

import { useId, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Trash2, Plus, Download, ExternalLink, AlertCircle } from "lucide-react";
import type { SlideLink } from "../../lib/curriculum";
import { normalizeSlideLinkUrl, showsDownloadIcon } from "../../lib/slideLinks";

interface SlideLinksEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc?: string;
  imageAlt?: string;
  links: SlideLink[];
  onSave: (links: SlideLink[]) => void;
}

function linkProblem(link: SlideLink): string | null {
  const label = (link?.label ?? "").trim();
  const rawUrl = (link?.url ?? "").trim();
  if (!label) return "Give the button a label learners will recognise.";
  if (!rawUrl) return "Add the destination URL.";

  const normalized = normalizeSlideLinkUrl(rawUrl);
  // normalizeSlideLinkUrl returns "" for a scheme that is not allowed.
  if (!normalized) {
    return "Only http, https, mailto and tel links can be used here.";
  }
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      if (!parsed.hostname.includes(".")) return "That does not look like a valid web address.";
    } catch {
      return "That does not look like a valid web address.";
    }
  }
  return null;
}

export function SlideLinksEditor({
  open,
  onOpenChange,
  imageSrc,
  imageAlt,
  links: initialLinks,
  onSave,
}: SlideLinksEditorProps) {
  /**
   * Seeded once per mount. The parent mounts this dialog conditionally and
   * passes a `key` per slide, so a different slide always gets a fresh
   * component — there is no open/close cycle to re-sync from. Do not hoist this
   * to an always-mounted position without adding that sync back.
   */
  const [links, setLinks] = useState<SlideLink[]>(initialLinks);
  const fieldId = useId();

  const addLink = () => setLinks((prev) => [...prev, { label: "", url: "" }]);

  const updateLink = (index: number, patch: Partial<SlideLink>) =>
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const removeLink = (index: number) =>
    setLinks((prev) => prev.filter((_, i) => i !== index));

  // Blank rows are dropped rather than blocking the save — an admin who adds a
  // row and changes their mind should not have to hunt for the delete button.
  const savableLinks = links
    .filter((l) => (l?.label ?? "").trim() || (l?.url ?? "").trim())
    .map((l) => ({
      label: (l?.label ?? "").trim(),
      url: normalizeSlideLinkUrl(l?.url),
    }));
  const hasBlocking = savableLinks.some((l) => linkProblem(l) !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit slide link buttons</DialogTitle>
          <DialogDescription>
            A "Download Here" or "Visit …" button drawn into the slide image is not
            clickable. Add it here and it renders as a real button above the slide.
          </DialogDescription>
        </DialogHeader>

        {imageSrc && (
          <img
            src={imageSrc}
            alt={imageAlt ?? "Slide"}
            className="w-full rounded-lg border border-border max-h-64 object-contain bg-black/40"
          />
        )}

        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No link buttons on this slide yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {links.map((link, index) => {
              const hasAnyInput = Boolean(
                (link?.label ?? "").trim() || (link?.url ?? "").trim()
              );
              const problem = hasAnyInput ? linkProblem(link) : null;
              const preview = normalizeSlideLinkUrl(link?.url);
              return (
                <li key={index} className="p-3 border border-border rounded-lg space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      {showsDownloadIcon(link) ? (
                        <Download className="w-4 h-4" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      Button {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      aria-label={`Remove link button ${index + 1}`}
                      onClick={() => removeLink(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`${fieldId}-label-${index}`}>
                      Button label
                    </Label>
                    <Input
                      id={`${fieldId}-label-${index}`}
                      placeholder="Download Here"
                      value={link?.label ?? ""}
                      onChange={(e) => updateLink(index, { label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`${fieldId}-url-${index}`}>
                      Destination URL
                    </Label>
                    <Input
                      id={`${fieldId}-url-${index}`}
                      placeholder="https://www.score.org/"
                      value={link?.url ?? ""}
                      onChange={(e) => updateLink(index, { url: e.target.value })}
                    />
                    {preview && preview !== (link?.url ?? "").trim() && (
                      <p className="text-xs text-muted-foreground">Saved as {preview}</p>
                    )}
                  </div>
                  {problem && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {problem}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addLink}>
          <Plus className="w-4 h-4" />
          Add link button
        </Button>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={hasBlocking}
            onClick={() => {
              onSave(savableLinks);
              onOpenChange(false);
            }}
          >
            Save links
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
