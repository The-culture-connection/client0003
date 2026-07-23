/**
 * Slide-anchored review notes side panel for the lesson player (admins only).
 *
 * Floating toggle button on the right edge opens a dark side panel listing
 * notes for the current lesson. New notes attach to the slide currently on
 * screen; each note can be marked resolved/unresolved and jumped to.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, StickyNote, X } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "../auth/AuthProvider";
import {
  addCourseReviewNote,
  listCourseReviewNotes,
  setCourseReviewNoteResolved,
  type CourseReviewNote,
} from "../../lib/courseReviewNotes";

interface AdminReviewNotesPanelProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  currentSlideIndex: number;
  onGoToSlide?: (slideIndex: number) => void;
}

export function AdminReviewNotesPanel({
  courseId,
  lessonId,
  lessonTitle,
  currentSlideIndex,
  onGoToSlide,
}: AdminReviewNotesPanelProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<CourseReviewNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setNotes(await listCourseReviewNotes(courseId, lessonId));
    } catch (e) {
      console.error("Failed to load review notes:", e);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, lessonId]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const openCount = notes.filter((n) => !n.resolved).length;
  const visibleNotes = showResolved ? notes : notes.filter((n) => !n.resolved);

  const handleAdd = async () => {
    const text = newNote.trim();
    if (!text || !user) return;
    setIsSaving(true);
    try {
      await addCourseReviewNote({
        courseId,
        lessonId,
        slideIndex: currentSlideIndex,
        note: text,
        authorUid: user.uid,
        authorName: user.displayName || user.email || "Admin",
      });
      setNewNote("");
      await refresh();
    } catch (e) {
      console.error("Failed to add review note:", e);
      alert("Couldn't save the note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleResolved = async (note: CourseReviewNote) => {
    if (!user) return;
    setTogglingId(note.id);
    try {
      await setCourseReviewNoteResolved(note.id, !note.resolved, user.uid);
      setNotes((prev) =>
        prev.map((n) =>
          n.id === note.id ? { ...n, resolved: !note.resolved } : n
        )
      );
    } catch (e) {
      console.error("Failed to update review note:", e);
    } finally {
      setTogglingId(null);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 top-24 z-50 flex items-center gap-2 rounded-full bg-amber-500 text-black px-4 py-2 text-sm font-medium shadow-lg hover:bg-amber-400"
        title="Admin review notes"
      >
        <StickyNote className="w-4 h-4" />
        Notes{openCount > 0 ? ` (${openCount})` : ""}
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 z-50 h-full w-80 max-w-[90vw] flex flex-col bg-gray-950 border-l border-gray-800 text-white shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-amber-400" />
            Review notes
          </p>
          <p className="text-xs text-gray-400 truncate max-w-[13rem]" title={lessonTitle}>
            {lessonTitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-1 rounded hover:bg-gray-800"
          title="Close notes"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-gray-800 space-y-2">
        <p className="text-xs text-gray-400">
          New note attaches to <span className="text-amber-400 font-medium">slide {currentSlideIndex + 1}</span> (the one on screen).
        </p>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="What should change on this slide?"
          rows={3}
          className="w-full rounded-md border border-gray-700 bg-gray-900 text-white text-sm px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={isSaving || newNote.trim().length === 0}
          className="bg-amber-500 hover:bg-amber-400 text-black w-full"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Add note
        </Button>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <p className="text-xs text-gray-400">
          {openCount} open · {notes.length - openCount} resolved
        </p>
        <button
          type="button"
          onClick={() => setShowResolved((v) => !v)}
          className="text-xs text-amber-400 hover:underline"
        >
          {showResolved ? "Hide resolved" : "Show resolved"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        ) : visibleNotes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No {showResolved ? "" : "open "}notes for this lesson yet.
          </p>
        ) : (
          visibleNotes.map((note) => (
            <div
              key={note.id}
              className={`rounded-lg border p-3 space-y-2 ${
                note.resolved
                  ? "border-gray-800 bg-gray-900/40 opacity-60"
                  : note.slideIndex === currentSlideIndex
                    ? "border-amber-500/60 bg-gray-900"
                    : "border-gray-700 bg-gray-900"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onGoToSlide?.(note.slideIndex)}
                  className="text-xs font-medium text-amber-400 hover:underline"
                  title="Go to this slide"
                >
                  Slide {note.slideIndex + 1}
                </button>
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={note.resolved}
                    disabled={togglingId === note.id}
                    onChange={() => handleToggleResolved(note)}
                    className="rounded border-gray-600"
                  />
                  Resolved
                </label>
              </div>
              <p className={`text-sm whitespace-pre-wrap ${note.resolved ? "line-through text-gray-500" : "text-gray-200"}`}>
                {note.note}
              </p>
              <p className="text-[11px] text-gray-500">
                {note.authorName}
                {note.createdAt?.toDate
                  ? ` · ${note.createdAt.toDate().toLocaleDateString()} ${note.createdAt
                      .toDate()
                      .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                  : ""}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
