import { useState, useEffect, useCallback, useRef } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Folder,
  File,
  Download,
  Search,
  ChevronRight,
  Home,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Archive,
  Award,
  Eye,
} from "lucide-react";
import { useAuth } from "../../components/auth/AuthProvider";
import { listCertificates, listSurveyResponses, type SkillCertificate, type SurveyResponseDocument } from "../../lib/dataroom";
import { getStorageObjectViaFunctionsProxy } from "../../lib/storageDownloadProxy";
import { DATAROOM_FOLDER_OPTIONS } from "../../lib/dataroomFolders";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { format } from "date-fns";
import { trackEvent } from "../../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";

interface FileNode {
  id: string;
  name: string;
  type: "folder" | "file";
  size?: string;
  modified?: string;
  children?: FileNode[];
  fileType?: string;
  downloadUrl?: string;
}

const mockFileSystem: FileNode[] = DATAROOM_FOLDER_OPTIONS.map((folder) => ({
  id: folder.id,
  name: folder.name,
  type: "folder" as const,
  children: [],
}));

export function WebDataRoom() {
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [certificates, setCertificates] = useState<SkillCertificate[]>([]);
  const [certificatesLoading, setCertificatesLoading] = useState(true);
  const [certificatesError, setCertificatesError] = useState<string | null>(null);
  const [previewCertificate, setPreviewCertificate] = useState<SkillCertificate | null>(null);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponseDocument[]>([]);
  const [surveyResponsesLoading, setSurveyResponsesLoading] = useState(true);
  const [surveyResponsesError, setSurveyResponsesError] = useState<string | null>(null);
  const [zipBusy, setZipBusy] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setCertificatesLoading(false);
      setSurveyResponsesLoading(false);
      setCertificatesError(null);
      setSurveyResponsesError(null);
      return;
    }
    setCertificatesError(null);
    setSurveyResponsesError(null);
    listCertificates(user.uid)
      .then((list) => {
        setCertificates(list);
        setCertificatesError(null);
      })
      .catch((err) => {
        console.error("Data Room: failed to list certificates", err);
        setCertificates([]);
        setCertificatesError(err?.message ?? "Failed to load certificates");
      })
      .finally(() => setCertificatesLoading(false));
    listSurveyResponses(user.uid)
      .then((list) => {
        setSurveyResponses(list);
        setSurveyResponsesError(null);
      })
      .catch((err) => {
        console.error("Data Room: failed to list survey responses", err);
        setSurveyResponses([]);
        setSurveyResponsesError(err?.message ?? "Failed to load documents");
      })
      .finally(() => setSurveyResponsesLoading(false));
  }, [user?.uid]);

  const handleDownloadAllZip = useCallback(async () => {
    if (!user?.uid) {
      toast.error("Sign in to download.");
      return;
    }
    /** Use `getCourseFile` HTTPS proxy (CORS-safe) — same pattern as `PDFViewer` for Storage PDFs. */
    const withStoragePath = surveyResponses.filter((sr) => typeof sr.storagePath === "string" && sr.storagePath.length > 0);
    if (withStoragePath.length === 0) {
      toast.error("No survey PDFs available to bundle (missing storage paths). Try opening each PDF from the list.");
      return;
    }
    setZipBusy(true);
    try {
      toast.message("Building ZIP…", { description: "Fetching PDFs through the app proxy." });
      const zip = new JSZip();
      let added = 0;
      for (const sr of withStoragePath) {
        const base = (sr.surveyTitle || sr.lessonTitle || "survey").replace(/[^\w\d\-_.]+/g, "_");
        const name = `${base.slice(0, 80)}.pdf`;
        try {
          const proxyUrl = getStorageObjectViaFunctionsProxy(sr.storagePath);
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error(String(res.status));
          const blob = await res.blob();
          zip.file(`${added + 1}-${name}`, blob);
          added++;
        } catch {
          /* Proxy/network or missing file — skip individual file */
        }
      }
      if (added === 0) {
        toast.error("Could not read files for ZIP (permissions or missing files). Try opening each PDF from the list.");
        return;
      }
      const out = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = "data-room-surveys.zip";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${added} file${added === 1 ? "" : "s"} as ZIP.`);
    } catch (e) {
      console.error(e);
      toast.error("ZIP build failed.");
    } finally {
      setZipBusy(false);
    }
  }, [surveyResponses, user?.uid]);

  const handleDownloadCertificate = (cert: SkillCertificate) => {
    trackEvent(WEB_ANALYTICS_EVENTS.DATA_ROOM_CERTIFICATE_DOWNLOAD_CLICKED, {
      certificate_id: cert.id ?? null,
    });
    const win = window.open("", "_blank");
    if (!win) return;
    const createdAt = cert.createdAt && typeof (cert.createdAt as { toDate?: () => Date }).toDate === "function"
      ? (cert.createdAt as { toDate: () => Date }).toDate()
      : cert.createdAt && typeof (cert.createdAt as { seconds?: number }).seconds === "number"
        ? new Date((cert.createdAt as { seconds: number }).seconds * 1000)
        : new Date();
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>Certificate - ${cert.skill}</title></head>
        <body style="margin:0;padding:40px;font-family:Georgia,serif;text-align:center;background:#fafafa;">
          <div style="max-width:600px;margin:0 auto;border:3px solid #1a1a1a;padding:48px;background:#fff;">
            <h1 style="font-size:28px;margin-bottom:8px;">Certificate of Completion</h1>
            <p style="color:#666;font-size:14px;margin-bottom:32px;">${cert.courseTitle}</p>
            <p style="font-size:22px;margin:24px 0;">Congratulations on the new skill:</p>
            <p style="font-size:28px;font-weight:bold;margin:16px 0;color:#1a1a1a;">${cert.skill}</p>
            <p style="color:#888;font-size:12px;margin-top:48px;">Earned ${format(createdAt, "MMMM d, yyyy")}</p>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
  };

  const fileSystem: FileNode[] = mockFileSystem.map((folder) => {
    const files: FileNode[] = surveyResponses
      .filter((sr) => sr.dataroomFolderId === folder.id)
      .map((sr) => {
        const createdAt = sr.createdAt && typeof (sr.createdAt as { toDate?: () => Date }).toDate === "function"
          ? (sr.createdAt as { toDate: () => Date }).toDate()
          : sr.createdAt && typeof (sr.createdAt as { seconds?: number }).seconds === "number"
            ? new Date((sr.createdAt as { seconds: number }).seconds * 1000)
            : new Date();

        return {
          id: sr.id,
          name: `${(sr.surveyTitle || sr.lessonTitle || "Survey").trim()}.pdf`,
          type: "file" as const,
          fileType: "pdf",
          modified: format(createdAt, "MMM d, yyyy"),
          downloadUrl: sr.downloadUrl,
        };
      });

    return {
      ...folder,
      children: files,
    };
  });

  const getFileIcon = (fileType?: string) => {
    switch (fileType) {
      case "pdf":
        return <FileText className="w-5 h-5 text-red-500" />;
      case "doc":
      case "docx":
        return <FileText className="w-5 h-5 text-blue-500" />;
      case "xlsx":
      case "xls":
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case "jpg":
      case "png":
      case "gif":
        return <ImageIcon className="w-5 h-5 text-purple-500" />;
      case "zip":
        return <Archive className="w-5 h-5 text-yellow-500" />;
      default:
        return <File className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getCurrentFolder = (): FileNode[] => {
    if (currentPath.length === 0) return fileSystem;

    let current: FileNode[] = fileSystem;
    for (const pathId of currentPath) {
      const folder = current.find((item) => item.id === pathId);
      if (folder && folder.children) {
        current = folder.children;
      }
    }
    return current;
  };

  const navigateToFolder = (folderId: string) => {
    setCurrentPath([...currentPath, folderId]);
  };

  const navigateBack = () => {
    setCurrentPath(currentPath.slice(0, -1));
  };

  const navigateToRoot = () => {
    setCurrentPath([]);
  };

  const navigateToBreadcrumb = (index: number) => {
    setCurrentPath(currentPath.slice(0, index + 1));
  };

  const getBreadcrumbs = (): { id: string; name: string }[] => {
    const breadcrumbs: { id: string; name: string }[] = [];
    let current: FileNode[] = fileSystem;

    for (const pathId of currentPath) {
      const folder = current.find((item) => item.id === pathId);
      if (folder) {
        breadcrumbs.push({ id: folder.id, name: folder.name });
        if (folder.children) {
          current = folder.children;
        }
      }
    }
    return breadcrumbs;
  };

  const currentFolder = getCurrentFolder();
  const breadcrumbs = getBreadcrumbs();

  const filteredItems = currentFolder.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fileSearchMatchCountRef = useRef(0);
  fileSearchMatchCountRef.current = filteredItems.length;

  const skipInitialFileSearchEvent = useRef(true);
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (skipInitialFileSearchEvent.current) {
        skipInitialFileSearchEvent.current = false;
        return;
      }
      const len = searchQuery.trim().length;
      trackEvent(WEB_ANALYTICS_EVENTS.DATA_ROOM_FILE_SEARCH_CHANGED, {
        query_length: len,
        has_query: len > 0,
        has_matches: fileSearchMatchCountRef.current > 0,
      });
    }, 450);
    return () => clearTimeout(t);
  }, [searchQuery]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Data Room</h1>
        <p className="text-muted-foreground">
          Organize and manage your business documents and assets
        </p>
      </div>

      {/* Certificates section */}
      <Card className="p-6 bg-card border-border mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-accent" />
          Skill Certificates
        </h2>
        {certificatesError ? (
          <div className="py-4 rounded-lg bg-destructive/10 border border-destructive/30 px-4">
            <p className="text-sm text-destructive font-medium">Could not load certificates</p>
            <p className="text-xs text-muted-foreground mt-1">{certificatesError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                if (user?.uid) {
                  setCertificatesError(null);
                  setCertificatesLoading(true);
                  listCertificates(user.uid)
                    .then(setCertificates)
                    .catch((err) => {
                      console.error("Data Room: retry list certificates", err);
                      setCertificatesError(err?.message ?? "Failed to load certificates");
                    })
                    .finally(() => setCertificatesLoading(false));
                }
              }}
            >
              Retry
            </Button>
          </div>
        ) : certificatesLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading certificates...</p>
        ) : certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No certificates yet. Complete courses with assigned skills to earn certificates.
          </p>
        ) : (
          <div className="space-y-2">
            {certificates.map((cert) => {
              const createdAt = cert.createdAt && typeof (cert.createdAt as { toDate?: () => Date }).toDate === "function"
                ? (cert.createdAt as { toDate: () => Date }).toDate()
                : cert.createdAt && typeof (cert.createdAt as { seconds?: number }).seconds === "number"
                  ? new Date((cert.createdAt as { seconds: number }).seconds * 1000)
                  : new Date();
              return (
                <div
                  key={cert.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <Award className="w-8 h-8 text-accent" />
                    <div>
                      <p className="font-medium text-foreground">Congrats on the new skill: {cert.skill}</p>
                      <p className="text-sm text-muted-foreground">{cert.courseTitle} · {format(createdAt, "MMM d, yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        trackEvent(WEB_ANALYTICS_EVENTS.DATA_ROOM_CERTIFICATE_PREVIEW_OPENED, {
                          certificate_id: cert.id ?? null,
                        });
                        setPreviewCertificate(cert);
                      }}
                      className="border-border text-foreground"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadCertificate(cert)}
                      className="border-border text-foreground"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Certificate preview modal */}
      <Dialog open={!!previewCertificate} onOpenChange={(open) => !open && setPreviewCertificate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Certificate</DialogTitle>
          </DialogHeader>
          {previewCertificate && (
            <div className="border-2 border-border rounded-lg p-8 bg-card text-center">
              <h3 className="text-xl font-semibold text-foreground mb-2">Certificate of Completion</h3>
              <p className="text-sm text-muted-foreground mb-6">{previewCertificate.courseTitle}</p>
              <p className="text-lg text-foreground mb-2">Congratulations on the new skill:</p>
              <p className="text-2xl font-bold text-foreground mb-6">{previewCertificate.skill}</p>
              {previewCertificate.createdAt && (
                <p className="text-xs text-muted-foreground">
                  Earned{" "}
                  {typeof (previewCertificate.createdAt as { toDate?: () => Date }).toDate === "function"
                    ? format((previewCertificate.createdAt as { toDate: () => Date }).toDate(), "MMMM d, yyyy")
                    : "—"}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-6"
                onClick={() => {
                  handleDownloadCertificate(previewCertificate);
                  setPreviewCertificate(null);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download / Print
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="p-6 bg-card border-border">
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-border text-foreground"
            disabled={zipBusy || surveyResponsesLoading || surveyResponses.length === 0}
            onClick={() => void handleDownloadAllZip()}
          >
            <Download className="w-4 h-4 mr-2" />
            {zipBusy ? "Building ZIP…" : "Download All (ZIP)"}
          </Button>
        </div>

        <div className="mb-4 flex items-center gap-2 text-sm">
          <button
            onClick={navigateToRoot}
            className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors ${
              currentPath.length === 0
                ? "text-accent"
                : "text-muted-foreground"
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <button
                onClick={() => navigateToBreadcrumb(index)}
                className={`px-2 py-1 rounded hover:bg-muted transition-colors ${
                  index === breadcrumbs.length - 1
                    ? "text-accent"
                    : "text-muted-foreground"
                }`}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 grid grid-cols-12 gap-4 text-sm text-muted-foreground font-medium border-b border-border">
            <div className="col-span-6">Name</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-3">Modified</div>
            <div className="col-span-1"></div>
          </div>

          <div className="divide-y divide-border">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-12 text-center text-muted-foreground">
                {searchQuery ? "No files found" : "This folder is empty"}
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-muted/50 transition-colors"
                >
                  <div className="col-span-6 flex items-center gap-3">
                    {item.type === "folder" ? (
                      <Folder className="w-5 h-5 text-accent" />
                    ) : (
                      getFileIcon(item.fileType)
                    )}
                    {item.type === "folder" ? (
                      <button
                        onClick={() => navigateToFolder(item.id)}
                        className="text-foreground hover:text-accent transition-colors font-medium"
                      >
                        {item.name}
                      </button>
                    ) : (
                      <span className="text-foreground">{item.name}</span>
                    )}
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">
                    {item.size || "-"}
                  </div>
                  <div className="col-span-3 text-sm text-muted-foreground">
                    {item.modified || "-"}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {item.type === "file" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-accent hover:text-accent/90"
                        onClick={() => {
                          if (!item.downloadUrl) return;
                          trackEvent(WEB_ANALYTICS_EVENTS.DATA_ROOM_SURVEY_PDF_DOWNLOAD_CLICKED, {
                            document_id: item.id,
                          });
                          window.open(item.downloadUrl, "_blank", "noopener");
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {currentPath.length > 0 && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={navigateBack}
              className="border-border text-foreground"
            >
              ← Back
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
