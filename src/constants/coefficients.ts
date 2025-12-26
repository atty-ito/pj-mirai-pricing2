import { ServiceCode } from "../types/pricing";

export const SYSTEM_NAME = "KHQ見積もり統合システム";
export const APP_VERSION = "v25.5.3 (Price Rev.)";

export const ISSUER = {
  org: "株式会社国際マイクロ写真工業社",
  rep: "代表取締役 森松 義喬",
  zip: "162-0833",
  address: "東京都新宿区箪笥町4-3",
  dept: "(営業部・資材販売部・オペレーションセンター)",
  hqAddress: "東京都新宿区箪笥町5 (経営管理本部)",
  tel: "03-3260-5931",
  fax: "03-3269-4387",
  email: "e@kmsym.com",
  cert: "Pマーク / ISO27001(ISMS) / ISO9001 / ISO14001 認証取得",
  regist_no: "T1234567890123"
};

export const INSPECTION_LEVELS = [
  "簡易目視検査 (抜き取り)",
  "標準全数検査 (作業者のみ)",
  "二重全数検査 (有資格者による再検)",
] as const;

export const COLOR_OPTS = ["モノクローム (TIFF/MMR)", "sRGB", "AdobeRGB"] as const;
export const RESOLUTIONS = ["200dpi", "300dpi", "400dpi", "600dpi", "400dpi相当 (解像力120本/mm)"] as const;

export const SPEC_PROFILES = [
  { value: "standard", label: "標準 (Standard)" },
  { value: "ndl", label: "詳細 (NDL準拠)" },
  { value: "gunma", label: "厳格 (公文書・文化財級)" },
] as const;

// --- Ver.4 準拠：基本単価テーブル (Base) ---
// ドキュメント記載の「本来あるべき価格」に設定
export const SERVICE_DEFINITIONS: Record<string, { name: string; unit: string; min: number; mid: number; max: number }> = {
  A: { name: "アーカイブ撮影（標準・非接触）", unit: "cut", min: 300, mid: 325, max: 350 }, // Ver.4 p.4準拠
  A2: { name: "アルバム特殊撮影（無反射・保護シート越し）", unit: "cut", min: 1000, mid: 1100, max: 1200 },
  B: { name: "高速スキャン（ADF可・定型）", unit: "枚", min: 17, mid: 45, max: 65 }, // min17〜目標65
  C: { name: "手置きスキャン（ADF不可・FB/OH）", unit: "枚", min: 60, mid: 75, max: 85 }, // Ver.4 p.3準拠
  D: { name: "大判スキャン（図面・長尺）", unit: "枚", min: 180, mid: 205, max: 230 },
  E: { name: "MF電子化（保存/活用）", unit: "コマ", min: 40, mid: 144, max: 200 },
  F: { name: "写真・乾板（透過原稿）", unit: "コマ", min: 500, mid: 750, max: 1000 },
};

// --- 加算テーブル (S: Adders) ---
export const SIZE_ADDERS: Record<string, number> = {
  "A4以下": 0, "A4/B5": 0,
  "A3": 0,
  "B4": 50,
  "A2": 2000, "A2以上": 2000, // Ver.4 p.3
  "B2": 2500,
  "A1": 3000,
  "B3": 1500,
  "A0": 4000, "A0/長尺": 4000,
  "図面特大": 5000,
};

export const FORMAT_ADDERS: Record<string, number> = {
  TIFF: 0,
  PDF: 10,
  JPG: 10, JPEG: 10,
  "PDF/A": 10,
  "マルチPDF": 10, // 基本ルール適用前（簡易）
  JPEG2000: 20,
  TXT: 5,
  XML: 10,
};

export const METADATA_UNIT_PRICES = {
  none: 0,
  folder: 10,
  file_simple: 30,
  file_full: 30,
  special_rule: 5,
};

export const BASE_FEE_THRESHOLDS = [
  { limit: 1000, fee: 30000 },
  { limit: 10000, fee: 20000 },
  { limit: Infinity, fee: 15000 },
];

export const STANDARD_FIXED_COSTS = {
  HDD: 20000, // Ver.4 p.14 戦略価格のベース
  DVDR: 6000,
  BDR: 9000,
  LABEL: 500,
  FUMIGATION: 20000,
};