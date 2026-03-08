/**
 * Shared slide renderer component
 * Used by both preview and learner-facing lesson player
 */

import { Slide, Block, LayoutType } from "../../lib/curriculum";
import { BlockRenderer } from "./BlockRenderer";
import { cn } from "../ui/utils";

interface SlideRendererProps {
  slide: Slide;
  blocks: Block[];
  className?: string;
}

export function SlideRenderer({ slide, blocks, className }: SlideRendererProps) {
  const backgroundColor = slide.background_color || "#000000";
  const textColor = "#fafcfc";
  
  // Get blocks sorted by order
  const sortedBlocks = [...blocks].sort((a, b) => (a.order || 0) - (b.order || 0));
  
  // Get title and body blocks based on layout
  const titleBlock = sortedBlocks.find((b) => b.type === "heading");
  const bodyBlocks = sortedBlocks.filter((b) => b.type !== "heading" && b.type !== "image");
  const imageBlocks = sortedBlocks.filter((b) => b.type === "image");
  
  return (
    <div
      className={cn("w-full h-full min-h-screen p-8 flex flex-col", className)}
      style={{ backgroundColor, color: textColor }}
    >
      <div
        className={cn(
          "flex-1 flex flex-col",
          slide.text_align === "center" && "items-center text-center",
          slide.text_align === "right" && "items-end text-right",
          slide.text_align === "justify" && "text-justify"
        )}
      >
        {renderLayout(slide.layout_type, {
          slide,
          titleBlock,
          bodyBlocks,
          imageBlocks,
          sortedBlocks,
        })}
      </div>
    </div>
  );
}

interface LayoutProps {
  slide: Slide;
  titleBlock?: Block;
  bodyBlocks: Block[];
  imageBlocks: Block[];
  sortedBlocks: Block[];
}

function renderLayout(layoutType: LayoutType, props: LayoutProps) {
  const { slide, titleBlock, bodyBlocks, imageBlocks, sortedBlocks } = props;
  
  switch (layoutType) {
    case "title_only":
      return (
        <div className="flex-1 flex items-center justify-center">
          {titleBlock && <BlockRenderer block={titleBlock} />}
          {slide.title && (
            <h1
              className={cn(
                "text-4xl font-bold",
                slide.title_font_size === "3xl" && "text-3xl",
                slide.title_font_size === "2xl" && "text-2xl",
                slide.title_font_size === "xl" && "text-xl"
              )}
            >
              {slide.title}
            </h1>
          )}
        </div>
      );
      
    case "text_only":
      return (
        <div className="flex-1 flex flex-col justify-center space-y-4">
          {bodyBlocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      );
      
    case "title_body":
      return (
        <div className="flex-1 flex flex-col justify-center space-y-6">
          {titleBlock && <BlockRenderer block={titleBlock} />}
          {slide.title && (
            <h1
              className={cn(
                "text-4xl font-bold",
                slide.title_font_size === "3xl" && "text-3xl",
                slide.title_font_size === "2xl" && "text-2xl",
                slide.title_font_size === "xl" && "text-xl"
              )}
            >
              {slide.title}
            </h1>
          )}
          <div className="space-y-4">
            {bodyBlocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
        </div>
      );
      
    case "title_left_image_right":
      return (
        <div className="flex-1 flex items-center gap-8">
          <div className="flex-1 space-y-6">
            {titleBlock && <BlockRenderer block={titleBlock} />}
            {slide.title && (
              <h1
                className={cn(
                  "text-4xl font-bold",
                  slide.title_font_size === "3xl" && "text-3xl",
                  slide.title_font_size === "2xl" && "text-2xl",
                  slide.title_font_size === "xl" && "text-xl"
                )}
              >
                {slide.title}
              </h1>
            )}
            <div className="space-y-4">
              {bodyBlocks.map((block) => (
                <BlockRenderer key={block.id} block={block} />
              ))}
            </div>
          </div>
          <div className="flex-1 flex justify-end">
            {imageBlocks[0] && <BlockRenderer block={imageBlocks[0]} />}
          </div>
        </div>
      );
      
    case "image_left_text_right":
      return (
        <div className="flex-1 flex items-center gap-8">
          <div className="flex-1 flex justify-start">
            {imageBlocks[0] && <BlockRenderer block={imageBlocks[0]} />}
          </div>
          <div className="flex-1 space-y-6">
            {titleBlock && <BlockRenderer block={titleBlock} />}
            {slide.title && (
              <h1
                className={cn(
                  "text-4xl font-bold",
                  slide.title_font_size === "3xl" && "text-3xl",
                  slide.title_font_size === "2xl" && "text-2xl",
                  slide.title_font_size === "xl" && "text-xl"
                )}
              >
                {slide.title}
              </h1>
            )}
            <div className="space-y-4">
              {bodyBlocks.map((block) => (
                <BlockRenderer key={block.id} block={block} />
              ))}
            </div>
          </div>
        </div>
      );
      
    case "full_image_with_caption":
      return (
        <div className="flex-1 flex flex-col justify-center items-center space-y-4">
          {imageBlocks[0] && <BlockRenderer block={imageBlocks[0]} />}
          {bodyBlocks[0] && (
            <div className="text-center">
              <BlockRenderer block={bodyBlocks[0]} />
            </div>
          )}
        </div>
      );
      
    case "two_column_text":
      return (
        <div className="flex-1 flex flex-col justify-center space-y-6">
          {titleBlock && <BlockRenderer block={titleBlock} />}
          {slide.title && (
            <h1
              className={cn(
                "text-4xl font-bold",
                slide.title_font_size === "3xl" && "text-3xl",
                slide.title_font_size === "2xl" && "text-2xl",
                slide.title_font_size === "xl" && "text-xl"
              )}
            >
              {slide.title}
            </h1>
          )}
          <div className="grid grid-cols-2 gap-8">
            {bodyBlocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
        </div>
      );
      
    case "bullet_list_with_image":
      return (
        <div className="flex-1 flex items-center gap-8">
          <div className="flex-1">
            {bodyBlocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
          <div className="flex-1 flex justify-end">
            {imageBlocks[0] && <BlockRenderer block={imageBlocks[0]} />}
          </div>
        </div>
      );
      
    case "centered_callout":
      return (
        <div className="flex-1 flex items-center justify-center">
          {bodyBlocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      );
      
    case "quote_slide":
      return (
        <div className="flex-1 flex items-center justify-center">
          {bodyBlocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      );
      
    default:
      // Fallback: render all blocks in order
      return (
        <div className="flex-1 flex flex-col justify-center space-y-4">
          {sortedBlocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      );
  }
}
