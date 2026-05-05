import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  UserPlus,
  Upload,
  Download,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Mail,
} from "lucide-react";

export function AlumniUpload() {
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const uploadHistory = [
    { id: 1, date: "2026-04-10", filename: "cincinnati-cohort-2024.csv", users: 45, status: "Success" },
    { id: 2, date: "2026-04-05", filename: "atlanta-cohort-2024.csv", users: 38, status: "Success" },
    { id: 3, date: "2026-03-28", filename: "mixed-cohorts.csv", users: 67, status: "Partial" },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <UserPlus className="w-8 h-8 text-cyan-500" />
          </div>
          Alumni Bulk Upload
        </h1>
        <p className="text-sm text-muted-foreground">
          Import users by email and cohort using CSV files
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="upload">Upload Alumni</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="history">Upload History</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Area */}
            <Card className="p-6 bg-card border-border">
              <h2 className="text-lg font-bold text-foreground mb-4">Upload CSV File</h2>

              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-accent transition-colors cursor-pointer mb-4">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm font-medium text-foreground mb-2">
                  Drag and drop your CSV file here
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  or click to browse files
                </p>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="csv-upload"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setUploadedFile(e.target.files[0]);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  className="border-border"
                  onClick={() => document.getElementById('csv-upload')?.click()}
                >
                  Select File
                </Button>
              </div>

              {uploadedFile && (
                <div className="p-4 bg-muted/30 rounded-lg border border-border mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setUploadedFile(null)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3 mb-4">
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Default Cohort (Optional)
                  </Label>
                  <Input placeholder="e.g., Cincinnati 2024" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied to users without cohort in CSV
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Default Role
                  </Label>
                  <Input defaultValue="Alumni" disabled />
                </div>
              </div>

              <Button
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={!uploadedFile}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload & Process
              </Button>

              {uploadStatus === "success" && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <p className="text-sm font-medium text-green-500">Upload Successful</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    45 users added successfully
                  </p>
                </div>
              )}

              {uploadStatus === "error" && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm font-medium text-red-500">Upload Failed</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Please check your CSV format and try again
                  </p>
                </div>
              )}
            </Card>

            {/* Instructions */}
            <Card className="p-6 bg-gradient-to-br from-card to-muted/20 border-border">
              <h2 className="text-lg font-bold text-foreground mb-4">CSV Format Instructions</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-2">Required Columns</h3>
                  <div className="space-y-2">
                    <div className="p-2 bg-card rounded border border-border">
                      <code className="text-xs text-accent">email</code>
                      <p className="text-xs text-muted-foreground mt-1">User email address (required)</p>
                    </div>
                    <div className="p-2 bg-card rounded border border-border">
                      <code className="text-xs text-accent">cohort</code>
                      <p className="text-xs text-muted-foreground mt-1">Cohort name (optional if default set)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground mb-2">Optional Columns</h3>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-muted-foreground">name</code>
                      <span className="text-xs text-muted-foreground">- Full name</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-muted-foreground">city</code>
                      <span className="text-xs text-muted-foreground">- City location</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-muted-foreground">company</code>
                      <span className="text-xs text-muted-foreground">- Company name</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground mb-2">Example CSV</h3>
                  <div className="p-3 bg-card rounded border border-border">
                    <pre className="text-xs text-foreground overflow-x-auto">
{`email,cohort,name,city
alex@example.com,Cincinnati 2024,Alex Rodriguez,Cincinnati
sarah@example.com,Cincinnati 2024,Sarah Chen,Cincinnati
marcus@example.com,Atlanta 2024,Marcus Thompson,Atlanta`}
                    </pre>
                  </div>
                </div>

                <Button variant="outline" className="w-full border-border">
                  <Download className="w-4 h-4 mr-2" />
                  Download Template CSV
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual" className="space-y-6">
          <Card className="p-6 bg-card border-border max-w-2xl">
            <h2 className="text-lg font-bold text-foreground mb-6">Add Single User</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input type="email" placeholder="user@example.com" />
                </div>
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Cohort <span className="text-red-500">*</span>
                  </Label>
                  <Input placeholder="e.g., Cincinnati 2024" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Full Name
                  </Label>
                  <Input placeholder="John Doe" />
                </div>
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    City
                  </Label>
                  <Input placeholder="Cincinnati" />
                </div>
              </div>

              <div>
                <Label className="text-sm font-bold text-foreground mb-2 block">
                  Company (Optional)
                </Label>
                <Input placeholder="Company name" />
                </div>

              <div className="flex gap-2">
                <Button className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
                <Button variant="outline" className="border-border">
                  Clear
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-bold text-foreground mb-6">Upload History</h2>

            <div className="space-y-3">
              {uploadHistory.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      upload.status === "Success" ? "bg-green-500/10" :
                      upload.status === "Partial" ? "bg-yellow-500/10" :
                      "bg-red-500/10"
                    }`}>
                      {upload.status === "Success" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : upload.status === "Partial" ? (
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{upload.filename}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{upload.date}</span>
                        <span>•</span>
                        <span>{upload.users} users</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-xs ${
                        upload.status === "Success" ? "bg-green-500/10 text-green-500" :
                        upload.status === "Partial" ? "bg-yellow-500/10 text-yellow-500" :
                        "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {upload.status}
                    </Badge>
                    <Button size="sm" variant="outline" className="border-border">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
