export interface DataroomFolderOption {
  /** Stable identifier used in storage paths and Firestore fields */
  id: string;
  /** Display label shown in the Data Room UI */
  name: string;
}

// NOTE: Keep this list in sync with the Data Room folder UI.
// "Apple Store Insights" is intentionally removed.
export const DATAROOM_FOLDER_OPTIONS: DataroomFolderOption[] = [
  { id: "corporate-documents", name: "Corporate Documents" },
  { id: "financial-review", name: "Financial Review" },
  { id: "industry", name: "Industry" },
  { id: "business-plans", name: "Business Plans" },
  { id: "intangible-property", name: "Intangible Property" },
  { id: "financing-documents", name: "Financing Documents" },
  { id: "employee-relations", name: "Employee Relations" },
  { id: "insurance", name: "Insurance" },
  { id: "user-agreements-and-contracts", name: "User Agreements and Contracts" },
  { id: "property-agreements", name: "Property Agreements" },
  { id: "software-product-development", name: "Software Product Development" },
  { id: "miscellaneous", name: "Miscellaneous" },
];

export const DEFAULT_DATAROOM_FOLDER_ID = "miscellaneous";

export function getDataroomFolderName(folderId?: string): string {
  if (!folderId) return DEFAULT_DATAROOM_FOLDER_ID;
  return DATAROOM_FOLDER_OPTIONS.find((f) => f.id === folderId)?.name ?? folderId;
}

