import { Tier, SizeClass, ColorMode, Dpi, FileFormat, MetadataLevel, Handling, InspectionLevel } from "../types/pricing";

export const TIER_BASE_PER_UNIT: Record<Tier, number> = {
  economy: 18,
  standard: 28,
  premium: 42,
};

export const SIZE_ADDER: Record<SizeClass, number> = {
  "A4以下": 0,
  "A3": 4,
  "A2": 14,
  "A2以上": 14,
  "A1": 30,
  "A0": 55,
  "図面特大": 85,
};

export const COLOR_ADDER: Record<ColorMode, number> = {
  mono: 0,
  gray: 3,
  color: 10,
};

export const DPI_ADDER: Record<Dpi, number> = {
  300: 0,
  400: 3,
  600: 8,
};

export const FORMAT_ADDER: Record<FileFormat, number> = {
  PDF: 0,
  "PDF/A": 3,
  TIFF: 6,
  JPEG: 2,
  JPEG2000: 7,
  TXT: 2,
  XML: 5,
};

export const DERIVED_PDF_SURCHARGE = 20;
export const DERIVED_PDFA_EXTRA = 3;
export const OCR_ADDER = 6;

export const METADATA_ADDER: Record<MetadataLevel, number> = {
  none: 0,
  basic: 4,
  rich: 10,
};

export const HANDLING_ADDER: Record<Handling, number> = {
  normal: 0,
  fragile: 8,
  bound: 6,
  mylars: 12,
  mixed: 10,
};

export const INSPECTION_MULTIPLIER: Record<InspectionLevel, number> = {
  none: 1.0,
  sample: 1.06,
  full: 1.12,
  double_full: 1.20,
};

export const PROJECT_FIXED_FEES: Record<Tier, { setup: number; management: number }> = {
  economy: { setup: 25000, management: 30000 },
  standard: { setup: 50000, management: 60000 },
  premium: { setup: 90000, management: 110000 },
};

export const ADDON_FIXED_FEES = {
  fumigation: 120000,
  packing: 50000,
  pickupDelivery: 60000,
  onsite: 90000,
  encryption: 40000,
};

export const ISSUER = {
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