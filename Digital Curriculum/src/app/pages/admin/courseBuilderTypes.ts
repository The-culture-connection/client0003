/** Shared draft types for Course Builder (surveys, slides). */

import type { LessonVideoProvider, SlidePopup } from "../../lib/curriculum";

export interface DraftSlide {
  type: "image" | "video";
  file?: File;
  imagePreviewUrl?: string;
  existingImageUrl?: string;
  existingStoragePath?: string;
  popups?: SlidePopup[];
  videoProvider?: LessonVideoProvider;
  videoId?: string;
  videoUrl?: string;
  videoFile?: File;
  videoPreviewUrl?: string;
  existingVideoUrl?: string;
  existingVideoStoragePath?: string;
  caption?: string;
}

export interface DraftLessonSurvey {
  id: string;
  /** -1 = end of lesson; otherwise 0-based slide index after which survey appears */
  afterSlideIndex: number;
  enabled: boolean;
  title?: string;
  surveyQuestions?: Array<{ question: string }>;
  generatePdfOnComplete?: boolean;
  dataroomFolderId?: string;
  surveyAiAnalysisEnabled?: boolean;
  surveyAiPrompt?: string;
  surveyAiCriteria?: string;
}

export function newDraftLessonSurvey(afterSlideIndex = -1): DraftLessonSurvey {
  return {
    id: `survey_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    afterSlideIndex,
    enabled: true,
    title: "",
    surveyQuestions: [],
    generatePdfOnComplete: false,
    surveyAiAnalysisEnabled: false,
    surveyAiPrompt: "",
    surveyAiCriteria: "",
  };
}
