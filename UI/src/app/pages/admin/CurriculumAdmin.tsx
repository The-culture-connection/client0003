import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  BookOpen,
  Upload,
  Award,
  Zap,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Save,
  FileText,
  Video,
  Link as LinkIcon,
  ShoppingBag,
  ExternalLink,
  Linkedin,
} from "lucide-react";

export function CurriculumAdmin() {
  const [uploadMode, setUploadMode] = useState<"manual" | "file">("manual");

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <BookOpen className="w-8 h-8 text-blue-500" />
          </div>
          Curriculum Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload courses, attach points & badges, and configure payment structures
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="upload">Upload Curriculum</TabsTrigger>
          <TabsTrigger value="badges">Badge & Points</TabsTrigger>
          <TabsTrigger value="pricing">Pricing & Payments</TabsTrigger>
          <TabsTrigger value="integrations">Square & Shopify</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Upload Digital Curriculum</h2>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={uploadMode === "manual" ? "default" : "outline"}
                  onClick={() => setUploadMode("manual")}
                  className={uploadMode === "manual" ? "bg-accent text-accent-foreground" : ""}
                >
                  Manual Entry
                </Button>
                <Button
                  size="sm"
                  variant={uploadMode === "file" ? "default" : "outline"}
                  onClick={() => setUploadMode("file")}
                  className={uploadMode === "file" ? "bg-accent text-accent-foreground" : ""}
                >
                  File Upload
                </Button>
              </div>
            </div>

            {uploadMode === "file" ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-accent transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-medium text-foreground mb-2">
                    Upload Course Content
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Drag and drop or click to browse files
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: PDF, SCORM, Video (MP4), Documents (DOCX, PPT)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-bold text-foreground mb-2 block">
                      Course Title
                    </Label>
                    <Input placeholder="e.g., Advanced Financial Modeling" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-foreground mb-2 block">
                      Category
                    </Label>
                    <Input placeholder="e.g., Finance, Marketing" />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Description
                  </Label>
                  <Textarea
                    placeholder="Describe what students will learn..."
                    rows={4}
                  />
                </div>

                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Course
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-bold text-foreground mb-2 block">
                      Course Title
                    </Label>
                    <Input placeholder="e.g., Advanced Financial Modeling" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-foreground mb-2 block">
                      Duration
                    </Label>
                    <Input placeholder="e.g., 4 hours" />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Description
                  </Label>
                  <Textarea
                    placeholder="Describe what students will learn..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Modules
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input placeholder="Module 1: Introduction" />
                      <Button size="sm" variant="outline" className="border-border">
                        Add Lessons
                      </Button>
                    </div>
                    <Button size="sm" variant="ghost" className="text-accent">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Module
                    </Button>
                  </div>
                </div>

                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Save className="w-4 h-4 mr-2" />
                  Save Course
                </Button>
              </div>
            )}
          </Card>

          {/* Existing Courses */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-bold text-foreground mb-4">Existing Courses</h2>
            <div className="space-y-3">
              {[
                { title: "Entrepreneurship Foundations", modules: 4, lessons: 32, status: "Published" },
                { title: "Marketing Mastery", modules: 3, lessons: 24, status: "Draft" },
                { title: "Financial Planning", modules: 5, lessons: 40, status: "Published" },
              ].map((course, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border hover:border-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <BookOpen className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{course.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {course.modules} modules • {course.lessons} lessons
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-xs ${
                        course.status === "Published"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-yellow-500/10 text-yellow-500"
                      }`}
                    >
                      {course.status}
                    </Badge>
                    <Button size="sm" variant="outline" className="border-border">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Badges & Points Tab */}
        <TabsContent value="badges" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-bold text-foreground mb-6">
              Attach Points & Badges to Lessons
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-accent/20 to-accent/5 rounded-lg border border-accent/30">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      Module 1: Idea Validation
                    </h3>
                    <p className="text-sm text-muted-foreground">8 lessons</p>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500">
                    <Award className="w-3 h-3 mr-1" />
                    Idea Validator
                  </Badge>
                </div>

                <div className="space-y-3">
                  {[
                    { lesson: "Understanding Market Needs", points: 100 },
                    { lesson: "Competitive Analysis", points: 100 },
                    { lesson: "Problem-Solution Fit", points: 100 },
                    { lesson: "Idea Validation Quiz", points: 200 },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-accent" />
                        <span className="text-sm text-foreground">{item.lesson}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-accent" />
                          <Input
                            type="number"
                            defaultValue={item.points}
                            className="w-20"
                          />
                          <span className="text-xs text-muted-foreground">pts</span>
                        </div>
                        <Button size="sm" variant="outline" className="border-border">
                          Save
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">
                      Module Completion Badge
                    </span>
                    <Badge className="bg-yellow-500/10 text-yellow-500">
                      <Award className="w-3 h-3 mr-1" />
                      Idea Validator
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4">
                  LinkedIn Badge Integration
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Enable LinkedIn sharing for completion badges. Users can add these to their LinkedIn profile.
                </p>
                <div className="flex items-center gap-2">
                  <Button className="bg-[#0077B5] hover:bg-[#0077B5]/90 text-white">
                    <Linkedin className="w-4 h-4 mr-2" />
                    Configure LinkedIn Integration
                  </Button>
                  <Badge className="bg-green-500/10 text-green-500">Enabled</Badge>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-bold text-foreground mb-6">Payment Structure</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Course Pricing</h3>
                <div className="space-y-3">
                  {[
                    { course: "Module 1: Idea Validation", price: 0, type: "Free" },
                    { course: "Module 2: Customer Discovery", price: 99, type: "Paid" },
                    { course: "Module 3: Financial Modeling", price: 149, type: "Paid" },
                    { course: "Module 4: Pitch & Launch", price: 199, type: "Paid" },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <BookOpen className="w-5 h-5 text-accent" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{item.course}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          className={`text-xs ${
                            item.type === "Free"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-accent/10 text-accent"
                          }`}
                        >
                          {item.type}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number"
                            defaultValue={item.price}
                            className="w-24"
                          />
                        </div>
                        <Button size="sm" variant="outline" className="border-border">
                          Update
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Event Pricing</h3>
                <div className="space-y-3">
                  {[
                    { event: "Networking Workshop", price: 25 },
                    { event: "Guest Speaker Series", price: 0 },
                    { event: "Pitch Competition", price: 50 },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                    >
                      <span className="text-sm font-medium text-foreground">{item.event}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number"
                            defaultValue={item.price}
                            className="w-24"
                          />
                        </div>
                        <Button size="sm" variant="outline" className="border-border">
                          Update
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Square Integration */}
            <Card className="p-6 bg-gradient-to-br from-card to-muted/20 border-border">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-accent/10">
                  <ShoppingBag className="w-8 h-8 text-accent" />
                </div>
                <Badge className="bg-green-500/10 text-green-500">Connected</Badge>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Square Shop</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Link to your Square shop for physical product sales and merchandise
              </p>
              <div className="space-y-3 mb-4">
                <div className="p-3 bg-card rounded-lg border border-border">
                  <Label className="text-xs text-muted-foreground">Shop URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      defaultValue="https://square.link/u/mortar-shop"
                      className="flex-1"
                    />
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-card rounded-lg border border-border">
                  <Label className="text-xs text-muted-foreground">API Key</Label>
                  <Input
                    type="password"
                    defaultValue="sq0atp-••••••••••••••••"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
                  Update Settings
                </Button>
                <Button variant="outline" className="border-border">
                  <LinkIcon className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Shopify Integration */}
            <Card className="p-6 bg-gradient-to-br from-card to-muted/20 border-border">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <ShoppingBag className="w-8 h-8 text-green-500" />
                </div>
                <Badge className="bg-yellow-500/10 text-yellow-500">Not Connected</Badge>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Shopify Store</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Shopify store for advanced e-commerce features
              </p>
              <div className="space-y-3 mb-4">
                <div className="p-3 bg-card rounded-lg border border-border">
                  <Label className="text-xs text-muted-foreground">Store URL</Label>
                  <Input
                    placeholder="https://your-store.myshopify.com"
                    className="mt-1"
                  />
                </div>
                <div className="p-3 bg-card rounded-lg border border-border">
                  <Label className="text-xs text-muted-foreground">API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter Shopify API key"
                    className="mt-1"
                  />
                </div>
              </div>
              <Button className="w-full bg-green-500 hover:bg-green-500/90 text-white">
                Connect Shopify
              </Button>
            </Card>
          </div>

          {/* Link Square to Curriculum */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Add Square Shop Links to Curriculum
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Insert direct purchase links to your Square shop within course content
            </p>
            <div className="space-y-3">
              {[
                { module: "Module 1: Idea Validation", link: "" },
                { module: "Module 2: Customer Discovery", link: "https://square.link/u/mortar-discovery" },
                { module: "Module 3: Financial Modeling", link: "" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                >
                  <span className="text-sm font-medium text-foreground">{item.module}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter Square shop link"
                      defaultValue={item.link}
                      className="w-80"
                    />
                    <Button size="sm" variant="outline" className="border-border">
                      Save
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
