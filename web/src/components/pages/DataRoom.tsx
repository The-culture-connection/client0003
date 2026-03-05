"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

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
];

export function DataRoomPage() {
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (user?.uid) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    if (!user?.uid) return;

    try {
      const dataRoomRef = doc(db, "data_rooms", user.uid);
      const dataRoomDoc = await getDoc(dataRoomRef);
      const docs = dataRoomDoc.data()?.documents || [];
      setDocuments(docs);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading data room...</p>
          </div>
        </div>
      </div>
    );
  }

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
