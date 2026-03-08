/**
 * PPTX Import Page
 * Allows admins to upload PPTX files and import them as lesson decks
 */

import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../components/auth/AuthProvider";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";

type ImportStatus = "idle" | "uploading" | "parsing" | "success" | "error";

export function PptxImportPage() {
  const navigate = useNavigate();
  const { curriculumId, moduleId, chapterId } = useParams<{
    curriculumId: string;
    moduleId: string;
    chapterId: string;
  }>();
  const { user } = useAuth();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    lessonId: string;
    slidesImported: number;
    blocksCreated: number;
  } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".pptx")) {
      setError("Please select a .pptx file");
      return;
    }

    setSelectedFile(file);
    setError(null);
    
    // Auto-generate lesson title from filename
    if (!lessonTitle) {
      const nameWithoutExt = file.name.replace(/\.pptx$/i, "");
      setLessonTitle(nameWithoutExt);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !lessonTitle.trim() || !curriculumId || !moduleId || !chapterId || !user) {
      setError("Please select a file and enter a lesson title");
      return;
    }

    setImportStatus("uploading");
    setError(null);
    setUploadProgress(0);

    try {
      // Step 1: Upload PPTX to Storage
      const storagePath = `curriculum_imports/${curriculumId}/${moduleId}/${chapterId}/source/${selectedFile.name}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            reject(error);
          },
          () => {
            resolve();
          }
        );
      });

      // Step 2: Call import function
      setImportStatus("parsing");
      setUploadProgress(100);

      const importPptxDeck = httpsCallable(functions, "importPptxDeck");
      const result = await importPptxDeck({
        curriculum_id: curriculumId,
        module_id: moduleId,
        chapter_id: chapterId,
        lesson_title: lessonTitle.trim(),
        source_storage_path: storagePath,
        created_by_uid: user.uid,
      });

      const data = result.data as {
        success: boolean;
        lesson_id: string;
        slides_imported: number;
        blocks_created: number;
      };

      if (data.success) {
        setImportStatus("success");
        setImportResult({
          lessonId: data.lesson_id,
          slidesImported: data.slides_imported,
          blocksCreated: data.blocks_created,
        });
      } else {
        throw new Error("Import failed");
      }
    } catch (err: any) {
      console.error("Error importing PPTX:", err);
      setError(err.message || "Failed to import PPTX file");
      setImportStatus("error");
    }
  };

  const handleEditLesson = () => {
    if (importResult && curriculumId && moduleId && chapterId) {
      navigate(
        `/admin/curriculum/${curriculumId}/module/${moduleId}/chapter/${chapterId}/lesson/${importResult.lessonId}/builder`
      );
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Import PPTX Lesson</h1>
        <p className="text-muted-foreground">
          Upload a PowerPoint file to automatically create a lesson deck
        </p>
      </div>

      <Card className="p-6 space-y-6">
        {/* File Selection */}
        <div className="space-y-2">
          <Label>Select PPTX File</Label>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".pptx"
              onChange={handleFileSelect}
              disabled={importStatus === "uploading" || importStatus === "parsing"}
              className="flex-1"
            />
            {selectedFile && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Lesson Title */}
        <div className="space-y-2">
          <Label>Lesson Title *</Label>
          <Input
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            placeholder="Enter lesson title"
            disabled={importStatus === "uploading" || importStatus === "parsing"}
          />
        </div>

        {/* Upload Progress */}
        {importStatus === "uploading" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading file...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Parsing Status */}
        {importStatus === "parsing" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Parsing PPTX and creating lesson...</span>
          </div>
        )}

        {/* Error State */}
        {importStatus === "error" && error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-4 h-4" />
              <span className="font-semibold">Import Failed</span>
            </div>
            <p className="text-sm text-destructive mt-2">{error}</p>
          </div>
        )}

        {/* Success State */}
        {importStatus === "success" && importResult && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-600 mb-3">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">Import Successful!</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{importResult.slidesImported} slides</Badge>
                <Badge variant="outline">{importResult.blocksCreated} blocks</Badge>
              </div>
              <p className="text-muted-foreground">
                Your lesson has been imported and is ready to edit.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <Button
            onClick={handleImport}
            disabled={
              !selectedFile ||
              !lessonTitle.trim() ||
              importStatus === "uploading" ||
              importStatus === "parsing" ||
              importStatus === "success"
            }
            className="bg-accent hover:bg-accent/90"
          >
            {importStatus === "uploading" || importStatus === "parsing" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {importStatus === "uploading" ? "Uploading..." : "Importing..."}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import PPTX
              </>
            )}
          </Button>

          {importStatus === "success" && (
            <Button onClick={handleEditLesson} variant="outline">
              Edit Lesson
            </Button>
          )}

          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            disabled={importStatus === "uploading" || importStatus === "parsing"}
          >
            Cancel
          </Button>
        </div>
      </Card>

      {/* Info Box */}
      <Card className="p-4 mt-6 bg-muted/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">What gets imported?</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>All slides in order</li>
              <li>Text content from text boxes</li>
              <li>Images from each slide</li>
              <li>Automatic layout detection</li>
            </ul>
            <p className="mt-2">
              After import, you can edit the lesson, adjust layouts, reorder blocks, and publish
              when ready.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
