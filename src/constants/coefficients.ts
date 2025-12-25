import { Tier, SizeClass, ColorMode, Dpi, FileFormat, MetadataLevel, Handling, InspectionLevel } from "../types/pricing";

// プランごとの基礎単価 (L0)
export const TIER_BASE_PER_UNIT: Record<Tier, number> = {
  economy: 18,
  standard: 28,
  premium: 42,
};

// サイズ加算 (L1)
export const SIZE_ADDER: Record<SizeClass, number> = {
  "A4以下": 0,
  "A3": 4,
  "A2": 14,
  "A2以上": 14,
  "A1": 30,
  "A0": 55,
  "図面特大": 85,
};

// 色加算 (L2)
export const COLOR_ADDER: Record<ColorMode, number> = {
  mono: 0,
  gray: 3,
  color: 10,
};

// 解像度加算 (L3)
export const DPI_ADDER: Record<Dpi, number> = {
  300: 0,
  400: 3,
  600: 8,
};

// 形式加算 (L4)
export const FORMAT_ADDER: Partial<Record<FileFormat, number>> = {
  PDF: 0,
  "PDF/A": 3,
  TIFF: 6,
  JPEG: 2,
  JPEG2000: 7,
  TXT: 2,
  XML: 5,
};

// 派生PDF生成の加算
export const DERIVED_PDF_SURCHARGE = 20;
export const DERIVED_PDFA_EXTRA = 3;

// OCR加算 (L5)
export const OCR_ADDER = 6;

// メタデータ加算 (L6)
export const METADATA_ADDER: Record<MetadataLevel, number> = {
  none: 0,
  basic: 4,
  rich: 10,
};

// 取扱加算 (L7)
export const HANDLING_ADDER: Record<Handling, number> = {
  normal: 0,
  fragile: 8,
  bound: 6,
  mylars: 12,
  mixed: 10,
};

// 検査倍率 (M1)
export const INSPECTION_MULTIPLIER: Record<InspectionLevel, number> = {
  none: 1.0,
  sample: 1.06,
  full: 1.12,
  double_full: 1.20,
};

// 案件単位の固定費 (F0, F1)
export const PROJECT_FIXED_FEES: Record<Tier, { setup: number; management: number }> = {
  economy: { setup: 25000, management: 30000 },
  standard: { setup: 50000, management: 60000 },
  premium: { setup: 90000, management: 110000 },
};

// 付帯作業の固定費 (F2〜F6)
export const ADDON_FIXED_FEES = {
  fumigation: 120000,
  packing: 50000,
  pickupDelivery: 60000,
  onsite: 90000,
  encryption: 40000,
};

// 発行者のデフォルト情報
export const DEFAULT_ISSUER = {
  org: "株式会社国際マイクロ写真工業社",
  rep: "代表取締役　森 松 義 喬",
  hqDept: "経営管理本部",
  hqAddress: "東京都新宿区箪笥町5（経営管理本部）",
  opsDept: "営業部・資材販売部・オペレーションセンター",
  opsAddress: "〒162-0833　東京都新宿区箪笥町4-3（営業部・資材販売部・オペレーションセンター）",
  tel: "03-3260-5931",
  fax: "03-3269-4387",
  contactPerson: "◯◯",
  contactEmail: "e@kmsym.com",
  bankName: "○○銀行",
  bankBranch: "○○支店",
  bankType: "普通",
  bankAccount: "0000000",
  bankAccountName: "カ）コクサイマイクロシャシンコウギョウシャ",
};