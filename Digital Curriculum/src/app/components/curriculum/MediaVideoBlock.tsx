/**
 * Video block for media lessons — YouTube embed, hosted file, or external URL (e.g. Canva CDN)
 */

import { YouTubeBlock } from "./YouTubeBlock";
import type { LessonVideoProvider } from "../../lib/curriculum";

interface MediaVideoBlockProps {
  videoProvider?: LessonVideoProvider;
  videoId?: string;
  videoUrl?: string;
  caption?: string;
  title?: string;
  className?: string;
}

export function MediaVideoBlock({
  videoProvider,
  videoId,
  videoUrl,
  caption,
  title,
  className = "",
}: MediaVideoBlockProps) {
  const provider = videoProvider ?? (videoId ? "youtube" : videoUrl ? "external" : undefined);

  if (provider === "youtube" && videoId) {
    return (
      <YouTubeBlock
        videoId={videoId}
        caption={caption}
        title={title}
        className={className}
      />
    );
  }

  if ((provider === "hosted" || provider === "external") && videoUrl) {
    return (
      <div
        className={`w-full min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 py-10 ${className}`}
      >
        {title && (
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-4 text-center">
            {title}
          </h2>
        )}
        <div className="w-full max-w-5xl aspect-video">
          <video
            className="w-full h-full rounded-xl bg-black"
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
          >
            Your browser does not support video playback.
          </video>
        </div>
        {caption && (
          <p className="mt-4 max-w-3xl text-center text-sm md:text-base text-gray-300">
            {caption}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full min-h-[400px] bg-black flex items-center justify-center p-8">
      <p className="text-gray-400">Video unavailable</p>
    </div>
  );
}
