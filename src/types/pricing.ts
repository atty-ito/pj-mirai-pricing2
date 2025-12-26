// ------------------------------------------------------------------
// 基本定義（定数・選択肢）
// ------------------------------------------------------------------

export type Tier = "premium" | "standard" | "economy";

export const INSPECTION_LEVELS = [
  "簡易目視検査 (抜き取り)",
  "標準全数検査 (作業者のみ)",
  "二重全数検査 (有資格者による再検)",
] as const;
export type InspectionLevel = (typeof INSPECTION_LEVELS)[number];

export const COLOR_OPTS = ["モノクローム (TIFF/MMR)", "sRGB", "AdobeRGB"] as const;
export type ColorMode = (typeof COLOR_OPTS)[number];

export const RESOLUTIONS = ["200dpi", "300dpi", "400dpi", "600dpi", "400dpi相当 (解像力120本/mm)"] as const;
export type Dpi = (typeof RESOLUTIONS)[number];

export const SERVICE_TYPES = {
  A: { name: "アーカイブ撮影（標準・非接触）", unit: "cut", min: 300, mid: 325, max: 350 },
  A2: { name: "アルバム特殊撮影（無反射・保護シート越し）", unit: "cut", min: 1000, mid: 1000, max: 1000 },
  B: { name: "高速スキャン（ADF可・定型）", unit: "枚", min: 17, mid: 25.5, max: 34 },
  C: { name: "手置きスキャン（ADF不可・FB/OH）", unit: "枚", min: 60, mid: 72.5, max: 85 },
  D: { name: "大判スキャン（図面・長尺）", unit: "枚", min: 180, mid: 205, max: 230 },
  E: { name: "MF電子化（保存/活用）", unit: "コマ", min: 88, mid: 144, max: 200 },
  F: { name: "写真・乾板（透過原稿）", unit: "コマ", min: 500, mid: 750, max: 1000 },
} as const;
export type ServiceCode = keyof typeof SERVICE_TYPES;

export const SIZE_CLASS = {
  "A4以下": 0, "A4/B5": 0, // 互換性のため両方維持
  "A3": 0,
  "B4": 50,
  "A2": 2000,
  "A2以上": 2000,
  "B2": 2500,
  "A1": 3000,
  "B3": 1500,
  "A0": 4000, "A0/長尺": 4000,
  "図面特大": 5000,
} as const;
export type SizeClass = keyof typeof SIZE_CLASS;

// ------------------------------------------------------------------
// データ型定義
// ------------------------------------------------------------------

export type WorkItem = {
  id: string; 
  
  // 基本仕様
  service: ServiceCode;
  title: string;
  qty: number;
  unit: string;
  sizeClass: SizeClass;
  resolution: Dpi;
  colorSpace: ColorMode;
  fileFormats: string[]; // 複数選択可（TIFF, PDF等）
  notes: string;

  // 係数C（Condition）に関わる原本状態フラグ
  fragile: boolean;           // 脆弱資料
  dismantleAllowed: boolean;  // 解体可
  restorationRequired: boolean; // 復元必須
  requiresNonContact: boolean;  // 非接触要求
};

// 自由入力の実費行
export type MiscExpense = {
  id: string;
  label: string;
  qty: number;
  unit: string;
  unitPrice: number;
  amount: number; // 数量×単価
  note?: string;
  calcType: "manual" | "expense";
};

export type Data = {
  // --- L1: 基本情報 ---
  jobNo: string;
  createdDate: string; // 発行日 (YYYY-MM-DD)
  subject: string;     // 件名
  customerName: string;
  customerType: string;
  jurisdiction: string; // 主管課
  
  contactName: string; // 担当者名
  contactTel: string;
  
  // 管理者・資格
  qualityManager: string; // 品質責任者
  salesManager: string;   // 営業担当
  supervisorCert: string; // 監督者資格

  // 納期・特急
  deadline: string;
  deadlineType: "絶対納期" | "目標納期";
  isExpress: boolean;
  expressLevel: "通常" | "特急(10営未満)" | "超特急(5営未満)";

  // 契約・仕様前提
  contractExists: boolean;
  meetingMemoExists: boolean;
  specStandard: boolean; // 公的規格準拠
  privacyFlag: boolean;

  // --- L2: 運用条件・輸送 ---
  workLocation: "社内（高セキュリティ施設）" | "現地（出張）" | "外部委託（要承認）";
  
  // セキュリティ・受領
  strictCheckIn: boolean; // 厳格照合
  checkInListProvided: boolean; // リスト提供有無

  // 輸送（コスト計算用）
  transportDistanceKm: number;
  transportTrips: number;
  shippingType: "一般宅配" | "専用便" | "セキュリティ専用便" | "特殊セキュリティカー";

  // 環境・前処理
  fumigation: boolean;      // 燻蒸
  tempHumidLog: boolean;    // 温湿度ログ
  neutralPaperBag: string;  // 中性紙袋等
  interleaving: boolean;    // 合紙
  unbinding: "なし" | "紐外し" | "和綴じ解体" | "ハードカバー解体";
  rebind: boolean;          // 再製本
  preprocessMemo: string;

  // --- L4: 画像処理・メタデータ ---
  inspectionLevel: InspectionLevel;
  
  // 画質・処理オプション
  deltaE: boolean;              // 色差保証
  reflectionSuppression: boolean; // 反射抑制
  deskew: boolean;              // 傾き補正
  trimming: string;             // トリミング指定
  binaryConversion: boolean;    // 2値化
  binaryThreshold: string;      // 閾値
  
  // OCR・テキスト
  ocr: boolean;
  ocrProofread: boolean;        // 校正有無

  // メタデータ・構造
  namingRule: "連番のみ" | "フォルダ名のみ" | "ファイル名（背文字）" | "ファイル名（完全手入力）" | "特殊命名規則";
  folderStructure: string;
  indexType: "なし" | "索引データ（Excel）" | "TSV（UTF-8 BOMなし）";
  lineFeed: "LF" | "CRLF";

  // --- L5: 納品・媒体 ---
  deliveryMedia: string[];
  mediaCount: number;
  labelPrint: boolean;
  longTermStorageMonths: number;
  dataDeletionProof: boolean; // 消去証明
  disposal: "なし" | "溶解処理" | "返却のみ";
  deliveryMemo: string;

  // --- 係数パラメータ ---
  tier: Tier;
  kLoadPct: number;       // 繁忙期負荷係数 (%)
  factorCap: number;      // 係数上限 (通常2.2 / 例外2.5)
  capExceptionApproved: boolean; // 例外承認フラグ

  // --- 検査結果（Step 1で漏れていたフィールドを追加） ---
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

  // --- そのほか（互換維持用） ---
  quotationNo: string;
  issuerOrg: string;
  
  workItems: WorkItem[];
  miscExpenses: MiscExpense[];
  
  // 帳票出力フラグ
  includeQuotation: boolean;
  includeSpecDoc: boolean;
  includeInstructionDoc: boolean;
  includeInspectionDoc: boolean;
};

// 画面表示切替用
export type ViewKey = "input" | "instruction" | "estimate" | "compare" | "spec" | "inspection";