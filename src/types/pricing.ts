// プランの型
export type Tier = "economy" | "standard" | "premium";

// 仕様プロファイルの型
export type SpecProfile = "standard" | "ndl" | "gunma";

// 検査レベルの型
export type InspectionLevel = "none" | "sample" | "full" | "double_full";

// サイズ区分の型
export type SizeClass = "A4以下" | "A3" | "A2" | "A2以上" | "A1" | "A0" | "図面特大";

// 色モードの型
export type ColorMode = "mono" | "gray" | "color";

// 解像度の型
export type Dpi = 300 | 400 | 600;

// メタデータレベルの型
export type MetadataLevel = "none" | "basic" | "rich";

// 取扱区分の型
export type Handling = "normal" | "fragile" | "bound" | "mylars" | "mixed";

// ファイル形式の型
export type FileFormat = "PDF" | "PDF/A" | "TIFF" | "JPEG" | "JPEG2000" | "TXT" | "XML";

// 作業項目のデータ構造
export type WorkItem = {
  id: string;
  title: string;
  qty: number;
  unit: "頁" | "点" | "巻";
  sizeClass: SizeClass;
  colorMode: ColorMode;
  dpi: Dpi;
  formats: FileFormat[];
  ocr: boolean;
  metadataLevel: MetadataLevel;
  handling: Handling;
  notes?: string;
};

// 特殊工程・実費のデータ構造
export type MiscExpense = {
  id: string;
  label: string;
  qty?: number;
  unit?: string;
  unitPrice?: number;
  amount: number;
  notes?: string;
};

// アプリ全体のデータ構造
export type Data = {
  quotationNo: string;
  issuerOrg: string;
  issuerDept: string;
  issuerRep: string;
  issuerAddress: string;
  issuerTel: string;
  issuerFax: string;
  issuerOpsDept: string;
  issuerOpsAddress: string;
  issuerContactPerson: string;
  issuerContactEmail: string;
  issuerBankName: string;
  issuerBankBranch: string;
  issuerBankType: string;
  issuerBankAccount: string;
  issuerBankAccountName: string;
  inspectionReportNo: string;
  inspectionIssueDate: string;
  inspectionDate: string;
  inspectionOverall: "pass" | "conditional" | "fail";
  inspectionDefectCount: number;
  inspectionReworkCount: number;
  inspectionCheckedCount: number;
  inspectionInspector: string;
  inspectionApprover: string;
  inspectionRemarks: string;
  clientName: string;
  projectName: string;
  contactName: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  tier: Tier;
  includeQuotation: boolean;
  includePriceRationalePage: boolean;
  includeFixedCostRationalePage: boolean;
  includeParameterTables: boolean;
  includeInternalCalc: boolean;
  includeSpecDoc: boolean;
  includeInstructionDoc: boolean;
  includeInspectionDoc: boolean;
  specProfile: SpecProfile;
  gunmaAllInspection: boolean;
  gunmaMediaRequirements: boolean;
  gunmaMetadataMandatory: boolean;
  inspectionLevel: InspectionLevel;
  includeFumigation: boolean;
  includePacking: boolean;
  includePickupDelivery: boolean;
  includeOnsite: boolean;
  includeEncryption: boolean;
  showUnitPriceBreakdown: boolean;
  includeInternalPlanDiffPage: boolean;
  includeInternalPlanComparePage: boolean;
  workItems: WorkItem[];
  miscExpenses: MiscExpense[];
  taxRate: number;
  setupFeeNote: string;
  managementFeeNote: string;
};

// 表示切替用のキー型
export type ViewKey = "input" | "instruction" | "estimate" | "compare" | "spec" | "inspection";