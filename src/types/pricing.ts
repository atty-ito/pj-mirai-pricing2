import { INSPECTION_LEVELS, COLOR_OPTS, RESOLUTIONS, SPEC_PROFILES } from "../constants/coefficients";

// ------------------------------------------------------------------
// 基本定義
// ------------------------------------------------------------------

export type Tier = "premium" | "standard" | "economy";

export type InspectionLevel = (typeof INSPECTION_LEVELS)[number];
export type ColorMode = (typeof COLOR_OPTS)[number];
export type Dpi = (typeof RESOLUTIONS)[number];
export type SpecProfile = (typeof SPEC_PROFILES)[number]["value"];

export const SERVICE_TYPES_KEYS = ["A", "A2", "B", "C", "D", "E", "F"] as const;
export type ServiceCode = (typeof SERVICE_TYPES_KEYS)[number];

export const SIZE_CLASS_KEYS = ["A4以下", "A4/B5", "A3", "B4", "A2", "A2以上", "B2", "A1", "B3", "A0", "A0/長尺", "図面特大"] as const;
export type SizeClass = (typeof SIZE_CLASS_KEYS)[number];

export type FileFormat = "TIFF" | "PDF" | "PDF/A" | "JPG" | "JPEG" | "JPEG2000" | "マルチPDF" | "TXT" | "XML" | "その他";

// ------------------------------------------------------------------
// データ型定義
// ------------------------------------------------------------------

export type WorkItem = {
  id: string; 
  service: ServiceCode;
  title: string;
  qty: number;
  unit: string;
  sizeClass: SizeClass;
  resolution: Dpi;
  colorSpace: ColorMode;
  fileFormats: FileFormat[]; // 複数選択可
  fileFormatsFree: string;   // 形式の自由入力欄
  notes: string;

  // 係数C（Condition）に関わる原本状態フラグ
  fragile: boolean;
  dismantleAllowed: boolean;
  restorationRequired: boolean;
  requiresNonContact: boolean;
};

// 自由入力の実費行
export type MiscExpense = {
  id: string;
  label: string;
  qty: number;
  unit: string;
  unitPrice: number; // 市場価格（税込）を入力
  amount: number;    // 計算結果
  note?: string;
  calcType: "manual" | "expense"; // expenseの場合、(市場価格 * 1.3) or (規定単価) の高い方を採用
};

export type Data = {
  // L1: 基本情報
  jobNo: string;
  createdDate: string;
  subject: string;
  customerName: string;
  customerType: string;
  jurisdiction: string;
  
  contactName: string;
  contactTel: string;
  
  qualityManager: string;
  salesManager: string;
  supervisorCert: string;

  deadline: string;
  deadlineType: "絶対納期" | "目標納期";
  isExpress: boolean;
  expressLevel: "通常" | "特急(10営未満)" | "超特急(5営未満)";

  contractExists: boolean;
  meetingMemoExists: boolean;
  
  // 仕様書関連
  specProfile: SpecProfile; // 仕様レベル
  specProvidedByClient: boolean; // 仕様書支給有無
  specStandard: boolean;
  privacyFlag: boolean;
  
  notes: string;

  // L2: 運用条件・輸送
  workLocation: "社内（高セキュリティ施設）" | "現地（出張）" | "外部委託（要承認）";
  strictCheckIn: boolean;
  checkInListProvided: boolean;
  transportDistanceKm: number;
  transportTrips: number;
  shippingType: "一般宅配" | "専用便" | "セキュリティ専用便" | "特殊セキュリティカー";

  // 環境・前処理
  fumigation: boolean;
  tempHumidLog: boolean;
  neutralPaperBag: string;
  interleaving: boolean;
  unbinding: "なし" | "紐外し" | "和綴じ解体" | "ハードカバー解体";
  rebind: boolean;
  preprocessMemo: string;

  // L4: 画像処理・メタデータ
  inspectionLevel: InspectionLevel;
  deltaE: boolean;
  reflectionSuppression: boolean;
  deskew: boolean;
  trimming: string;
  binaryConversion: boolean;
  binaryThreshold: string;
  
  // OCR
  ocr: boolean;
  ocrProofread: boolean;

  // メタデータ
  namingRule: "連番のみ" | "フォルダ名のみ" | "ファイル名（背文字）" | "ファイル名（完全手入力）" | "特殊命名規則";
  folderStructure: string;
  indexType: "なし" | "索引データ（Excel）" | "TSV（UTF-8 BOMなし）";
  lineFeed: "LF" | "CRLF";

  // L5: 納品・媒体
  deliveryMedia: string[];
  mediaCount: number;
  labelPrint: boolean;
  longTermStorageMonths: number;
  dataDeletionProof: boolean;
  disposal: "なし" | "溶解処理" | "返却のみ";
  deliveryMemo: string;

  // 係数パラメータ
  tier: Tier;
  kLoadPct: number;
  factorCap: number;
  capExceptionApproved: boolean;

  // 検査結果
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

  // 互換性維持
  quotationNo: string;
  issuerOrg: string;
  workItems: WorkItem[];
  miscExpenses: MiscExpense[];
  
  // UI制御
  includeQuotation: boolean;
  includePriceRationalePage: boolean; // ★追加: エラー原因だった箇所
  includeSpecDoc: boolean;
  includeInstructionDoc: boolean;
  includeInspectionDoc: boolean;
};

export type ViewKey = "input" | "instruction" | "estimate" | "compare" | "spec" | "inspection";