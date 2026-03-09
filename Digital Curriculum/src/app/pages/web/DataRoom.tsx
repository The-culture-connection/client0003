import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { format } from "date-fns";

interface FileNode {
  id: string;
  name: string;
  type: "folder" | "file";
  size?: string;
  modified?: string;
  children?: FileNode[];
  fileType?: string;
}

const mockFileSystem: FileNode[] = [
  {
    id: "1",
    name: "Corporate Documents",
    type: "folder",
    children: [],
  },
  {
    id: "2",
    name: "Financial Review",
    type: "folder",
    children: [],
  },
  {
    id: "3",
    name: "Industry",
    type: "folder",
    children: [],
  },
  {
    id: "4",
    name: "Business Plans",
    type: "folder",
    children: [],
  },
  {
    id: "5",
    name: "Intangible Property",
    type: "folder",
    children: [],
  },
  {
    id: "6",
    name: "Financing Documents",
    type: "folder",
    children: [],
  },
  {
    id: "7",
    name: "Employee Relations",
    type: "folder",
    children: [],
  },
  {
    id: "8",
    name: "Insurance",
    type: "folder",
    children: [],
  },
  {
    id: "9",
    name: "User Agreements and Contracts",
    type: "folder",
    children: [],
  },
  {
    id: "10",
    name: "Property Agreements",
    type: "folder",
    children: [],
  },
  {
    id: "11",
    name: "Software Product Development",
    type: "folder",
    children: [],
  },
  {
    id: "12",
    name: "Miscellaneous",
    type: "folder",
    children: [],
  },
  {
    id: "13",
    name: "Apple Store Insights",
    type: "folder",
    children: [],
  },
];

export function WebDataRoom() {
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [certificates, setCertificates] = useState<SkillCertificate[]>([]);
  const [certificatesLoading, setCertificatesLoading] = useState(true);
  const [previewCertificate, setPreviewCertificate] = useState<SkillCertificate | null>(null);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponseDocument[]>([]);
  const [surveyResponsesLoading, setSurveyResponsesLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setCertificatesLoading(false);
      setSurveyResponsesLoading(false);
      return;
    }
    listCertificates(user.uid)
      .then(setCertificates)
      .catch(() => setCertificates([]))
      .finally(() => setCertificatesLoading(false));
    listSurveyResponses(user.uid)
      .then(setSurveyResponses)
      .catch(() => setSurveyResponses([]))
      .finally(() => setSurveyResponsesLoading(false));
  }, [user?.uid]);

  const handleDownloadCertificate = (cert: SkillCertificate) => {
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
    if (currentPath.length === 0) return mockFileSystem;

    let current: FileNode[] = mockFileSystem;
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
    let current: FileNode[] = mockFileSystem;

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
        {certificatesLoading ? (
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
                      onClick={() => setPreviewCertificate(cert)}
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

      {/* Survey responses (PDFs from completed surveys) */}
      <Card className="p-6 bg-card border-border mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent" />
          Survey Responses
        </h2>
        {surveyResponsesLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading...</p>
        ) : surveyResponses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No survey response PDFs yet. Complete lessons with surveys (and PDF export enabled) to add documents here.
          </p>
        ) : (
          <div className="space-y-2">
            {surveyResponses.map((sr) => {
              const createdAt = sr.createdAt && typeof (sr.createdAt as { toDate?: () => Date }).toDate === "function"
                ? (sr.createdAt as { toDate: () => Date }).toDate()
                : sr.createdAt && typeof (sr.createdAt as { seconds?: number }).seconds === "number"
                  ? new Date((sr.createdAt as { seconds: number }).seconds * 1000)
                  : new Date();
              return (
                <div
                  key={sr.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-accent" />
                    <div>
                      <p className="font-medium text-foreground">{sr.lessonTitle}</p>
                      <p className="text-sm text-muted-foreground">Survey responses · {format(createdAt, "MMM d, yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(sr.downloadUrl, "_blank")}
                      className="border-border text-foreground"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(sr.downloadUrl, "_blank", "noopener")}
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
          >
            <Download className="w-4 h-4 mr-2" />
            Download All (ZIP)
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
