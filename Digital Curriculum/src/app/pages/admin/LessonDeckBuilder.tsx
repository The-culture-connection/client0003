/**
 * Admin Lesson Deck Builder
 * Main page for creating and editing lesson slides
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useAuth } from "../../components/auth/AuthProvider";
import {
  getLesson,
  getSlides,
  getBlocks,
  createSlide,
  updateSlide,
  deleteSlide,
  createBlock,
  updateBlock,
  deleteBlock,
  reorderSlides,
  reorderBlocks,
  updateLesson,
  publishLesson,
  uploadLessonImage,
  type Lesson,
  type Slide,
  type Block,
  type LayoutType,
  type BlockType,
} from "../../lib/curriculum";
import { SlideRenderer } from "../../components/curriculum/SlideRenderer";
import { DraggableBlockList } from "./DraggableBlockList";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import {
  Plus,
  Trash2,
  Save,
  Eye,
  ChevronUp,
  ChevronDown,
  Copy,
  Upload,
  Loader2,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

type DeviceView = "desktop" | "tablet" | "mobile";

export function LessonDeckBuilder() {
  return (
    <DndProvider backend={HTML5Backend}>
      <LessonDeckBuilderContent />
    </DndProvider>
  );
}

function LessonDeckBuilderContent() {
  const { curriculumId, moduleId, chapterId, lessonId } = useParams<{
    curriculumId: string;
    moduleId: string;
    chapterId: string;
    lessonId: string;
  }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [selectedSlide, setSelectedSlide] = useState<Slide | null>(null);
  const [slideBlocks, setSlideBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [deviceView, setDeviceView] = useState<DeviceView>("desktop");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load lesson data
  useEffect(() => {
    if (!curriculumId || !moduleId || !chapterId || !lessonId) return;

    const loadData = async () => {
      try {
        const lessonData = await getLesson(curriculumId, moduleId, chapterId, lessonId);
        if (lessonData) {
          setLesson(lessonData);
          
          // Show import status if this is an imported lesson
          if (lessonData.import_status === "processing") {
            // Poll for status update
            const checkStatus = setInterval(async () => {
              const updated = await getLesson(curriculumId, moduleId, chapterId, lessonId);
              if (updated && updated.import_status !== "processing") {
                clearInterval(checkStatus);
                setLesson(updated);
              }
            }, 2000);
            
            return () => clearInterval(checkStatus);
          }
        }

        const slidesData = await getSlides(curriculumId, moduleId, chapterId, lessonId);
        setSlides(slidesData);

        if (slidesData.length > 0 && !selectedSlideId) {
          setSelectedSlideId(slidesData[0].id || null);
        }
      } catch (error) {
        console.error("Error loading lesson data:", error);
      }
    };

    loadData();
  }, [curriculumId, moduleId, chapterId, lessonId, selectedSlideId]);

  // Load blocks for selected slide
  useEffect(() => {
    if (!curriculumId || !moduleId || !chapterId || !lessonId || !selectedSlideId) {
      setSlideBlocks([]);
      setSelectedSlide(null);
      return;
    }

    const loadSlideData = async () => {
      try {
        const slide = slides.find((s) => s.id === selectedSlideId);
        setSelectedSlide(slide || null);

        const blocks = await getBlocks(curriculumId, moduleId, chapterId, lessonId, selectedSlideId);
        setSlideBlocks(blocks);
      } catch (error) {
        console.error("Error loading slide data:", error);
      }
    };

    loadSlideData();
  }, [curriculumId, moduleId, chapterId, lessonId, selectedSlideId, slides]);

  const handleAddSlide = async () => {
    if (!curriculumId || !moduleId || !chapterId || !lessonId) return;

    try {
      const newOrder = slides.length;
      const slideId = await createSlide(
        curriculumId,
        moduleId,
        chapterId,
        lessonId,
        newOrder
      );
      
      const updatedSlides = await getSlides(curriculumId, moduleId, chapterId, lessonId);
      setSlides(updatedSlides);
      setSelectedSlideId(slideId);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("Error creating slide:", error);
    }
  };

  const handleDeleteSlide = async (slideId: string) => {
    if (!curriculumId || !moduleId || !chapterId || !lessonId) return;
    if (!confirm("Are you sure you want to delete this slide?")) return;

    try {
      await deleteSlide(curriculumId, moduleId, chapterId, lessonId, slideId);
      const updatedSlides = await getSlides(curriculumId, moduleId, chapterId, lessonId);
      setSlides(updatedSlides);
      
      if (selectedSlideId === slideId) {
        setSelectedSlideId(updatedSlides[0]?.id || null);
      }
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("Error deleting slide:", error);
    }
  };

  const handleUpdateSlide = async (updates: Partial<Slide>) => {
    if (!curriculumId || !moduleId || !chapterId || !lessonId || !selectedSlideId) return;

    try {
      await updateSlide(curriculumId, moduleId, chapterId, lessonId, selectedSlideId, updates);
      
      const updatedSlides = await getSlides(curriculumId, moduleId, chapterId, lessonId);
      setSlides(updatedSlides);
      setSelectedSlide(updatedSlides.find((s) => s.id === selectedSlideId) || null);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("Error updating slide:", error);
    }
  };

  const handleAddBlock = async (type: BlockType) => {
    if (!curriculumId || !moduleId || !chapterId || !lessonId || !selectedSlideId) return;

    try {
      const newOrder = slideBlocks.length;
      await createBlock(
        curriculumId,
        moduleId,
        chapterId,
        lessonId,
        selectedSlideId,
        type,
        newOrder
      );
      
      const updatedBlocks = await getBlocks(
        curriculumId,
        moduleId,
        chapterId,
        lessonId,
        selectedSlideId
      );
      setSlideBlocks(updatedBlocks);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("Error creating block:", error);
    }
  };

  const handleUpdateBlock = async (blockId: string, updates: Partial<Block>) => {
    if (!curriculumId || !moduleId || !chapterId || !lessonId || !selectedSlideId) return;

    try {
      await updateBlock(
        curriculumId,
        moduleId,
        chapterId,
        lessonId,
        selectedSlideId,
        blockId,
        updates
      );
      
      const updatedBlocks = await getBlocks(
        curriculumId,
        moduleId,
        chapterId,
        lessonId,
        selectedSlideId
      );
      setSlideBlocks(updatedBlocks);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("Error updating block:", error);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!curriculumId || !moduleId || !chapterId || !lessonId || !selectedSlideId) return;

    try {
      await deleteBlock(curriculumId, moduleId, chapterId, lessonId, selectedSlideId, blockId);
      
      const updatedBlocks = await getBlocks(
        curriculumId,
        moduleId,
        chapterId,
        lessonId,
        selectedSlideId
      );
      setSlideBlocks(updatedBlocks);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("Error deleting block:", error);
    }
  };

  const handleSaveDraft = async () => {
    if (!curriculumId || !moduleId || !chapterId || !lessonId) return;

    setIsSaving(true);
    try {
      // Update lesson's updated_at timestamp
      await updateLesson(curriculumId, moduleId, chapterId, lessonId, {});
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving draft:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!curriculumId || !moduleId || !chapterId || !lessonId) return;
    if (!confirm("Publish this lesson? It will be visible to learners.")) return;

    try {
      await publishLesson(curriculumId, moduleId, chapterId, lessonId);
      const updatedLesson = await getLesson(curriculumId, moduleId, chapterId, lessonId);
      if (updatedLesson) {
        setLesson(updatedLesson);
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error publishing lesson:", error);
    }
  };

  if (!lesson) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel - Editor */}
      <div className="w-1/2 border-r border-border overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Lesson Metadata */}
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Lesson Settings</h2>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={lesson.title}
                  onChange={(e) => {
                    setLesson({ ...lesson, title: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  onBlur={() => {
                    if (curriculumId && moduleId && chapterId && lessonId) {
                      updateLesson(curriculumId, moduleId, chapterId, lessonId, {
                        title: lesson.title,
                      });
                    }
                  }}
                />
              </div>
            </div>
          </Card>

          {/* Slide List */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Slides</h2>
              <Button onClick={handleAddSlide} className="bg-accent hover:bg-accent/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Slide
              </Button>
            </div>

            {slides.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No slides yet. Add your first slide to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`
                      p-3 border rounded-lg cursor-pointer transition-colors
                      ${selectedSlideId === slide.id ? "border-accent bg-accent/10" : "border-border"}
                    `}
                    onClick={() => setSelectedSlideId(slide.id || null)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Slide {index + 1}</span>
                        <span className="text-xs text-muted-foreground">
                          {slideBlocks.length} block{slideBlocks.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (slide.id) handleDeleteSlide(slide.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Slide Editor */}
          {selectedSlide && (
            <SlideEditorPanel
              slide={selectedSlide}
              blocks={slideBlocks}
              onUpdateSlide={handleUpdateSlide}
              onAddBlock={handleAddBlock}
              onUpdateBlock={handleUpdateBlock}
              onDeleteBlock={handleDeleteBlock}
              onUploadImage={async (file) => {
                if (!curriculumId || !moduleId || !chapterId || !lessonId || !selectedSlideId) {
                  throw new Error("Missing required IDs");
                }
                return uploadLessonImage(
                  file,
                  curriculumId,
                  moduleId,
                  chapterId,
                  lessonId,
                  selectedSlideId
                );
              }}
            />
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 sticky bottom-0 bg-background pt-4 pb-4">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSaving || !hasUnsavedChanges}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Draft
            </Button>
            <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
              <Eye className="w-4 h-4 mr-2" />
              Preview Lesson
            </Button>
            <Button onClick={handlePublish} disabled={lesson.is_published}>
              Publish
            </Button>
          </div>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="w-1/2 bg-gray-900 overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 z-10">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Preview</h3>
            <div className="flex gap-2">
              <Button
                variant={deviceView === "desktop" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDeviceView("desktop")}
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                variant={deviceView === "tablet" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDeviceView("tablet")}
              >
                <Tablet className="w-4 h-4" />
              </Button>
              <Button
                variant={deviceView === "mobile" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDeviceView("mobile")}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div
          className={`
            p-8 transition-all
            ${deviceView === "desktop" && "max-w-full"}
            ${deviceView === "tablet" && "max-w-2xl mx-auto"}
            ${deviceView === "mobile" && "max-w-sm mx-auto"}
          `}
        >
          {selectedSlide ? (
            <SlideRenderer slide={selectedSlide} blocks={slideBlocks} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Select a slide to preview</p>
            </div>
          )}
        </div>
      </div>

      {/* Full Lesson Preview Modal */}
      {isPreviewOpen && lessonId && (
        <LessonPreviewModal
          curriculumId={curriculumId!}
          moduleId={moduleId!}
          chapterId={chapterId!}
          lessonId={lessonId}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
}

// Slide Editor Panel Component
interface SlideEditorPanelProps {
  slide: Slide;
  blocks: Block[];
  onUpdateSlide: (updates: Partial<Slide>) => void;
  onAddBlock: (type: BlockType) => void;
  onUpdateBlock: (blockId: string, updates: Partial<Block>) => void;
  onDeleteBlock: (blockId: string) => void;
  onUploadImage: (file: File) => Promise<{ storagePath: string; downloadUrl: string }>;
}

function SlideEditorPanel({
  slide,
  blocks,
  onUpdateSlide,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onUploadImage,
}: SlideEditorPanelProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  return (
    <Card className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Slide Settings</h2>

      <div className="space-y-4">
        <div>
          <Label>Layout Type</Label>
          <Select
            value={slide.layout_type}
            onValueChange={(value) => onUpdateSlide({ layout_type: value as LayoutType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title_only">Title Only</SelectItem>
              <SelectItem value="text_only">Text Only</SelectItem>
              <SelectItem value="title_body">Title + Body</SelectItem>
              <SelectItem value="title_left_image_right">Title Left, Image Right</SelectItem>
              <SelectItem value="image_left_text_right">Image Left, Text Right</SelectItem>
              <SelectItem value="full_image_with_caption">Full Image + Caption</SelectItem>
              <SelectItem value="two_column_text">Two Column Text</SelectItem>
              <SelectItem value="bullet_list_with_image">Bullet List + Image</SelectItem>
              <SelectItem value="centered_callout">Centered Callout</SelectItem>
              <SelectItem value="quote_slide">Quote Slide</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Title</Label>
          <Input
            value={slide.title || ""}
            onChange={(e) => onUpdateSlide({ title: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Title Font Size</Label>
            <Select
              value={slide.title_font_size || "2xl"}
              onValueChange={(value) => onUpdateSlide({ title_font_size: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
                <SelectItem value="xl">XL</SelectItem>
                <SelectItem value="2xl">2XL</SelectItem>
                <SelectItem value="3xl">3XL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Body Font Size</Label>
            <Select
              value={slide.body_font_size || "md"}
              onValueChange={(value) => onUpdateSlide({ body_font_size: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
                <SelectItem value="xl">XL</SelectItem>
                <SelectItem value="2xl">2XL</SelectItem>
                <SelectItem value="3xl">3XL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Text Align</Label>
          <Select
            value={slide.text_align || "left"}
            onValueChange={(value) => onUpdateSlide({ text_align: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="justify">Justify</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Content Blocks</h3>
          <Select onValueChange={(value) => onAddBlock(value as BlockType)}>
            <SelectTrigger className="w-[180px]">
              <Plus className="w-4 h-4 mr-2" />
              Add Block
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="heading">Heading</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="bullet_list">Bullet List</SelectItem>
              <SelectItem value="quote">Quote</SelectItem>
              <SelectItem value="callout">Callout</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {blocks.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No blocks yet. Add your first content block.
          </div>
        ) : (
          <DraggableBlockList
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onDeleteBlock={onDeleteBlock}
            onReorderBlocks={async (newOrder) => {
              // Update block orders - newOrder is array of block IDs in new order
              for (let i = 0; i < newOrder.length; i++) {
                const blockId = newOrder[i];
                const block = blocks.find((b) => b.id === blockId);
                if (block && block.id && block.order !== i) {
                  await onUpdateBlock(block.id, { order: i });
                }
              }
            }}
          />
        )}
      </div>

      {selectedBlock && (
        <BlockEditorPanel
          block={selectedBlock}
          onUpdate={(updates) => {
            if (selectedBlock.id) {
              onUpdateBlock(selectedBlock.id, updates);
            }
          }}
          onUploadImage={onUploadImage}
        />
      )}
    </Card>
  );
}

// Block Editor Panel Component
interface BlockEditorPanelProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
  onUploadImage: (file: File) => Promise<{ storagePath: string; downloadUrl: string }>;
}

function BlockEditorPanel({ block, onUpdate, onUploadImage }: BlockEditorPanelProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { storagePath, downloadUrl } = await onUploadImage(file);
      onUpdate({
        storage_path: storagePath,
        image_url: downloadUrl,
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-4 mt-4">
      <h3 className="font-semibold mb-4">Edit Block</h3>
      <div className="space-y-4">
        {block.type === "title" || block.type === "text" || block.type === "heading" || block.type === "quote" || block.type === "callout" ? (
          <>
            <div>
              <Label>Content</Label>
              <Textarea
                value={block.content || ""}
                onChange={(e) => onUpdate({ content: e.target.value })}
                rows={block.type === "quote" || block.type === "callout" ? 3 : 5}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Font Size</Label>
                <Select
                  value={block.font_size || "md"}
                  onValueChange={(value) => onUpdate({ font_size: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">Small</SelectItem>
                    <SelectItem value="md">Medium</SelectItem>
                    <SelectItem value="lg">Large</SelectItem>
                    <SelectItem value="xl">XL</SelectItem>
                    <SelectItem value="2xl">2XL</SelectItem>
                    <SelectItem value="3xl">3XL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Font Weight</Label>
                <Select
                  value={block.font_weight || "normal"}
                  onValueChange={(value) => onUpdate({ font_weight: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="semibold">Semibold</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        ) : block.type === "bullet_list" ? (
          <>
            <div>
              <Label>Items (one per line)</Label>
              <Textarea
                value={block.content || ""}
                onChange={(e) => onUpdate({ content: e.target.value })}
                rows={6}
                placeholder="Item 1&#10;Item 2&#10;Item 3"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Font Size</Label>
                <Select
                  value={block.font_size || "md"}
                  onValueChange={(value) => onUpdate({ font_size: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">Small</SelectItem>
                    <SelectItem value="md">Medium</SelectItem>
                    <SelectItem value="lg">Large</SelectItem>
                    <SelectItem value="xl">XL</SelectItem>
                    <SelectItem value="2xl">2XL</SelectItem>
                    <SelectItem value="3xl">3XL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Font Weight</Label>
                <Select
                  value={block.font_weight || "normal"}
                  onValueChange={(value) => onUpdate({ font_weight: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="semibold">Semibold</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        ) : block.type === "image" ? (
          <>
            <div>
              <Label>Upload Image</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
              {block.image_url && (
                <div className="mt-2">
                  <img src={block.image_url} alt={block.alt_text || ""} className="max-w-xs rounded" />
                </div>
              )}
            </div>
            <div>
              <Label>Alt Text</Label>
              <Input
                value={block.alt_text || ""}
                onChange={(e) => onUpdate({ alt_text: e.target.value })}
                placeholder="Describe the image"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Placement</Label>
                <Select
                  value={block.placement || "center"}
                  onValueChange={(value) => onUpdate({ placement: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="full_width">Full Width</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Size</Label>
                <Select
                  value={block.width || "medium"}
                  onValueChange={(value) => onUpdate({ width: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Border Radius</Label>
              <Select
                value={block.border_radius || "md"}
                onValueChange={(value) => onUpdate({ border_radius: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}

// Lesson Preview Modal Component
interface LessonPreviewModalProps {
  curriculumId: string;
  moduleId: string;
  chapterId: string;
  lessonId: string;
  onClose: () => void;
}

function LessonPreviewModal({
  curriculumId,
  moduleId,
  chapterId,
  lessonId,
  onClose,
}: LessonPreviewModalProps) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [slideBlocks, setSlideBlocks] = useState<Record<string, Block[]>>({});
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
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
      } catch (error) {
        console.error("Error loading preview data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [curriculumId, moduleId, chapterId, lessonId]);

  const currentSlide = slides[currentSlideIndex];
  const currentBlocks = currentSlide ? slideBlocks[currentSlide.id || ""] || [] : [];

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-7xl h-[90vh]">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>Lesson Preview</DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative overflow-hidden">
          {currentSlide ? (
            <div className="h-full overflow-y-auto">
              <SlideRenderer slide={currentSlide} blocks={currentBlocks} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No slides to preview</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex items-center justify-between">
          <Button variant="outline" onClick={handlePrevious} disabled={currentSlideIndex === 0}>
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Slide {currentSlideIndex + 1} of {slides.length}
          </div>
          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentSlideIndex === slides.length - 1}
          >
            Next
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
