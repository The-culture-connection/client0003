/**
 * YouTube video block for media lessons
 * Black full-page background, centered embed, optional caption
 */

interface YouTubeBlockProps {
  videoId: string;
  caption?: string;
  title?: string;
  className?: string;
}

export function YouTubeBlock({ videoId, caption, title, className = "" }: YouTubeBlockProps) {
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
        <iframe
          className="w-full h-full rounded-xl"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="Lesson video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {caption && (
        <p className="mt-4 max-w-3xl text-center text-sm md:text-base text-gray-300">
          {caption}
        </p>
      )}
    </div>
  );
}
