import { useEffect, useRef } from "react";
import type { LessonContentSlide, LessonImage } from "../lib/curriculum";

type PreloadSource =
  | { kind: "media"; items: LessonContentSlide[] }
  | { kind: "images"; items: LessonImage[] };

function preloadUrl(url: string, cache: Set<string>) {
  if (!url || cache.has(url)) return;
  cache.add(url);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

export function useLessonScreenPreload(source: PreloadSource | null, currentIndex: number) {
  const cacheRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!source) return;
    const cache = cacheRef.current;
    for (const i of [currentIndex + 1, currentIndex + 2]) {
      if (i < 0 || i >= source.items.length) continue;
      if (source.kind === "media") {
        const screen = source.items[i];
        if (screen?.type === "image" && screen.image_url) {
          preloadUrl(screen.image_url, cache);
        }
      } else if (source.items[i]?.image_url) {
        preloadUrl(source.items[i].image_url!, cache);
      }
    }
  }, [source, currentIndex]);
}
