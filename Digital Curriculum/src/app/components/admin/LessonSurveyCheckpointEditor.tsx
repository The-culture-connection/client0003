/**
 * Editor for one in-lesson survey checkpoint (placement, questions, PDF, AI).
 */

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Trash2 } from "lucide-react";
import { DATAROOM_FOLDER_OPTIONS } from "../../lib/dataroomFolders";
import type { DraftLessonSurvey } from "../../pages/admin/courseBuilderTypes";

interface LessonSurveyCheckpointEditorProps {
  survey: DraftLessonSurvey;
  slideCount: number;
  activeQuestionIndex: number;
  onActiveQuestionIndexChange: (index: number) => void;
  onChange: (patch: Partial<DraftLessonSurvey>) => void;
  onRemove: () => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (qIndex: number) => void;
  onUpdateQuestion: (qIndex: number, value: string) => void;
}

export function LessonSurveyCheckpointEditor({
  survey,
  slideCount,
  activeQuestionIndex,
  onActiveQuestionIndexChange,
  onChange,
  onRemove,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
}: LessonSurveyCheckpointEditorProps) {
  const questions = survey.surveyQuestions ?? [];
  const editIx = Math.min(Math.max(0, activeQuestionIndex), Math.max(0, questions.length - 1));
  const currentQ = questions[editIx];

  const placementOptions: { value: number; label: string }[] = [];
  for (let i = 0; i < Math.max(1, slideCount); i++) {
    placementOptions.push({ value: i, label: `After slide ${i + 1}` });
  }
  placementOptions.push({ value: -1, label: "End of lesson (after last slide)" });

  return (
    <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Label className="text-xs">Show survey</Label>
          <select
            value={survey.afterSlideIndex}
            onChange={(e) => onChange({ afterSlideIndex: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
          >
            {placementOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onRemove}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Survey name (shown to learners)</Label>
        <Input
          placeholder="e.g. Quick check-in"
          value={survey.title ?? ""}
          onChange={(e) => onChange({ title: e.target.value })}
          className="text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`survey-pdf-${survey.id}`}
          checked={survey.generatePdfOnComplete ?? false}
          onChange={(e) =>
            onChange({
              generatePdfOnComplete: e.target.checked,
              dataroomFolderId: e.target.checked ? survey.dataroomFolderId : undefined,
            })
          }
          className="rounded border-border"
        />
        <Label htmlFor={`survey-pdf-${survey.id}`} className="cursor-pointer text-xs">
          Generate PDF in Data Room when submitted
        </Label>
      </div>

      {survey.generatePdfOnComplete && (
        <div className="space-y-1">
          <Label className="text-xs">Data Room folder (required)</Label>
          <select
            value={survey.dataroomFolderId ?? ""}
            onChange={(e) => onChange({ dataroomFolderId: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
          >
            <option value="" disabled>
              Select a folder
            </option>
            {DATAROOM_FOLDER_OPTIONS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-3 rounded-md border border-border p-3 bg-muted/10">
        <Label className="text-xs font-medium">Optional: AI survey analysis</Label>
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id={`survey-ai-${survey.id}`}
            disabled={questions.length === 0}
            checked={survey.surveyAiAnalysisEnabled ?? false}
            onChange={(e) => onChange({ surveyAiAnalysisEnabled: e.target.checked })}
            className="rounded border-border mt-0.5"
          />
          <Label htmlFor={`survey-ai-${survey.id}`} className="cursor-pointer text-xs font-normal">
            Enable AI analysis for this survey
          </Label>
        </div>
        {survey.surveyAiAnalysisEnabled && questions.length > 0 ? (
          <>
            <Textarea
              placeholder="AI facilitator prompt"
              value={survey.surveyAiPrompt ?? ""}
              onChange={(e) => onChange({ surveyAiPrompt: e.target.value })}
              rows={2}
              className="text-sm"
            />
            <Textarea
              placeholder="Criteria / rubric"
              value={survey.surveyAiCriteria ?? ""}
              onChange={(e) => onChange({ surveyAiCriteria: e.target.value })}
              rows={2}
              className="text-sm"
            />
          </>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Questions</Label>
          <Button type="button" variant="outline" size="sm" onClick={onAddQuestion}>
            Add question
          </Button>
        </div>
        {questions.length > 0 ? (
          <>
            <select
              value={editIx}
              onChange={(e) => onActiveQuestionIndexChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
            >
              {questions.map((_, i) => (
                <option key={i} value={i}>
                  Question {i + 1}
                </option>
              ))}
            </select>
            {currentQ ? (
              <div className="flex gap-2">
                <Textarea
                  placeholder="Open-ended question"
                  value={currentQ.question}
                  onChange={(e) => onUpdateQuestion(editIx, e.target.value)}
                  rows={2}
                  className="text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => onRemoveQuestion(editIx)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Add at least one question.</p>
        )}
      </div>
    </div>
  );
}
