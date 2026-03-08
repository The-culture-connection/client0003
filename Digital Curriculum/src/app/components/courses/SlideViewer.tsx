import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import { updatePageProgress, markCourseCompleted, calculateCourseProgress, getCourseProgress, type CourseProgress } from "../../lib/courseProgress";
import { type Course, type Module, type Lesson } from "../../lib/courses";
import { PDFViewer } from "./PDFViewer";

interface SlideViewerProps {
  course: Course;
  courseProgress: CourseProgress | null;
  userId: string;
  onProgressUpdate: (progress: CourseProgress | null) => void;
  onClose?: () => void;
}

export function SlideViewer({
  course,
  courseProgress,
  userId,
  onProgressUpdate,
  onClose,
}: SlideViewerProps) {
  // Flatten all lessons from all modules into a single array with module/lesson info
  const allSlides: Array<{
    module: Module;
    lesson: Lesson;
    moduleIndex: number;
    lessonIndex: number;
    globalIndex: number;
  }> = [];

  course.modules
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach((module, moduleIndex) => {
      module.lessons
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .forEach((lesson, lessonIndex) => {
          allSlides.push({
            module,
            lesson,
            moduleIndex,
            lessonIndex,
            globalIndex: allSlides.length,
          });
        });
    });

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [currentPageNumber, setCurrentPageNumber] = useState<Record<string, number>>({});
  const [totalPages, setTotalPages] = useState<Record<string, number>>({});

  // Initialize to first incomplete slide or first slide
  useEffect(() => {
    if (allSlides.length > 0) {
      if (courseProgress) {
        const firstIncompleteIndex = allSlides.findIndex((slide) => {
          const lessonId = slide.lesson.id || `${slide.module.order}_${slide.lesson.order}`;
          return !courseProgress.lessonsCompleted?.[lessonId];
        });
        if (firstIncompleteIndex !== -1) {
          setCurrentSlideIndex(firstIncompleteIndex);
        }
      } else {
        // No progress yet, start at first slide
        setCurrentSlideIndex(0);
      }
    }
  }, [courseProgress, allSlides.length]);

  // Initialize page numbers from progress
  useEffect(() => {
    if (courseProgress) {
      const pageNumbers: Record<string, number> = {};
      const totalPagesMap: Record<string, number> = {};
      
      allSlides.forEach((slide) => {
        const lessonId = slide.lesson.id || `${slide.module.order}_${slide.lesson.order}`;
        pageNumbers[lessonId] = courseProgress.pagesViewed?.[lessonId] || 1;
        totalPagesMap[lessonId] = courseProgress.totalPages?.[lessonId] || 0;
      });
      
      setCurrentPageNumber(pageNumbers);
      setTotalPages(totalPagesMap);
    }
  }, [courseProgress, allSlides]);

  const currentSlide = allSlides[currentSlideIndex];
  const totalSlides = allSlides.length;
  
  // Calculate total pages across all lessons
  const totalPagesCount = Object.values(totalPages).reduce((sum, pages) => sum + pages, 0);
  const viewedPagesCount = Object.entries(currentPageNumber).reduce((sum, [lessonId, pageNum]) => {
    const total = totalPages[lessonId] || 0;
    return sum + Math.min(pageNum, total);
  }, 0);
  // Fallback to lesson-based progress if no page data available
  const progressPercentage = totalPagesCount > 0 
    ? (viewedPagesCount / totalPagesCount) * 100 
    : (totalSlides > 0 ? ((currentSlideIndex + 1) / totalSlides) * 100 : 0);

  const getCurrentLessonId = () => {
    if (!currentSlide) return "";
    return currentSlide.lesson.id || `${currentSlide.module.order}_${currentSlide.lesson.order}`;
  };

  const getCurrentPage = () => {
    const lessonId = getCurrentLessonId();
    return currentPageNumber[lessonId] || 1;
  };

  const getCurrentTotalPages = () => {
    const lessonId = getCurrentLessonId();
    return totalPages[lessonId] || 0;
  };

  const isCurrentSlideCompleted = () => {
    if (!courseProgress || !currentSlide) return false;
    const lessonId = getCurrentLessonId();
    const viewed = courseProgress.pagesViewed?.[lessonId] || 0;
    const total = courseProgress.totalPages?.[lessonId] || 0;
    return total > 0 && viewed >= total;
  };

  const handlePageChange = async (pageNumber: number, totalPagesForLesson: number) => {
    if (!currentSlide) return;
    
    const lessonId = getCurrentLessonId();
    setCurrentPageNumber((prev) => ({
      ...prev,
      [lessonId]: pageNumber,
    }));
    setTotalPages((prev) => ({
      ...prev,
      [lessonId]: totalPagesForLesson,
    }));

    // Update progress in Firestore
    try {
      await updatePageProgress(userId, course.id!, lessonId, pageNumber, totalPagesForLesson);
      const updatedProgress = await getCourseProgress(userId, course.id!);
      onProgressUpdate(updatedProgress);

      // Check if all pages are viewed and mark course as complete
      if (updatedProgress) {
        const progressValue = calculateCourseProgress(course, updatedProgress);
        if (progressValue === 100) {
          await markCourseCompleted(userId, course.id!);
          const finalProgress = await getCourseProgress(userId, course.id!);
          onProgressUpdate(finalProgress);
        }
      }
    } catch (error) {
      console.error("Error updating page progress:", error);
    }
  };

  const handleNext = async () => {
    if (!currentSlide) return;
    
    const lessonId = getCurrentLessonId();
    const currentPage = getCurrentPage();
    const totalPagesForLesson = getCurrentTotalPages();

    // If there are more pages in current PDF, go to next page
    if (totalPagesForLesson > 0 && currentPage < totalPagesForLesson) {
      const nextPage = currentPage + 1;
      await handlePageChange(nextPage, totalPagesForLesson);
      return;
    }

    // Otherwise, move to next lesson
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      // Last slide - check if course is complete and close
      const updatedProgress = await getCourseProgress(userId, course.id!);
      if (updatedProgress) {
        const progressValue = calculateCourseProgress(course, updatedProgress);
        if (progressValue === 100) {
          await markCourseCompleted(userId, course.id!);
          const finalProgress = await getCourseProgress(userId, course.id!);
          onProgressUpdate(finalProgress);
        }
      }
      if (onClose) {
        onClose();
      }
    }
  };

  const handlePrevious = async () => {
    if (!currentSlide) return;
    
    const lessonId = getCurrentLessonId();
    const currentPage = getCurrentPage();
    const totalPagesForLesson = getCurrentTotalPages();

    // If not on first page of current PDF, go to previous page
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      await handlePageChange(prevPage, totalPagesForLesson);
      return;
    }

    // Otherwise, move to previous lesson
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  if (!currentSlide || totalSlides === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">No slides available.</p>
      </Card>
    );
  }

  const lessonId = getCurrentLessonId();
  const isCompleted = isCurrentSlideCompleted();

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                Module {currentSlide.module.order || currentSlide.moduleIndex + 1}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Lesson {currentSlide.lesson.order || currentSlide.lessonIndex + 1} of {currentSlide.module.lessons.length}
              </Badge>
              {isCompleted && (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {currentSlide.lesson.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentSlide.module.title}
            </p>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="ml-4"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-2 border-b border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              Slide {currentSlideIndex + 1} of {totalSlides}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Slide Content */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-muted/30">
          {currentSlide.lesson.slideUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              <PDFViewer
                url={currentSlide.lesson.slideUrl}
                initialPage={getCurrentPage()}
                onPageChange={handlePageChange}
                onNext={handleNext}
                onPrevious={handlePrevious}
                canGoNext={getCurrentPage() < getCurrentTotalPages() || currentSlideIndex < totalSlides - 1}
                canGoPrevious={getCurrentPage() > 1 || currentSlideIndex > 0}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Slide content not available</p>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentSlideIndex === 0 || isCompleting}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {currentSlideIndex + 1} / {totalSlides}
          </div>

          <Button
            onClick={handleNext}
            disabled={isCompleting}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isCompleting ? (
              "Saving..."
            ) : currentSlideIndex === totalSlides - 1 ? (
              <>
                Complete Course
                <CheckCircle2 className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
