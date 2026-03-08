/**
 * Learner-facing Lesson Player
 * Displays published lessons slide by slide
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { getSlides, getBlocks, getLesson, getLessonImages, type Slide, type Block, type Lesson, type LessonImage } from "../../lib/curriculum";
import { SlideRenderer } from "../../components/curriculum/SlideRenderer";
import { Button } from "../../components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Loader2 } from "lucide-react";

export function LessonPlayer() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [lessonImages, setLessonImages] = useState<LessonImage[]>([]);
  const [slideBlocks, setSlideBlocks] = useState<Record<string, Block[]>>({});
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isImageLesson = lesson?.content_type === "images";
  const itemCount = isImageLesson ? lessonImages.length : slides.length;

  // Extract IDs from lesson (assuming lessonId format includes all IDs or we need to pass them)
  // For now, we'll need to modify this to work with the actual route structure
  // This is a simplified version - you may need to adjust based on your routing needs
  
  useEffect(() => {
    if (!lessonId) {
      setError("Lesson ID is required");
      setIsLoading(false);
      return;
    }

    const loadLesson = async () => {
      try {
        // Get lesson from route params - we need curriculumId, moduleId, chapterId
        // For now, we'll get them from the URL or pass them as route params
        // Update route to: /learn/lesson/:curriculumId/:moduleId/:chapterId/:lessonId
        const params = new URLSearchParams(window.location.search);
        const curriculumId = params.get("curriculumId");
        const moduleId = params.get("moduleId");
        const chapterId = params.get("chapterId");

        if (!curriculumId || !moduleId || !chapterId) {
          setError("Missing required lesson parameters");
          setIsLoading(false);
          return;
        }

        // Load lesson
        const lessonData = await getLesson(curriculumId, moduleId, chapterId, lessonId);
        if (!lessonData || !lessonData.is_published) {
          setError("Lesson not found or not published");
          setIsLoading(false);
          return;
        }
        setLesson(lessonData);

        if (lessonData.content_type === "images") {
          const images = await getLessonImages(curriculumId, moduleId, chapterId, lessonId);
          setLessonImages(images);
        } else {
          const slidesData = await getSlides(curriculumId, moduleId, chapterId, lessonId);
          setSlides(slidesData);
          const blocksMap: Record<string, Block[]> = {};
          for (const slide of slidesData) {
            if (slide.id) {
              const blocks = await getBlocks(curriculumId, moduleId, chapterId, lessonId, slide.id);
              blocksMap[slide.id] = blocks;
            }
          }
          setSlideBlocks(blocksMap);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error loading lesson:", err);
        setError("Failed to load lesson");
        setIsLoading(false);
      }
    };

    loadLesson();
  }, [lessonId]);

  const currentSlide = slides[currentSlideIndex];
  const currentBlocks = currentSlide ? slideBlocks[currentSlide.id || ""] || [] : [];
  const currentImage = isImageLesson ? lessonImages[currentSlideIndex] : null;

  const handleNext = () => {
    if (currentSlideIndex < itemCount - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
      window.scrollTo(0, 0);
    }
  };

  const progress = itemCount > 0 ? ((currentSlideIndex + 1) / itemCount) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!lesson || itemCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-muted-foreground">
          {!lesson ? "Lesson not found or not published" : "Lesson has no content"}
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <X className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">{lesson.title}</h1>
          </div>
          <div className="text-sm text-gray-400">
            {currentSlideIndex + 1} of {itemCount}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 bg-gray-800">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Slide Content */}
      <div className="min-h-[calc(100vh-80px)]">
        {isImageLesson && currentImage ? (
          <div className="w-full h-full flex items-center justify-center p-8">
            <img
              src={currentImage.image_url}
              alt={currentImage.alt_text || `Slide ${currentSlideIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : currentSlide ? (
          <SlideRenderer slide={currentSlide} blocks={currentBlocks} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No content</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
        <Button
          variant="secondary"
          size="lg"
          onClick={handlePrevious}
          disabled={currentSlideIndex === 0}
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Previous
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={handleNext}
          disabled={currentSlideIndex === itemCount - 1}
        >
          Next
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
