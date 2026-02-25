import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Folder,
  FolderOpen,
  FileText,
  Download,
  ChevronRight,
  ChevronDown,
  Archive,
} from "lucide-react";

interface FileItem {
  name: string;
  size?: string;
  type: "file";
}

interface FolderItem {
  name: string;
  description?: string;
  type: "folder";
  children: (FileItem | FolderItem)[];
}

type DataRoomItem = FileItem | FolderItem;

export function WebDataRoom() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["0"])
  );

  const dataRoomStructure: DataRoomItem[] = [
    {
      name: "0. Executive Overview",
      description: "Start here — this sets the narrative",
      type: "folder",
      children: [
        { name: "Vision & Mission Statement.pdf", size: "245 KB", type: "file" },
        { name: "Physical Space Overview.pdf", size: "1.2 MB", type: "file" },
        { name: "Problem Statement.pdf", size: "180 KB", type: "file" },
        { name: "Why Physical Matters.pdf", size: "320 KB", type: "file" },
        { name: "Business Model Canvas.pdf", size: "450 KB", type: "file" },
        { name: "Traction & Metrics.xlsx", size: "125 KB", type: "file" },
      ],
    },
    {
      name: "1. Corporate Structure",
      type: "folder",
      children: [
        { name: "Articles of Organization.pdf", size: "85 KB", type: "file" },
        { name: "Operating Agreement.pdf", size: "420 KB", type: "file" },
        { name: "Cap Table.xlsx", size: "95 KB", type: "file" },
        { name: "Equity Grants.pdf", size: "150 KB", type: "file" },
        { name: "Ownership Breakdown.xlsx", size: "78 KB", type: "file" },
        { name: "IP Ownership Agreement.pdf", size: "280 KB", type: "file" },
        { name: "Program Ownership.pdf", size: "120 KB", type: "file" },
        { name: "Brand Ownership.pdf", size: "95 KB", type: "file" },
      ],
    },
    {
      name: "2. Market + Concept Validation",
      type: "folder",
      children: [
        { name: "Target Customer Profiles.pdf", size: "340 KB", type: "file" },
        { name: "Demand Indicators.xlsx", size: "156 KB", type: "file" },
        { name: "Community Needs Assessment.pdf", size: "890 KB", type: "file" },
        { name: "Local Market Analysis.pdf", size: "1.5 MB", type: "file" },
        { name: "Comparable Spaces Research.pdf", size: "2.1 MB", type: "file" },
        { name: "Partnership Agreements.pdf", size: "420 KB", type: "file" },
        { name: "Proof of Demand.pdf", size: "670 KB", type: "file" },
      ],
    },
    {
      name: "3. Location + Physical Strategy",
      type: "folder",
      children: [
        { name: "Site Selection Criteria.pdf", size: "215 KB", type: "file" },
        { name: "Target Neighborhoods Analysis.pdf", size: "1.3 MB", type: "file" },
        { name: "Foot Traffic Study.pdf", size: "780 KB", type: "file" },
        { name: "Zoning Considerations.pdf", size: "340 KB", type: "file" },
        { name: "Lease Strategy.pdf", size: "290 KB", type: "file" },
        { name: "Buildout Assumptions.xlsx", size: "145 KB", type: "file" },
        { name: "Floor Plan Concepts.pdf", size: "2.4 MB", type: "file" },
        { name: "Space Utilization Model.xlsx", size: "198 KB", type: "file" },
        { name: "Programming Zones.pdf", size: "1.1 MB", type: "file" },
      ],
    },
    {
      name: "4. Financial Model",
      type: "folder",
      children: [
        {
          name: "Revenue Streams",
          type: "folder",
          children: [
            { name: "Membership Revenue.xlsx", size: "120 KB", type: "file" },
            { name: "Program Revenue.xlsx", size: "98 KB", type: "file" },
            { name: "Events Revenue.xlsx", size: "87 KB", type: "file" },
            { name: "Retail Revenue.xlsx", size: "76 KB", type: "file" },
            { name: "Sponsorships.xlsx", size: "105 KB", type: "file" },
            { name: "Grants & Funding.xlsx", size: "134 KB", type: "file" },
          ],
        },
        {
          name: "Unit Economics",
          type: "folder",
          children: [
            { name: "Cost per Location.xlsx", size: "156 KB", type: "file" },
            { name: "Revenue per Sq Ft.xlsx", size: "89 KB", type: "file" },
            { name: "Break-Even Timeline.xlsx", size: "112 KB", type: "file" },
            { name: "Margin by Program Type.xlsx", size: "98 KB", type: "file" },
          ],
        },
        { name: "5-Year Projections.xlsx", size: "245 KB", type: "file" },
        { name: "Sensitivity Analysis.xlsx", size: "178 KB", type: "file" },
      ],
    },
    {
      name: "5. Operations",
      type: "folder",
      children: [
        { name: "Staffing Plan.pdf", size: "340 KB", type: "file" },
        { name: "Program Delivery Model.pdf", size: "520 KB", type: "file" },
        { name: "Scheduling Logic.pdf", size: "215 KB", type: "file" },
        { name: "Vendor Relationships.pdf", size: "180 KB", type: "file" },
        { name: "Maintenance Costs.xlsx", size: "95 KB", type: "file" },
        { name: "Hours of Operation.pdf", size: "145 KB", type: "file" },
        { name: "Safety Protocols.pdf", size: "380 KB", type: "file" },
      ],
    },
    {
      name: "6. Programming + Offering",
      type: "folder",
      children: [
        { name: "Curriculum Overview.pdf", size: "1.8 MB", type: "file" },
        { name: "Event Programming.pdf", size: "890 KB", type: "file" },
        { name: "Community Offerings.pdf", size: "670 KB", type: "file" },
        { name: "Accelerator Pathway.pdf", size: "1.1 MB", type: "file" },
        { name: "Retention Strategy.pdf", size: "450 KB", type: "file" },
      ],
    },
    {
      name: "7. Technology Layer",
      type: "folder",
      children: [
        { name: "Web Platform Overview.pdf", size: "780 KB", type: "file" },
        { name: "Mobile App Overview.pdf", size: "820 KB", type: "file" },
        { name: "Data Room Structure.pdf", size: "340 KB", type: "file" },
        { name: "Member Tracking System.pdf", size: "560 KB", type: "file" },
        { name: "Event Management System.pdf", size: "490 KB", type: "file" },
        { name: "Tech Stack Documentation.pdf", size: "1.2 MB", type: "file" },
      ],
    },
    {
      name: "8. Community + Retention Strategy",
      type: "folder",
      children: [
        { name: "Engagement Strategy.pdf", size: "680 KB", type: "file" },
        { name: "Alumni Pathways.pdf", size: "540 KB", type: "file" },
        { name: "Network Effects Model.pdf", size: "420 KB", type: "file" },
        { name: "Referral Loop System.pdf", size: "380 KB", type: "file" },
        { name: "Repeat Usage Metrics.xlsx", size: "156 KB", type: "file" },
      ],
    },
    {
      name: "9. Partnerships",
      type: "folder",
      children: [
        { name: "Local Institutions.pdf", size: "490 KB", type: "file" },
        { name: "Brand Partnerships.pdf", size: "620 KB", type: "file" },
        { name: "Community Organizations.pdf", size: "540 KB", type: "file" },
        { name: "University Partnerships.pdf", size: "780 KB", type: "file" },
        { name: "Municipal Support.pdf", size: "340 KB", type: "file" },
      ],
    },
    {
      name: "10. Legal + Risk",
      type: "folder",
      children: [
        { name: "Lease Terms.pdf", size: "420 KB", type: "file" },
        { name: "Insurance Policies.pdf", size: "580 KB", type: "file" },
        { name: "Compliance Requirements.pdf", size: "640 KB", type: "file" },
        { name: "Licensing Needs.pdf", size: "290 KB", type: "file" },
        { name: "Risk Assessment.pdf", size: "730 KB", type: "file" },
      ],
    },
    {
      name: "11. Growth Strategy",
      type: "folder",
      children: [
        { name: "Expansion Model.pdf", size: "890 KB", type: "file" },
        { name: "Replication Plan.pdf", size: "1.4 MB", type: "file" },
        { name: "New Site Rollout Logic.pdf", size: "670 KB", type: "file" },
        { name: "Scaling Timeline.xlsx", size: "178 KB", type: "file" },
        { name: "Market Entry Strategy.pdf", size: "920 KB", type: "file" },
      ],
    },
  ];

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderItem = (
    item: DataRoomItem,
    depth: number = 0,
    parentPath: string = ""
  ) => {
    const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;

    if (item.type === "file") {
      return (
        <div
          key={currentPath}
          className="flex items-center gap-3 py-2.5 px-3 hover:bg-muted/30 rounded-lg transition-colors cursor-pointer group"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <FileText className="w-4 h-4 text-accent flex-shrink-0" />
          <span className="text-foreground text-sm flex-1">{item.name}</span>
          <span className="text-xs text-muted-foreground">{item.size}</span>
          <Download className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      );
    }

    const isExpanded = expandedFolders.has(currentPath);

    return (
      <div key={currentPath}>
        <div
          onClick={() => toggleFolder(currentPath)}
          className="flex items-center gap-3 py-2.5 px-3 hover:bg-muted/30 rounded-lg transition-colors cursor-pointer group"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-accent flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-accent flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-foreground text-sm font-medium">
              {item.name}
            </div>
            {item.description && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {item.description}
              </div>
            )}
          </div>
          <Badge
            variant="secondary"
            className="text-xs bg-muted text-muted-foreground"
          >
            {item.children.length} items
          </Badge>
        </div>
        {isExpanded && (
          <div>
            {item.children.map((child) =>
              renderItem(child, depth + 1, currentPath)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl text-foreground mb-2">Data Room</h1>
          <p className="text-muted-foreground">
            Access all investor and company documentation
          </p>
        </div>
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <Archive className="w-4 h-4" />
          Download All as ZIP
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6 bg-card border-border">
          <div className="mb-4 pb-4 border-b border-border">
            <h2 className="text-lg text-foreground font-medium">
              Document Structure
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Browse folders to view documents. Click any file to download.
            </p>
          </div>

          <div className="space-y-1">
            {dataRoomStructure.map((item) => renderItem(item))}
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-accent/10">
              <FileText className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="text-foreground font-medium mb-1">
                About This Data Room
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This data room contains comprehensive documentation for the
                Mortar physical space and platform. All documents are organized
                to provide a clear narrative from executive overview through
                growth strategy. Documents are regularly updated to reflect
                current operations and future plans.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
