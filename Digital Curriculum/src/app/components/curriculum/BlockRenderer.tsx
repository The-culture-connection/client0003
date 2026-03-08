/**
 * Shared block renderer components
 * Used by both preview and learner-facing lesson player
 */

import { Block, FontSize, ImageSize } from "../../lib/curriculum";
import { cn } from "../ui/utils";

// Font size mapping
const fontSizeMap: Record<FontSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
};

// Image size mapping
const imageSizeMap: Record<ImageSize, string> = {
  small: "w-32 h-32",
  medium: "w-48 h-48",
  large: "w-64 h-64",
  full: "w-full",
};

// Border radius mapping
const borderRadiusMap = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

interface BlockRendererProps {
  block: Block;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  switch (block.type) {
    case "text":
      return <TextBlockRenderer block={block} />;
    case "heading":
      return <HeadingBlockRenderer block={block} />;
    case "image":
      return <ImageBlockRenderer block={block} />;
    case "bullet_list":
      return <BulletListRenderer block={block} />;
    case "quote":
      return <QuoteBlockRenderer block={block} />;
    case "callout":
      return <CalloutBlockRenderer block={block} />;
    default:
      return null;
  }
}

function TextBlockRenderer({ block }: BlockRendererProps) {
  if (!block.content) return null;
  
  return (
    <p
      className={cn(
        fontSizeMap[block.font_size || "md"],
        block.font_weight === "bold" && "font-bold",
        block.font_weight === "semibold" && "font-semibold"
      )}
      style={{ color: block.color || "#fafcfc" }}
    >
      {block.content}
    </p>
  );
}

function HeadingBlockRenderer({ block }: BlockRendererProps) {
  if (!block.content) return null;
  
  const HeadingTag = block.font_size === "3xl" ? "h1" : block.font_size === "2xl" ? "h2" : "h3";
  
  return (
    <HeadingTag
      className={cn(
        fontSizeMap[block.font_size || "xl"],
        block.font_weight === "bold" && "font-bold",
        block.font_weight === "semibold" && "font-semibold"
      )}
      style={{ color: block.color || "#fafcfc" }}
    >
      {block.content}
    </HeadingTag>
  );
}

function ImageBlockRenderer({ block }: BlockRendererProps) {
  if (!block.image_url) {
    return (
      <div className="flex items-center justify-center border-2 border-dashed border-gray-600 p-8">
        <p className="text-gray-500 text-sm">No image uploaded</p>
      </div>
    );
  }
  
  return (
    <div
      className={cn(
        "flex",
        block.placement === "left" && "justify-start",
        block.placement === "right" && "justify-end",
        block.placement === "center" && "justify-center",
        block.placement === "full_width" && "w-full"
      )}
    >
      <img
        src={block.image_url}
        alt={block.alt_text || ""}
        className={cn(
          imageSizeMap[block.width || "medium"],
          "object-cover",
          borderRadiusMap[block.border_radius || "md"]
        )}
      />
    </div>
  );
}

function BulletListRenderer({ block }: BlockRendererProps) {
  if (!block.content) return null;
  
  const items = block.content.split("\n").filter((item) => item.trim());
  
  return (
    <ul className="list-disc list-inside space-y-2">
      {items.map((item, index) => (
        <li
          key={index}
          className={cn(
            fontSizeMap[block.font_size || "md"],
            block.font_weight === "bold" && "font-bold",
            block.font_weight === "semibold" && "font-semibold"
          )}
          style={{ color: block.color || "#fafcfc" }}
        >
          {item.trim()}
        </li>
      ))}
    </ul>
  );
}

function QuoteBlockRenderer({ block }: BlockRendererProps) {
  if (!block.content) return null;
  
  return (
    <blockquote
      className={cn(
        "border-l-4 border-accent pl-4 italic",
        fontSizeMap[block.font_size || "lg"]
      )}
      style={{ color: block.color || "#fafcfc" }}
    >
      {block.content}
    </blockquote>
  );
}

function CalloutBlockRenderer({ block }: BlockRendererProps) {
  if (!block.content) return null;
  
  return (
    <div
      className={cn(
        "bg-accent/20 border border-accent rounded-lg p-4",
        fontSizeMap[block.font_size || "md"]
      )}
      style={{ color: block.color || "#fafcfc" }}
    >
      {block.content}
    </div>
  );
}
