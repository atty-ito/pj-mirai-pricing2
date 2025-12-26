import { ServiceCode } from "../types/pricing";

// アプリケーション定数
export const SYSTEM_NAME = "Archive OS v24.1";

// 発行者のデフォルト情報
export const ISSUER = {
  org: "株式会社国際マイクロ写真工業社",
  address: "東京都新宿区箪笥町43",
  tel: "03-3260-5931",
  fax: "03-3260-5935",
  cert: "JIS Q 27001 (ISMS) / プライバシーマーク取得済",
};

// --- 選択肢定数 (Type定義の元) ---
export const INSPECTION_LEVELS = [
  "簡易目視検査 (抜き取り)",
  "標準全数検査 (作業者のみ)",
  "二重全数検査 (有資格者による再検)",
] as const;

export const COLOR_OPTS = ["モノクローム (TIFF/MMR)", "sRGB", "AdobeRGB"] as const;

export const RESOLUTIONS = ["200dpi", "300dpi", "400dpi", "600dpi", "400dpi相当 (解像力120本/mm)"] as const;

// --- 係数・単価テーブル ---

// サービス定義
export const SERVICE_DEFINITIONS: Record<string, { name: string; unit: string; min: number; mid: number; max: number }> = {
  A: { name: "アーカイブ撮影（標準・非接触）", unit: "cut", min: 300, mid: 325, max: 350 },
  A2: { name: "アルバム特殊撮影（無反射・保護シート越し）", unit: "cut", min: 1000, mid: 1000, max: 1000 },
  B: { name: "高速スキャン（ADF可・定型）", unit: "枚", min: 17, mid: 25.5, max: 34 },
  C: { name: "手置きスキャン（ADF不可・FB/OH）", unit: "枚", min: 60, mid: 72.5, max: 85 },
  D: { name: "大判スキャン（図面・長尺）", unit: "枚", min: 180, mid: 205, max: 230 },
  E: { name: "MF電子化（保存/活用）", unit: "コマ", min: 88, mid: 144, max: 200 },
  F: { name: "写真・乾板（透過原稿）", unit: "コマ", min: 500, mid: 750, max: 1000 },
};

// サイズ加算
export const SIZE_ADDERS: Record<string, number> = {
  "A4以下": 0, "A4/B5": 0,
  "A3": 0,
  "B4": 50,
  "A2": 2000,
  "A2以上": 2000,
  "B2": 2500,
  "A1": 3000,
  "B3": 1500,
  "A0": 4000, "A0/長尺": 4000,
  "図面特大": 5000,
};

// 形式加算
export const FORMAT_ADDERS: Record<string, number> = {
  TIFF: 0,
  PDF: 10,
  JPG: 10,
  JPEG: 10,
  "PDF/A": 10,
  "マルチPDF": 10,
  JPEG2000: 20,
  TXT: 5,
  XML: 10,
};

// メタデータ入力単価
export const METADATA_UNIT_PRICES = {
  none: 0,
  folder: 10,       // フォルダ名のみ
  file_simple: 30,  // 背文字など
  file_full: 30,    // 完全手入力
  special_rule: 50, // 特殊規則
};

// 基本料金テーブル
export const BASE_FEE_THRESHOLDS = [
  { limit: 1000, fee: 30000 },
  { limit: 10000, fee: 20000 },
  { limit: Infinity, fee: 15000 },
];