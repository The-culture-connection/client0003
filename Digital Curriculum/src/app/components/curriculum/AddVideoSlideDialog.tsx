/**
 * Dialog to add a video slide — upload from disk or paste a public link (YouTube, Canva, etc.)
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { classifyVideoUrl } from "../../lib/curriculum";

export interface VideoSlideInput {
  videoProvider: "youtube" | "hosted" | "external";
  videoId?: string;
  videoUrl?: string;
  videoFile?: File;
  caption?: string;
}

interface AddVideoSlideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (input: VideoSlideInput) => void;
}

export function AddVideoSlideDialog({ open, onOpenChange, onAdd }: AddVideoSlideDialogProps) {
  const [tab, setTab] = useState<"upload" | "link">("upload");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setVideoFile(null);
    setLinkUrl("");
    setCaption("");
    setError("");
    setTab("upload");
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = () => {
    setError("");
    if (tab === "upload") {
      if (!videoFile) {
        setError("Select a video file (MP4, WebM, or MOV).");
        return;
      }
      onAdd({
        videoProvider: "hosted",
        videoFile,
        caption: caption.trim() || undefined,
      });
      reset();
      onOpenChange(false);
      return;
    }

    const trimmed = linkUrl.trim();
    if (!trimmed) {
      setError("Paste a video link.");
      return;
    }
    const classified = classifyVideoUrl(trimmed);
    if (classified.provider === "youtube" && classified.videoId) {
      onAdd({
        videoProvider: "youtube",
        videoId: classified.videoId,
        videoUrl: trimmed,
        caption: caption.trim() || undefined,
      });
    } else {
      onAdd({
        videoProvider: "external",
        videoUrl: trimmed,
        caption: caption.trim() || undefined,
      });
    }
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add video slide</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "upload" | "link")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload file</TabsTrigger>
            <TabsTrigger value="link">Paste link</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Label>Video file</Label>
              <Input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                MP4, WebM, or MOV from your computer.
              </p>
            </div>
          </TabsContent>
          <TabsContent value="link" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Label>Video URL</Label>
              <Input
                placeholder="YouTube, Canva share link, or direct .mp4 URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                YouTube links embed in-player. Canva or other public video URLs play natively.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        <div className="space-y-2">
          <Label>Caption (optional)</Label>
          <Textarea
            placeholder="Short caption shown below the video"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Add video
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
