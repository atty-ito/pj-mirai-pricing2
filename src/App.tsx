import { useMemo, useState, type ReactNode } from "react";

/**
 * v24_3.tsx
 * 単一ファイルで動く「見積＋内部計算＋仕様書」アプリ。
 * - コンパイルが通ることを最優先（未使用importなし、TSの到達不能警告なし）。
 * - 3プラン（Economy / Standard / Premium）
 * - 「詳細／厳格」など、仕様書の“規格スイッチ”を入力UIで再現
 * - 備品実費等（自由入力の品目＋金額）を見積に反映
 * - チェックボックスと単価計算が連動し、行ごとに「参考単価」を即時表示
 */

type Tier = "economy" | "standard" | "premium";
type SpecProfile = "standard" | "ndl" | "gunma";

type InspectionLevel = "none" | "sample" | "full" | "double_full";

type SizeClass = "A4以下" | "A3" | "A2" | "A2以上" | "A1" | "A0" | "図面特大";
type ColorMode = "mono" | "gray" | "color";
type Dpi = 300 | 400 | 600;
type MetadataLevel = "none" | "basic" | "rich";
type Handling = "normal" | "fragile" | "bound" | "mylars" | "mixed";

type FileFormat = "PDF" | "PDF/A" | "TIFF" | "JPEG" | "JPEG2000" | "TXT" | "XML";

type WorkItem = {
  id: string;
  title: string;
  qty: number; // 原則：頁数
  unit: "頁" | "点" | "巻";
  sizeClass: SizeClass;
  colorMode: ColorMode;
  dpi: Dpi;
  formats: FileFormat[];
  ocr: boolean;
  metadataLevel: MetadataLevel;
  handling: Handling;  notes?: string;
};

type MiscExpense = {
  id: string;
  label: string;
  amount: number; // 税抜（原則）
};

type Data = {
  // 基本情報
  clientName: string;
  projectName: string;
  contactName: string;
  issueDate: string;
  dueDate: string;
  notes: string;

  // プラン
  tier: Tier;

  // 仕様書出力
  includeQuotation: boolean;
  includePriceRationalePage: boolean;
  includeFixedCostRationalePage: boolean;
  // 顧客提出用：単価・固定費のパラメータ表（別紙）を同梱
  includeParameterTables: boolean;
  includeInternalCalc: boolean;
  includeSpecDoc: boolean;
  includeInstructionDoc: boolean;
  includeInspectionDoc: boolean;

  // 仕様スイッチ
  specProfile: SpecProfile; // standard / ndl / gunma
  // 厳格で「入力UI上のスイッチ」として再現する論点
  gunmaAllInspection: boolean;
  gunmaMediaRequirements: boolean;
  gunmaMetadataMandatory: boolean;

  // 検査レベル（一般）
  inspectionLevel: InspectionLevel;

  // 付帯（案件単位）
  includeFumigation: boolean; // 燻蒸
  includePacking: boolean; // 長期保存資材等への格納
  includePickupDelivery: boolean; // 集荷・納品
  includeOnsite: boolean; // 現地作業
  includeEncryption: boolean; // 暗号化等

  // 単価の見える化（UI）
  showUnitPriceBreakdown: boolean;

  // 内部用：プラン差分説明ページ（必ず出す設定）
  includeInternalPlanDiffPage: boolean;

  // 作業対象
  workItems: WorkItem[];

  // 備品実費等（自由入力）
  miscExpenses: MiscExpense[];

  // 税率（日本の原則を初期値として 10%）
  taxRate: number; // 0.10 = 10%
};

// ---- 係数（ここは「単価設定が金額を左右する」ので、後で容易に差替できるよう集約） ----

const TIER_BASE_PER_UNIT: Record<Tier, number> = {
  economy: 18,
  standard: 28,
  premium: 42,
};

const SIZE_ADDER: Record<SizeClass, number> = {
  A4以下: 0,
  A3: 4,
  A2: 14,
  A2以上: 14,
  A1: 30,
  A0: 55,
  図面特大: 85,
};

const COLOR_ADDER: Record<ColorMode, number> = {
  mono: 0,
  gray: 3,
  color: 10,
};

const DPI_ADDER: Record<Dpi, number> = {
  300: 0,
  400: 3,
  600: 8,
};

const FORMAT_ADDER: Partial<Record<FileFormat, number>> = {
  PDF: 0,
  "PDF/A": 3,
  TIFF: 6,
  JPEG: 2,
  JPEG2000: 7,
  TXT: 2,
  XML: 5,
};

const OCR_ADDER = 6;

const METADATA_ADDER: Record<MetadataLevel, number> = {
  none: 0,
  basic: 4,
  rich: 10,
};

const HANDLING_ADDER: Record<Handling, number> = {
  normal: 0,
  fragile: 8,
  bound: 6,
  mylars: 12,
  mixed: 10,
};

const INSPECTION_MULTIPLIER: Record<InspectionLevel, number> = {
  none: 1.0,
  sample: 1.06,
  full: 1.12,
  double_full: 1.20,
};

// 付帯（案件単位）の定額（仮）。実務では「実費＋役務」の混合になりがちなので、後で個別調整しやすい構造に。
const PROJECT_FIXED_FEES: Record<Tier, { setup: number; management: number }> = {
  economy: { setup: 25000, management: 30000 },
  standard: { setup: 50000, management: 60000 },
  premium: { setup: 90000, management: 110000 },
};

const ADDON_FIXED_FEES = {
  fumigation: 120000,
  packing: 50000,
  pickupDelivery: 60000,
  onsite: 90000,
  encryption: 40000,
};

// ---- ユーティリティ ----

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}


function toMoney(v: string, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}


function num(n: number) {
  if (!Number.isFinite(n)) return "0";
  const s = n % 1 === 0 ? String(Math.round(n)) : String(n);
  const [i, d] = s.split(".");
  const head = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return d ? `${head}.${d}` : head;
}

function fmtJPY(n: number) {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(Math.round(n));
  return `${sign}¥${v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function joinFormats(formats: FileFormat[]) {
  if (!formats.length) return "（未指定）";
  return formats.join(" / ");
}

function tierLabel(t: Tier) {
  if (t === "economy") return "エコノミー";
  if (t === "standard") return "スタンダード";
  return "プレミアム";
}


function deriveSpecFlags(d: Data) {
  const requireMedia =
    d.specProfile === "gunma" ? d.gunmaMediaRequirements : d.specProfile === "ndl";
  const requireMetadata =
    d.specProfile === "gunma" ? d.gunmaMetadataMandatory : d.specProfile === "ndl";
  const fullInspection = d.specProfile === "gunma" ? d.gunmaAllInspection : (d.inspectionLevel === "full" || d.inspectionLevel === "double_full");
  return { requireMedia, requireMetadata, fullInspection };
}

function specProfileLabel(p: SpecProfile) {
  if (p === "standard") return "標準";
  if (p === "ndl") return "詳細";
  return "厳格";
}

function inspectionLabel(lv: InspectionLevel) {
  if (lv === "none") return "検査なし（目視確認レベル）";
  if (lv === "sample") return "抜取検査";
  if (lv === "full") return "全数検査";
  return "二重・全数検査（ダブルチェック）";
}


function toInt(v: number | string | null | undefined, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function sizeLabel(s: SizeClass): string {
  return s;
}

function colorModeLabel(m: ColorMode): string {
  return m === "mono" ? "モノクロ" : m === "gray" ? "グレースケール" : "カラー";
}

function dpiLabel(d: Dpi): string {
  return `${d}dpi`;
}

function formatLabel(f: FileFormat): string {
  return f;
}


function metadataLabel(lv: MetadataLevel) {
  if (lv === "none") return "なし";
  if (lv === "basic") return "基本";
  return "充実";
}

function handlingLabel(h: Handling) {
  if (h === "normal") return "通常";
  if (h === "fragile") return "脆弱・破損懸念";
  if (h === "bound") return "製本（裁断不可等）";
  if (h === "mylars") return "マイラー図面等（静電・反射配慮）";
  return "混在（個別判断）";
}

type UnitPriceBreakdown = {
  base: number;
  size: number;
  color: number;
  dpi: number;
  formats: number;
  ocr: number;
  metadata: number;
  handling: number;
  subtotal: number;
  inspectionMultiplier: number;
  finalUnitPrice: number;
};

function computeUnitPrice(tier: Tier, inspectionLevel: InspectionLevel, w: WorkItem): UnitPriceBreakdown {
  const base = TIER_BASE_PER_UNIT[tier];
  const size = SIZE_ADDER[w.sizeClass];
  const color = COLOR_ADDER[w.colorMode];
  const dpi = DPI_ADDER[w.dpi];

  const formats = (w.formats || []).reduce((sum, f) => sum + (FORMAT_ADDER[f] ?? 0), 0);
  const ocr = w.ocr ? OCR_ADDER : 0;
  const metadata = METADATA_ADDER[w.metadataLevel];
  const handling = HANDLING_ADDER[w.handling];

  const subtotal = base + size + color + dpi + formats + ocr + metadata + handling;
  const inspectionMultiplier = INSPECTION_MULTIPLIER[inspectionLevel];
  const finalUnitPrice = Math.round(subtotal * inspectionMultiplier);

  return { base, size, color, dpi, formats, ocr, metadata, handling, subtotal, inspectionMultiplier, finalUnitPrice };
}

type LineItem = {
  label: string;
  qty: number;
  unit: string;
  unitPrice: number;
  amount: number;
  note?: string;
  kind: "work" | "fixed" | "addon" | "misc";
};

type CalcResult = {
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  unitBreakdowns: Record<string, UnitPriceBreakdown>;
};

function computeCalc(data: Data): CalcResult {
  const unitBreakdowns: Record<string, UnitPriceBreakdown> = {};
  const lineItems: LineItem[] = [];

  // 1) 作業対象
  for (const w of data.workItems) {
    const bd = computeUnitPrice(data.tier, data.inspectionLevel, w);
    unitBreakdowns[w.id] = bd;

    const qty = Math.max(0, w.qty);
    const amount = bd.finalUnitPrice * qty;

    lineItems.push({
      kind: "work",
      label: w.title || "（無題）",
      qty,
      unit: w.unit,
      unitPrice: bd.finalUnitPrice,
      amount,
      note: [
        `サイズ:${sizeLabel(w.sizeClass)}`,
        `色:${colorModeLabel(w.colorMode)}`,
        `解像度:${dpiLabel(w.dpi)}`,
        `形式:${joinFormats(w.formats)}`,
        w.ocr ? "OCR:あり" : "OCR:なし",
        `メタデータ:${metadataLabel(w.metadataLevel)}`,
        `取扱:${handlingLabel(w.handling)}`,
      ].join(" / "),
    });
  }

  // 2) 案件単位の固定費
  const fixed = PROJECT_FIXED_FEES[data.tier];
  lineItems.push({
    kind: "fixed",
    label: "初期セットアップ費",
    qty: 1,
    unit: "式",
    unitPrice: fixed.setup,
    amount: fixed.setup,
  });
  lineItems.push({
    kind: "fixed",
    label: "進行管理・品質管理費",
    qty: 1,
    unit: "式",
    unitPrice: fixed.management,
    amount: fixed.management,
  });

  // 3) 付帯（定額）
  if (data.includeFumigation) {
    lineItems.push({
      kind: "addon",
      label: "燻蒸（防カビ・防虫）",
      qty: 1,
      unit: "式",
      unitPrice: ADDON_FIXED_FEES.fumigation,
      amount: ADDON_FIXED_FEES.fumigation,
    });
  }
  if (data.includePacking) {
    lineItems.push({
      kind: "addon",
      label: "長期保存用資材への格納（ラベル・封緘等含む）",
      qty: 1,
      unit: "式",
      unitPrice: ADDON_FIXED_FEES.packing,
      amount: ADDON_FIXED_FEES.packing,
    });
  }
  if (data.includePickupDelivery) {
    lineItems.push({
      kind: "addon",
      label: "集荷・納品（梱包・輸送手配含む）",
      qty: 1,
      unit: "式",
      unitPrice: ADDON_FIXED_FEES.pickupDelivery,
      amount: ADDON_FIXED_FEES.pickupDelivery,
    });
  }
  if (data.includeOnsite) {
    lineItems.push({
      kind: "addon",
      label: "現地作業（臨時設営・動線確保等）",
      qty: 1,
      unit: "式",
      unitPrice: ADDON_FIXED_FEES.onsite,
      amount: ADDON_FIXED_FEES.onsite,
    });
  }
  if (data.includeEncryption) {
    lineItems.push({
      kind: "addon",
      label: "暗号化・アクセス制御（媒体暗号化／鍵管理等）",
      qty: 1,
      unit: "式",
      unitPrice: ADDON_FIXED_FEES.encryption,
      amount: ADDON_FIXED_FEES.encryption,
    });
  }

  // 4) 備品実費等（自由入力）
  for (const m of data.miscExpenses) {
    const amt = Math.max(0, Math.round(m.amount));
    if (!m.label.trim() && amt === 0) continue;
    lineItems.push({
      kind: "misc",
      label: m.label.trim() || "備品実費等",
      qty: 1,
      unit: "式",
      unitPrice: amt,
      amount: amt,
    });
  }

  const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const tax = Math.round(subtotal * data.taxRate);
  const total = subtotal + tax;

  return { lineItems, subtotal, tax, total, unitBreakdowns };
}

type FixedCostRow = {
  code: string;
  label: string;
  enabled: boolean;
  amount: number;
  rationale: string;
};

function buildFixedCostRows(data: Data): FixedCostRow[] {
  const fixed = PROJECT_FIXED_FEES[data.tier];
  return [
    {
      code: "F0",
      label: "初期セットアップ費（案件固定）",
      enabled: true,
      amount: fixed.setup,
      rationale:
        "仕様確定〜作業設計、命名規則・メタデータ定義、サンプル検証、環境・帳票の初期セットアップ等。",
    },
    {
      code: "F1",
      label: "進行管理・品質管理費（案件固定）",
      enabled: true,
      amount: fixed.management,
      rationale:
        "工程管理、品質レビュー、問合せ窓口、差戻し・再作業の統制、納品前チェック、証跡管理等。",
    },
    {
      code: "F2",
      label: "燻蒸（防カビ・防虫）",
      enabled: data.includeFumigation,
      amount: ADDON_FIXED_FEES.fumigation,
      rationale: "防カビ・防虫のための燻蒸工程（資材・手配・作業）を含みます。",
    },
    {
      code: "F3",
      label: "長期保存用資材への格納（ラベル・封緘等含む）",
      enabled: data.includePacking,
      amount: ADDON_FIXED_FEES.packing,
      rationale: "保存箱・中性紙封筒等への格納、ラベル・封緘、簿冊単位の管理等を含みます。",
    },
    {
      code: "F4",
      label: "集荷・納品（梱包・輸送手配含む）",
      enabled: data.includePickupDelivery,
      amount: ADDON_FIXED_FEES.pickupDelivery,
      rationale: "梱包・輸送手配・受領／引渡しの立会い等を含みます。",
    },
    {
      code: "F5",
      label: "現地作業（臨時設営・動線確保等）",
      enabled: data.includeOnsite,
      amount: ADDON_FIXED_FEES.onsite,
      rationale: "現地での臨時設営、動線確保、作業スペース調整等を含みます。",
    },
    {
      code: "F6",
      label: "暗号化・アクセス制御（媒体暗号化／鍵管理等）",
      enabled: data.includeEncryption,
      amount: ADDON_FIXED_FEES.encryption,
      rationale: "媒体暗号化、鍵管理、アクセス制御（必要に応じたログ運用）等を含みます。",
    },
  ];
}

// ---- 仕様書（規格スイッチに応じて詳細度が変わる） ----

type SpecSection = { title: string; body: string };


function buildSpecSections(data: Data): SpecSection[] {
  const profile = data.specProfile; // internal key only
  const flags = deriveSpecFlags(data);
  const level = specProfilePublicLabel(profile); // 標準／詳細／厳格（表示用）

  const sections: SpecSection[] = [];
  const push = (title: string, bodyLines: string[]) => sections.push({ title, body: bodyLines.join("\n") });

  const hasAny = (s: string) => (s ?? "").trim().length > 0;
  const workItemSummary = data.workItems
    .map(
      (w) =>
        `- ${w.title}：数量 ${num(w.qty)} ${w.unit}／${sizeLabel(w.sizeClass)}／${colorModeLabel(w.colorMode)}／${dpiLabel(
          w.dpi,
        )}／形式 ${w.formats.join("・")}／OCR ${w.ocr ? "有" : "無"}／メタデータ ${metadataLabel(w.metadataLevel)}／取扱 ${handlingLabel(
          w.handling,
        )}`,
    )
    .join("\n");

  // 1 目的・範囲
  push("1. 目的・適用範囲", [
    "本書は、本案件におけるデジタルデータ作成（撮影・スキャン、画像処理、メタデータ作成、検査、納品）に関する仕様を定める。",
    `仕様レベルは「${level}」である。仕様レベルに応じて、記述の粒度、検査強度、媒体要件、メタデータ要件が変化する。`,
    "本書はドラフトであり、対象資料・数量・要件が確定した時点で最終化する。",
  ]);

  // 2 対象と成果物
  push("2. 対象・成果物", [
    "対象資料および成果物（行アイテム）は、入力情報に基づき次のとおりである。",
    workItemSummary || "（行アイテム未設定）",
    "成果物は原則として、(i) 保存用（マスター）と (ii) 利用用（閲覧・配布用）に区分し、必要に応じてメタデータおよびログを付す。",
  ]);

  // 3 画像作成（基本）
  push("3. 画像作成の基本要件", [
    "各画像は、文字可読性と将来再利用性の双方を満たすよう作成する。",
    "撮影・スキャン時は、傾き、天地逆、欠け、ピンぼけ、露出過不足、反射・写り込み、モアレ、偽色、ノイズ、歪み等が生じないよう留意する。",
    "裁断の有無、非裁断資料の開き角、背割れ等、物理的制約が画質に影響する場合は、無理な矯正を避け、別途ログに記録する（9章）。",
  ]);

  // 4 トリミング・余白・見開き等（詳細／厳格で増補）
  const trimLines = [
    "トリミングは、原則として資料の外周を欠かさず取得しつつ、不要な余白を過度に残さない。",
    "標準では、軽微な傾き補正・余白調整に留め、内容改変に該当する補正は行わない。",
  ];
  if (profile !== "standard") {
    trimLines.push(
      "詳細以上では、トリミング倍率（例：110%）等の運用ルールを定め、見開き・折込・大判を含む場合でも一貫した外周取得を行う。",
      "見開きや横長ページは、判型に応じて「1画像（見開き）」「左右分割」のいずれかを採用し、採用方式はログに記録する。",
    );
  }
  push("4. トリミング・判型・特殊ページ", trimLines);

  // 5 折込・大判・薄紙等（詳細／厳格）
  if (profile !== "standard") {
    push("5. 折込・大判・薄紙等の取扱い（詳細）", [
      "折込（複数回折り）等の特殊ページは、折り畳み状態の全体像を撮影した後、段階的に展開して撮影する（展開手順がある場合はそれに従う）。",
      "大判（例：A2級以上）で1コマに収まらない場合は、複数コマに分割して取得する。分割時は、継ぎ合わせ可能となるよう重なり（オーバーラップ）を確保し、順序（例：S字／Z字）を固定する。",
      "薄紙や裏写りが強い資料は、中間紙を挿入する等により可読性を確保する。作業上の工夫・制約はログに記録する。",
      "サイズ変更、切断、貼り付き、ページ欠落が疑われる場合は、その事実をログで明示する（9章）。",
    ]);
  }

  // 6 画質基準・品質検査（標準→詳細→厳格で増補）
  const qcLines = [
    "品質基準の判定は、目視確認に加え、必要に応じて拡大確認を行う。",
    "NG例（代表）：傾き、欠け、ピンぼけ、露出過不足、反射・写り込み、モアレ、偽色、ノイズ、天地逆、左右逆、歪み。",
  ];
  if (profile !== "standard") {
    qcLines.push(
      "詳細以上では、（必要に応じ）100%表示でのピクセル確認を行い、偽色・ノイズ・文字のつぶれ等を点検する。",
      "再撮影・再スキャンが必要な場合は、工程内是正として行い、差替えの履歴をログに残す。",
    );
  }
  if (profile === "gunma") {
    qcLines.push(
      "厳格では、傾き等の閾値（例：傾き2%以内など）を目安として運用し、全数検査を前提に是正を行う。",
      "偽色・ノイズ・モアレ等の微細な劣化も不合格要因となり得るため、拡大確認を標準化する。",
    );
  }
  push("6. 画質基準・品質検査", qcLines);

  // 7 画像処理・色管理（詳細／厳格で増補）
  const colorLines = [
    "画像処理は、資料の情報を損なわない範囲で、軽微な補正（傾き補正、余白調整等）に限定するのを原則とする。",
    "保存用（マスター）は、可能な限り可逆または非圧縮の形式を採用し、利用用（閲覧用）は用途に応じて圧縮・PDF化等を行う。",
  ];
  if (profile !== "standard") {
    colorLines.push(
      "詳細以上では、色空間（例：sRGB）やICCプロファイルの扱いを定め、同一資料群内で一貫性を担保する。",
      "閲覧用PDFを作成する場合、画質と容量のバランスを考慮しつつ、視認性（文字のエッジ・階調）を損なわない設定とする。",
    );
  }
  push("7. 画像処理・色管理", colorLines);

  // 8 メタデータ（基本→詳細→厳格）
  const mdLines: string[] = [];
  mdLines.push("メタデータは、成果物の探索性・再利用性を高めるために付与する。");
  if (!flags.requireMetadata) {
    mdLines.push("標準では、基本項目（例：ファイル名、通番、種別、ページ範囲等）を中心に、提供可能な範囲で付与する。");
  } else {
    mdLines.push(
      "詳細以上では、必須項目群を定め、欠落を不合格扱いとする（厳格の場合）。",
      "必須項目例：資料識別子／資料名／巻冊・簿冊識別／ページ（コマ）番号／ファイル名／作成日／形式／解像度／色／備考。",
      "値の表記は、区切り（半角スペース、スラッシュ等）や禁則（使用不可文字等）を定め、整合性を担保する。",
    );
  }
  if (profile !== "standard") {
    mdLines.push(
      "作業・機材情報（例：ホストPC、OS、スキャナ／カメラ、画像処理ソフト）は、所定の形式で記録する（例：『対象資料群名及び区分 / 機材名』をカンマ＋半角スペース区切りで列挙）。",
    );
  }
  push("8. メタデータ要件", mdLines);

  // 9 ログ・管理データ（詳細以上で増補）
  const logLines = [
    "作業ログ（管理データ）は、後日の説明可能性を担保するために作成する。",
    "最低限、欠落・重複・差替え・対象外等、成果物の完全性に影響する事項を記録する。",
  ];
  if (profile !== "standard") {
    logLines.push(
      "詳細以上では、以下の類型をログで明示する（例示）：",
      "- スキャニング対象外（対象資料の欠落、欠番等）",
      "- 切断（裁断・分割等の作業が生じた場合）",
      "- サイズ変更（原資料と撮影条件が異なる場合）",
      "- 分割（大判の分割、見開きの左右分割等）",
      "- 誤り（天地逆、左右逆、誤ファイル等）",
      "- ページ貼り付き（剥離不可等）",
      "また、資料群ごとの整理情報、フォルダ構成、媒体ラベル情報等を含める。",
    );
  }
  push("9. ログ・管理データ", logLines);

  // 10 検査（検査書との整合）
  const inspLines = [
    `検査レベルは「${inspectionLabel(data.inspectionLevel)}」である。`,
    "検査は、(i) 画質、(ii) 欠落・重複、(iii) 命名・フォルダ整合、(iv) メタデータ整合、(v) 媒体要件の順に確認する。",
  ];
  if (flags.fullInspection) {
    inspLines.push("全数検査を原則とし、再撮影・差替えを工程内で完結させる。");
  } else {
    inspLines.push("抜取検査の場合でも、重大な欠陥が発見された場合は追加検査を行う。");
  }
  push("10. 検査・是正", inspLines);

  // 11 納品媒体・保管（詳細／厳格）
  const mediaLines = [
    "納品は、成果物（マスター／閲覧用／メタデータ／ログ）を所定のフォルダ構成で格納し、媒体単位で管理する。",
  ];
  if (flags.requireMedia) {
    mediaLines.push(
      "詳細以上では、外付け媒体等への格納、媒体ラベル（媒体名、巻号、作成年月日、件名等）、ウイルスチェック、チェックサム等の運用を行う。",
      "媒体および保管資材（保存箱・封筒等）が必要な場合は、別途実費として計上することがある。",
    );
  } else {
    mediaLines.push("標準では、納品媒体の種類・本数は協議により定める。");
  }
  push("11. 納品媒体・保管", mediaLines);

  // 12 情報管理（厳格で増補）
  const secLines = ["作業中・納品後の情報管理は、機密度および取り扱い区分に従い実施する。"];
  if (profile === "gunma") {
    secLines.push(
      "厳格では、アクセス制御、作業者権限、持出制限、監査可能なログ等により、追跡可能性を担保する。",
    );
  }
  push("12. 情報管理・セキュリティ", secLines);

  // 13 付帯・連絡
  push("13. 付帯事項", [
    "本書に定めのない事項、または解釈に疑義がある事項は、協議の上で取り決める。",
    hasAny(data.notes) ? `備考：${data.notes}` : "備考：—",
  ]);

  return sections;
}


// ---- UI部品 ----

function Card(props: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="print-page rounded-2xl border bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="text-sm font-semibold text-slate-800">{props.title}</div>
        {props.right}
      </div>
      <div className="p-4">{props.children}</div>
    </div>
  );
}

function Label(props: { children: ReactNode }) {
  return <div className="text-xs font-medium text-slate-600 mb-1">{props.children}</div>;
}

function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{props.label}</Label>
      <input
        className="w-full rounded-lg border px-3 py-2 text-sm"
        value={String(props.value)}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

function TextAreaField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <Label>{props.label}</Label>
      <textarea
        className="w-full rounded-lg border px-3 py-2 text-sm"
        value={String(props.value)}
        placeholder={props.placeholder}
        rows={props.rows ?? 4}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

function NumberField(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div>
      <Label>{props.label}</Label>
      <div className="flex items-center gap-2">
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm"
          type="number"
          min={props.min ?? 0}
          step={props.step ?? 1}
          value={Number.isFinite(props.value) ? props.value : 0}
          onChange={(e) => props.onChange(toMoney(e.target.value))}
        />
        {props.suffix ? <div className="text-xs text-slate-500">{props.suffix}</div> : null}
      </div>
    </div>
  );
}

function SelectField<T extends string | number>(props: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
}) {
  return (
    <div>
      <Label>{props.label}</Label>
      <select
        className="w-full rounded-lg border px-3 py-2 text-sm"
        value={String(props.value)}
        onChange={(e) => {
          const raw = e.target.value;
          const found = props.options.find((o) => String(o.value) === raw);
          props.onChange((found ? found.value : (props.options[0]?.value as T)) as T);
        }}
      >
        {props.options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      {props.hint ? <div className="mt-1 text-xs text-slate-500">{props.hint}</div> : null}
    </div>
  );
}

function Checkbox(props: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start gap-2 rounded-lg border bg-slate-50 px-3 py-2">
      <input type="checkbox" className="mt-1" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      <div className="min-w-0">
        <div className="text-sm text-slate-800">{props.label}</div>
        {props.hint ? <div className="text-xs text-slate-500">{props.hint}</div> : null}
      </div>
    </label>
  );
}

function TinyButton(props: { label: string; onClick: () => void; kind?: "primary" | "normal" | "danger" }) {
  const cls =
    props.kind === "primary"
      ? "border-slate-900 bg-slate-900 text-white"
      : props.kind === "danger"
      ? "border-rose-600 bg-rose-600 text-white"
      : "border-slate-300 bg-white text-slate-800";
  return (
    <button type="button" className={`rounded-lg border px-2 py-1 text-xs ${cls}`} onClick={props.onClick}>
      {props.label}
    </button>
  );
}

// ---- 表（出力用） ----

function LineItemTable(props: { items: LineItem[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-slate-50">
          <th className="py-2 px-2 text-left font-semibold text-slate-700">項目</th>
          <th className="py-2 px-2 text-right font-semibold text-slate-700">数量</th>
          <th className="py-2 px-2 text-left font-semibold text-slate-700">単位</th>
          <th className="py-2 px-2 text-right font-semibold text-slate-700">単価</th>
          <th className="py-2 px-2 text-right font-semibold text-slate-700">金額</th>
        </tr>
      </thead>
      <tbody>
        {props.items.map((li, idx) => (
          <tr key={idx} className="border-b">
            <td className="py-2 px-2">
              <div className="text-slate-900">{li.label}</div>
              {li.note ? <div className="text-xs text-slate-500 whitespace-pre-wrap">{li.note}</div> : null}
            </td>
            <td className="py-2 px-2 text-right tabular-nums">{li.qty.toLocaleString()}</td>
            <td className="py-2 px-2">{li.unit}</td>
            <td className="py-2 px-2 text-right tabular-nums">{fmtJPY(li.unitPrice)}</td>
            <td className="py-2 px-2 text-right tabular-nums">{fmtJPY(li.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Page(props: { title: string; children: ReactNode }) {
  return (
    <div className="print-page rounded-2xl border bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
      <div className="border-b px-4 py-3">
        <div className="text-sm font-semibold text-slate-800">{props.title}</div>
      </div>
      <div className="p-4">{props.children}</div>
    </div>
  );
}


function specProfilePublicLabel(p: SpecProfile) {
  if (p === "standard") return "標準";
  if (p === "ndl") return "詳細";
  return "厳格";
}

const ISSUER = {
  org: "株式会社◯◯",
  dept: "総務部",
  address: "東京都千代田区◯◯一丁目◯番◯号",
  tel: "03-0000-0000",
};

function DocHeader(props: { docTitle: string; data: Data }) {
  const d = props.data;
  return (
    <div className="mb-4">
      <div className="grid grid-cols-2 gap-4 text-[11px] leading-relaxed text-slate-800">
        <div>
          <div className="font-semibold">宛先</div>
          <div>{d.clientName || "（顧客名）"} 御中</div>
          <div>担当：{d.contactName || "（担当者）"}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold">{ISSUER.org}</div>
          <div>{ISSUER.dept}</div>
          <div>{ISSUER.address}</div>
          <div>TEL {ISSUER.tel}</div>
          <div>発行日：{d.issueDate || "—"}</div>
          <div>有効期限：{d.dueDate || "—"}</div>
        </div>
      </div>

      <div className="mt-3 text-center">
        <div className="text-lg font-semibold tracking-wide text-slate-900">{props.docTitle}</div>
        <div className="mt-1 text-sm text-slate-800">件名：{d.projectName || "（案件名）"}</div>
      </div>

      <div className="mt-3 border-t border-slate-300" />
    </div>
  );
}

function DocFooter(props: { pageNo: number; totalPages: number; note?: string }) {
  return (
    <div className="pt-3 border-t border-slate-300 text-[11px] text-slate-700 flex items-end justify-between gap-4">
      <div className="leading-relaxed">{props.note ?? "本書は、入力条件に基づく見積書（ドラフト）である。数量・要件の確定に伴い、金額は増減し得る。"}</div>
      <div className="tabular-nums">{props.pageNo}/{props.totalPages}</div>
    </div>
  );
}

function DocPage(props: { header: ReactNode; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="print-page bg-white flex flex-col px-6 py-6">
      {props.header}
      <div className="flex-1">{props.children}</div>
      <div className="mt-auto">{props.footer}</div>
    </div>
  );
}



function PrintStyles() {
  return (
    <style>{`
@page {
  size: A4;
  margin: 12mm 12mm 14mm 12mm;
}

@media print {
  /* 画面UIを落とす */
  .no-print { display: none !important; }

  /* 背景・影を抑え、帳票として崩れない体裁へ */
  body { background: #fff !important; }
  .print-page {
    width: 210mm !important;
    min-height: 297mm !important;
    margin: 0 auto !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    break-after: page;
    page-break-after: always;
  }

  /* 印刷時に濃色背景を避ける（シック＝黒ベタではなく、落ち着いたグレー運用） */
  .bg-slate-900 { background: #fff !important; color: #000 !important; }
  .text-white { color: #000 !important; }
  .bg-slate-50 { background: #fff !important; }
}
    `}</style>
  );
}

// ---- メイン ----


type ViewKey = "input" | "instruction" | "estimate" | "spec" | "inspection";

const VIEW_ITEMS: Array<{ key: ViewKey; label: string; hint: string }> = [
  { key: "input", label: "入力画面", hint: "案件条件・単価・スイッチ" },
  { key: "instruction", label: "指示書", hint: "内部用 作業指示書" },
  { key: "estimate", label: "見積もり", hint: "顧客提出用 見積書" },
  { key: "spec", label: "仕様", hint: "仕様書（標準に連動）" },
  { key: "inspection", label: "検査", hint: "検査表（全数/抜取など）" },
];

function NavButton(props: { active: boolean; label: string; hint: string; onClick: () => void }) {
  const { active, label, hint, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-xl border px-3 py-2 text-left transition",
        active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className={["mt-0.5 text-xs", active ? "text-slate-200" : "text-slate-500"].join(" ")}>{hint}</div>
    </button>
  );
}

export default function App() {
  const [data, setData] = useState<Data>(() => ({
    clientName: "（匿名）",
    projectName: "（案件名：例）",
    contactName: "（担当者名：例）",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    notes: "",

    tier: "economy",

    includeQuotation: true,

    includePriceRationalePage: true,
    includeFixedCostRationalePage: true,
    includeParameterTables: true,
    includeInternalCalc: true,
    includeSpecDoc: true,
      includeInstructionDoc: true,
      includeInspectionDoc: true,

    specProfile: "ndl",
    gunmaAllInspection: true,
    gunmaMediaRequirements: true,
    gunmaMetadataMandatory: true,

    inspectionLevel: "sample",

    includeFumigation: false,
    includePacking: false,
    includePickupDelivery: false,
    includeOnsite: false,
    includeEncryption: false,

    showUnitPriceBreakdown: true,

    includeInternalPlanDiffPage: true,

    workItems: [
      {
        id: uid("w"),
        title: "簿冊（保存用TIFF＋閲覧PDF）",
        qty: 1200,
        unit: "頁",
        sizeClass: "A4以下",
        colorMode: "color",
        dpi: 400,
        formats: ["TIFF", "PDF/A"],
        ocr: false,
        metadataLevel: "basic",
        handling: "normal",
        notes: "保存用（TIFF非圧縮想定）＋閲覧用（PDF/A）。ICCプロファイル埋込・チェックサム等は仕様書で規定。",
      },
      {
        id: uid("w"),
        title: "大型図面（A2）",
        qty: 120,
        unit: "点",
        sizeClass: "A2",
        colorMode: "color",
        dpi: 400,
        formats: ["TIFF", "PDF"],
        ocr: false,
        metadataLevel: "basic",
        handling: "fragile",
        notes: "折り・破損リスクを前提に、取扱い加算が入る想定。",
      },
      {
        id: uid("w"),
        title: "写真・図版（高精細）",
        qty: 300,
        unit: "点",
        sizeClass: "A4以下",
        colorMode: "color",
        dpi: 600,
        formats: ["TIFF", "JPEG"],
        ocr: false,
        metadataLevel: "basic",
        handling: "normal",
        notes: "色管理・解像度要件を厳格化した想定（ICC／傾き・色味の補正はプレミアムに寄る）。",
      },
      {
        id: uid("w"),
        title: "閲覧用PDF（OCRあり）",
        qty: 800,
        unit: "頁",
        sizeClass: "A4以下",
        colorMode: "gray",
        dpi: 300,
        formats: ["PDF"],
        ocr: true,
        metadataLevel: "basic",
        handling: "normal",
        notes: "検索性の確保（OCR）を付す想定。原本の状態により精度は変動。",
      },
    ],

    miscExpenses: [
      { id: uid("m"), label: "外付けHDD（実費）", amount: 0 },
      { id: uid("m"), label: "保存箱（実費）", amount: 0 },
      { id: uid("m"), label: "中性紙封筒・ラベル等（実費）", amount: 0 },
    ],

    taxRate: 0.1,
  }));
  const [view, setView] = useState<ViewKey>("input");


  const calc = useMemo(() => computeCalc(data), [data]);
  const specFlags = useMemo(
    () => deriveSpecFlags(data),
    [
      data.specProfile,
      data.gunmaAllInspection,
      data.gunmaMediaRequirements,
      data.gunmaMetadataMandatory,
      data.inspectionLevel,
    ]
  );



  // ---- UI操作 ----
  const addWorkItem = () => {
    setData((p) => ({
      ...p,
      workItems: [
        ...p.workItems,
        {
          id: uid("w"),
          title: "（追加項目）",
          qty: 0,
          unit: "頁",
          sizeClass: "A4以下",
          colorMode: "mono",
          dpi: 300,
          formats: ["PDF"],
          ocr: false,
          metadataLevel: "none",
          handling: "normal",
          notes: "",
        },
      ],
    }));
  };

  const removeWorkItem = (id: string) => {
    setData((p) => ({ ...p, workItems: p.workItems.filter((w) => w.id !== id) }));
  };

  const updateWorkItem = (id: string, patch: Partial<WorkItem>) => {
    setData((p) => ({ ...p, workItems: p.workItems.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
  };

  const addMiscExpense = () => {
    setData((p) => ({
      ...p,
      miscExpenses: [...p.miscExpenses, { id: uid("m"), label: "備品実費等（自由入力）", amount: 0 }],
    }));
  };

  const removeMiscExpense = (id: string) => {
    setData((p) => ({ ...p, miscExpenses: p.miscExpenses.filter((m) => m.id !== id) }));
  };

  const updateMiscExpense = (id: string, patch: Partial<MiscExpense>) => {
    setData((p) => ({ ...p, miscExpenses: p.miscExpenses.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  };

  // ---- 画面 ----
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PrintStyles />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 flex items-start justify-between gap-4 no-print">
          <div>
            <h1 className="text-xl font-bold tracking-tight">アーカイブ見積もりシステム</h1>
            <p className="mt-1 text-sm text-slate-600">
              左のタブで、入力・指示書・見積・仕様・検査を切り替えます。計算ロジックは入力タブの条件に追随します。
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div className="flex items-center justify-end gap-2">
              <TinyButton label="印刷" kind="primary" onClick={() => window.print()} />
            </div>
            <div className="mt-2 font-semibold text-slate-700">v24_10</div>
            <div className="mt-0.5">{VIEW_ITEMS.find((x) => x.key === view)?.label}</div>
          </div>
        </div>

        <div className="flex gap-4">
          <aside className="w-56 shrink-0 no-print">
            <div className="sticky top-4 space-y-2">
              {VIEW_ITEMS.map((it) => (
                <NavButton
                  key={it.key}
                  active={view === it.key}
                  label={it.label}
                  hint={it.hint}
                  onClick={() => setView(it.key)}
                />
              ))}

              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
                <div className="font-semibold">現在の前提</div>
                <div className="mt-1 space-y-1 text-slate-600">
                  <div>
                    標準: <span className="font-medium text-slate-800">{specProfileLabel(data.specProfile)}</span>
                  </div>
                  <div>
                    プラン: <span className="font-medium text-slate-800">{tierLabel(data.tier)}</span>
                  </div>
                  <div>
                    検査: <span className="font-medium text-slate-800">{inspectionLabel(data.inspectionLevel)}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            {view === "input" ? (
              <div className="space-y-4">
                          <Card title="1) 基本情報">
                            <div className="grid grid-cols-2 gap-3">
                              <TextField label="顧客名" value={data.clientName} onChange={(v) => setData((p) => ({ ...p, clientName: v }))} />
                              <TextField label="案件名" value={data.projectName} onChange={(v) => setData((p) => ({ ...p, projectName: v }))} />
                              <TextField label="担当者名" value={data.contactName} onChange={(v) => setData((p) => ({ ...p, contactName: v }))} />
                              <TextField label="発行日" value={data.issueDate} onChange={(v) => setData((p) => ({ ...p, issueDate: v }))} />
                              <TextField label="納期（任意）" value={data.dueDate} onChange={(v) => setData((p) => ({ ...p, dueDate: v }))} placeholder="例：2026-01-31 / 要相談" />
                            </div>
                            <div className="md:col-span-2">
                              <TextAreaField
                                label="案件備考（社内）"
                                value={data.notes}
                                onChange={(v) => setData((p) => ({ ...p, notes: v }))}
                                placeholder="例：顧客の特記事項、品質要件の注意、追加見積の背景等"
                                rows={3}
                              />
                            </div>

                          </Card>

                          <Card title="2) プランと検査">
                            <div className="grid grid-cols-2 gap-3">
                              <SelectField<Tier>
                                label="プラン"
                                value={data.tier}
                                onChange={(v) => setData((p) => ({ ...p, tier: v }))}
                                options={[
                                  { value: "economy", label: "エコノミー（価格優先）" },
                                  { value: "standard", label: "スタンダード（バランス）" },
                                  { value: "premium", label: "プレミアム（品質・管理優先）" },
                                ]}
                                hint="単価は「基礎単価＋加算要素」を基に算出します。"
                              />
                              <SelectField<InspectionLevel>
                                label="検査レベル"
                                value={data.inspectionLevel}
                                onChange={(v) => setData((p) => ({ ...p, inspectionLevel: v }))}
                                options={[
                                  { value: "none", label: "検査なし" },
                                  { value: "sample", label: "抜取検査" },
                                  { value: "full", label: "全数検査" },
                                  { value: "double_full", label: "二重・全数検査" },
                                ]}
                                hint="検査レベルは単価に倍率として反映されます。"
                              />
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <Checkbox
                                label="単価内訳（行ごと）を表示"
                                checked={data.showUnitPriceBreakdown}
                                onChange={(v) => setData((p) => ({ ...p, showUnitPriceBreakdown: v }))}
                                hint="入力と同時に、参考単価と内訳を確認できます。"
                              />
                              <div className="rounded-lg border bg-white px-3 py-2">
                                <div className="text-xs text-slate-600">参考：基礎単価（{tierLabel(data.tier)}）</div>
                                <div className="text-sm font-semibold tabular-nums">{fmtJPY(TIER_BASE_PER_UNIT[data.tier])} / 頁</div>
                                <div className="text-xs text-slate-500">※ 実際の単価は加算・検査倍率を含みます。</div>
                              </div>
                            </div>
                          </Card>

                          <Card title="3) 仕様レベル（標準／詳細／厳格）">
                            <div className="grid grid-cols-2 gap-3">
                              <SelectField<SpecProfile>
                                label="仕様プロファイル"
                                value={data.specProfile}
                                onChange={(v) =>
                                  setData((p) => ({
                                    ...p,
                                    specProfile: v,
                                    // 厳格に寄せた場合は、実務的に全数寄りになるため、検査レベルも補助的に引き上げる（ただし強制はしない）
                                    inspectionLevel: v === "gunma" && p.inspectionLevel === "none" ? "sample" : p.inspectionLevel,
                                  }))
                                }
                                options={[{ value: "standard", label: "標準" }, { value: "ndl", label: "詳細" }, { value: "gunma", label: "厳格" }]}
                                hint="選択に応じて、仕様書の粒度（詳細度）が連動して変化します。"
                              />
                              <div className="rounded-lg border bg-white px-3 py-2">
                                <div className="text-xs text-slate-600">現在のプロファイル</div>
                                <div className="text-sm font-semibold">{specProfileLabel(data.specProfile)}</div>
                                <div className="text-xs text-slate-500">※ 出力される仕様書本文が変化します。</div>
                              </div>
                            </div>

                            {data.specProfile === "gunma" ? (
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Checkbox
                                  label="全数検査（厳格）"
                                  checked={data.gunmaAllInspection}
                                  onChange={(v) => setData((p) => ({ ...p, gunmaAllInspection: v }))}
                                  hint="工程・出荷前を含め、全数を原則化。"
                                />
                                <Checkbox
                                  label="媒体要件（厳格）"
                                  checked={data.gunmaMediaRequirements}
                                  onChange={(v) => setData((p) => ({ ...p, gunmaMediaRequirements: v }))}
                                  hint="媒体、チェックサム、命名規則等の規格化。"
                                />
                                <Checkbox
                                  label="メタデータ必須項目（厳格）"
                                  checked={data.gunmaMetadataMandatory}
                                  onChange={(v) => setData((p) => ({ ...p, gunmaMetadataMandatory: v }))}
                                  hint="必須欠落を不合格扱いとする運用。"
                                />
                              </div>
                            ) : (
                              <div className="mt-3 text-xs text-slate-600">
                                厳格を選択した場合のみ、「全数検査／媒体要件／メタデータ必須項目」を入力UI上のスイッチとして表示します。
                              </div>
                            )}
                          </Card>

                          <Card title="4) 付帯・出力設定">
                            <div className="grid grid-cols-2 gap-3">
                              <Checkbox
                                label="顧客提出用：見積書を出力"
                                checked={data.includeQuotation}
                                onChange={(v) => setData((p) => ({ ...p, includeQuotation: v }))}
                              />
                              <Checkbox
                                label="顧客提出用：単価算定根拠（別紙）を同梱"
                                checked={data.includePriceRationalePage}
                                onChange={(v) => setData((p) => ({ ...p, includePriceRationalePage: v }))}
                                hint="見積書の次ページとして、単価の積算根拠（L0〜）を出力します。"
                              />
                              <Checkbox
                                label="顧客提出用：案件固定費の算定根拠（別紙）を同梱"
                                checked={data.includeFixedCostRationalePage}
                                onChange={(v) => setData((p) => ({ ...p, includeFixedCostRationalePage: v }))}
                                hint="見積書の次ページ以降として、初期セットアップ費・管理費・付帯定額の内訳と算定根拠を出力します。"
                              />

<Checkbox
  label="顧客提出用：パラメータ表（別紙）を同梱"
  checked={data.includeParameterTables}
  onChange={(v) => setData((p) => ({ ...p, includeParameterTables: v }))}
  hint="単価（基礎単価・加算・検査倍率）および固定費（セットアップ費・管理費・付帯定額）の“表”を、別紙として出力します。"
/>
                              <Checkbox
                                label="内部用：計算書を出力"
                                checked={data.includeInternalCalc}
                                onChange={(v) => setData((p) => ({ ...p, includeInternalCalc: v }))}
                              />
                              <Checkbox
                                label="仕様書を出力"
                                checked={data.includeSpecDoc}
                                onChange={(v) => setData((p) => ({ ...p, includeSpecDoc: v }))}
                              />
                              <Checkbox
                                label="内部用：作業指示書を出力"
                                checked={data.includeInstructionDoc}
                                onChange={(v) => setData((p) => ({ ...p, includeInstructionDoc: v }))}
                              />
                              <Checkbox
                                label="内部用：検査表を出力"
                                checked={data.includeInspectionDoc}
                                onChange={(v) => setData((p) => ({ ...p, includeInspectionDoc: v }))}
                              />
                              <Checkbox
                                label="内部用：プラン差分説明ページを必ず出力"
                                checked={data.includeInternalPlanDiffPage}
                                onChange={(v) => setData((p) => ({ ...p, includeInternalPlanDiffPage: v }))}
                                hint="顧客提出用には含めない前提（内部用）。"
                              />
                            </div>

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Checkbox
                                label="燻蒸（防カビ・防虫）"
                                checked={data.includeFumigation}
                                onChange={(v) => setData((p) => ({ ...p, includeFumigation: v }))}
                              />
                              <Checkbox
                                label="長期保存資材への格納"
                                checked={data.includePacking}
                                onChange={(v) => setData((p) => ({ ...p, includePacking: v }))}
                              />
                              <Checkbox
                                label="集荷・納品"
                                checked={data.includePickupDelivery}
                                onChange={(v) => setData((p) => ({ ...p, includePickupDelivery: v }))}
                              />
                              <Checkbox
                                label="現地作業"
                                checked={data.includeOnsite}
                                onChange={(v) => setData((p) => ({ ...p, includeOnsite: v }))}
                              />
                              <Checkbox
                                label="暗号化・アクセス制御"
                                checked={data.includeEncryption}
                                onChange={(v) => setData((p) => ({ ...p, includeEncryption: v }))}
                              />
                              <NumberField
                                label="税率"
                                value={Math.round(data.taxRate * 100)}
                                onChange={(v) => setData((p) => ({ ...p, taxRate: Math.max(0, Math.min(100, v)) / 100 }))}
                                suffix="%"
                              />
                            </div>
                          </Card>

                          <Card
                            title="5) 対象資料（行ごとに単価が変わる）"
                            right={<TinyButton label="＋行を追加" onClick={addWorkItem} kind="primary" />}
                          >
                            <div className="space-y-4">
                              {data.workItems.map((w, idx) => {
                                const bd = calc.unitBreakdowns[w.id] ?? computeUnitPrice(data.tier, data.inspectionLevel, w);
                                return (
                                  <div key={w.id} className="rounded-2xl border bg-white p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                      <div className="text-sm font-semibold text-slate-800">行 {idx + 1}</div>
                                      <TinyButton label="削除" onClick={() => removeWorkItem(w.id)} kind="danger" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <TextField
                                        label="項目名"
                                        value={w.title}
                                        onChange={(v) => updateWorkItem(w.id, { title: v })}
                                        placeholder="例：古文書／図面／帳票 など"
                                      />
                                      <div className="grid grid-cols-3 gap-2">
                                        <NumberField
                                          label="数量"
                                          value={w.qty}
                                          onChange={(v) => updateWorkItem(w.id, { qty: v })}
                                          min={0}
                                        />
                                        <SelectField<WorkItem["unit"]>
                                          label="単位"
                                          value={w.unit}
                                          onChange={(v) => updateWorkItem(w.id, { unit: v })}
                                          options={[
                                            { value: "頁", label: "頁" },
                                            { value: "点", label: "点" },
                                            { value: "巻", label: "巻" },
                                          ]}
                                        />
                                        <div className="rounded-lg border bg-slate-50 px-3 py-2">
                                          <div className="text-xs text-slate-600">参考単価</div>
                                          <div className="text-sm font-semibold tabular-nums">{fmtJPY(bd.finalUnitPrice)} / {w.unit}</div>
                                          <div className="text-xs text-slate-500">（検査倍率込）</div>
                                        </div>
                                      </div>

                                      <SelectField<SizeClass>
                                        label="サイズ区分"
                                        value={w.sizeClass}
                                        onChange={(v) => updateWorkItem(w.id, { sizeClass: v })}
                                        options={[
                                          { value: "A4以下", label: "A4以下" },
                                          { value: "A3", label: "A3" },
                                          { value: "A2", label: "A2" },
                                          { value: "A2以上", label: "A2以上" },
                                          { value: "A1", label: "A1" },
                                          { value: "A0", label: "A0" },
                                          { value: "図面特大", label: "図面特大" },
                                        ]}
                                      />
                                      <SelectField<ColorMode>
                                        label="色"
                                        value={w.colorMode}
                                        onChange={(v) => updateWorkItem(w.id, { colorMode: v })}
                                        options={[
                                          { value: "mono", label: "白黒" },
                                          { value: "gray", label: "グレー" },
                                          { value: "color", label: "カラー" },
                                        ]}
                                      />

                                      <SelectField<Dpi>
                                        label="解像度（dpi）"
                                        value={w.dpi}
                                        onChange={(v) => updateWorkItem(w.id, { dpi: v })}
                                        options={[
                                          { value: 300, label: "300" },
                                          { value: 400, label: "400" },
                                          { value: 600, label: "600" },
                                        ]}
                                      />
                                      <SelectField<Handling>
                                        label="取扱区分"
                                        value={w.handling}
                                        onChange={(v) => updateWorkItem(w.id, { handling: v })}
                                        options={[
                                          { value: "normal", label: "通常" },
                                          { value: "fragile", label: "脆弱・破損懸念" },
                                          { value: "bound", label: "製本（裁断不可等）" },
                                          { value: "mylars", label: "マイラー図面等" },
                                          { value: "mixed", label: "混在（個別判断）" },
                                        ]}
                                      />

                                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <Label>出力形式</Label>
                                          <div className="flex flex-wrap gap-2">
                                            {(["PDF", "PDF/A", "TIFF", "JPEG", "JPEG2000", "TXT", "XML"] as FileFormat[]).map((f) => {
                                              const checked = w.formats.includes(f);
                                              return (
                                                <label key={f} className="flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs">
                                                  <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(e) => {
                                                      const next = e.target.checked
                                                        ? Array.from(new Set([...w.formats, f]))
                                                        : w.formats.filter((x) => x !== f);
                                                      updateWorkItem(w.id, { formats: next });
                                                    }}
                                                  />
                                                  <span>{f}</span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                          <div className="mt-1 text-xs text-slate-500">※ 形式は複数選択可能。形式ごとに加算されます。</div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                          <Checkbox
                                            label="OCR（文字認識）"
                                            checked={w.ocr}
                                            onChange={(v) => updateWorkItem(w.id, { ocr: v })}
                                            hint="OCRの有無で単価に加算が入ります。"
                                          />
                                          <SelectField<MetadataLevel>
                                            label="メタデータ"
                                            value={w.metadataLevel}
                                            onChange={(v) => updateWorkItem(w.id, { metadataLevel: v })}
                                            options={[
                                              { value: "none", label: "なし" },
                                              { value: "basic", label: "基本" },
                                              { value: "rich", label: "充実" },
                                            ]}
                                            hint="詳細／厳格の場合、仕様書側で要件（検査、媒体、メタデータ等）が増補されます。"
                                          />
                                        </div>
                                      </div>

                                      <div className="md:col-span-2">
  <TextAreaField
    label="備考（案件個別）"
    value={w.notes ?? ""}
    onChange={(v) => updateWorkItem(w.id, { notes: v })}
    placeholder="例：禁裁断、欠損あり、ページ順の注意等"
    rows={3}
  />
</div>

                                      {data.showUnitPriceBreakdown ? (
                                        <div className="md:col-span-2 rounded-xl border bg-slate-50 p-3">
                                          <div className="text-xs font-semibold text-slate-700 mb-2">参考単価 内訳（税抜・概算）</div>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                            <div>基礎：{fmtJPY(bd.base)}</div>
                                            <div>サイズ：{fmtJPY(bd.size)}</div>
                                            <div>色：{fmtJPY(bd.color)}</div>
                                            <div>dpi：{fmtJPY(bd.dpi)}</div>
                                            <div>形式：{fmtJPY(bd.formats)}</div>
                                            <div>OCR：{fmtJPY(bd.ocr)}</div>
                                            <div>メタデータ：{fmtJPY(bd.metadata)}</div>
                                            <div>取扱：{fmtJPY(bd.handling)}</div>
                                            <div className="md:col-span-2">小計：{fmtJPY(bd.subtotal)} / {w.unit}</div>
                                            <div className="md:col-span-2">検査倍率：×{bd.inspectionMultiplier.toFixed(2)} → {fmtJPY(bd.finalUnitPrice)} / {w.unit}</div>
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </Card>

                          <Card
                            title="6) 備品実費等（自由入力：品目＋金額 → 見積反映）"
                            right={<TinyButton label="＋追加" onClick={addMiscExpense} kind="primary" />}
                          >
                            {data.miscExpenses.length === 0 ? (
                              <div className="text-sm text-slate-600">
                                追加がない場合は空のままでよい。未知の備品・資材等の実費が出た際に、ここへ「文字列＋金額」を追加し、そのまま見積書へ反映します。
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {data.miscExpenses.map((m) => (
                                  <div key={m.id} className="rounded-xl border bg-white p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                      <div className="text-sm font-semibold text-slate-800">備品実費等</div>
                                      <TinyButton label="削除" onClick={() => removeMiscExpense(m.id)} kind="danger" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <TextField label="品目（自由入力）" value={m.label} onChange={(v) => updateMiscExpense(m.id, { label: v })} />
                                      <NumberField label="金額（税抜）" value={m.amount} onChange={(v) => updateMiscExpense(m.id, { amount: v })} suffix="円" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </Card>

                          <Card title="7) 概算合計（税抜・税込）">
                            <div className="grid grid-cols-3 gap-3">
                              <div className="rounded-xl border bg-white p-3">
                                <div className="text-xs text-slate-600">小計（税抜）</div>
                                <div className="text-lg font-semibold tabular-nums">{fmtJPY(calc.subtotal)}</div>
                              </div>
                              <div className="rounded-xl border bg-white p-3">
                                <div className="text-xs text-slate-600">消費税</div>
                                <div className="text-lg font-semibold tabular-nums">{fmtJPY(calc.tax)}</div>
                              </div>
                              <div className="rounded-xl border bg-slate-900 p-3 text-white">
                                <div className="text-xs opacity-80">合計（税込）</div>
                                <div className="text-lg font-semibold tabular-nums">{fmtJPY(calc.total)}</div>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-slate-600">
                              ※ これは概算であり、現物確認・数量確定・要件確定後に精算されます。特に「単価設定」は実務上の最大のレバーであり、ここは運用しながら調整してください。
                            </div>
                          </Card>
                        </div>
            ) : null}

            {view === "instruction" ? (
              <div className="space-y-4">
                {data.includeInstructionDoc ? (
                  <Page title="作業指示書（内部用）">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="text-xs font-semibold text-slate-700">案件</div>
                          <div className="mt-1 text-sm text-slate-900">
                            <div>顧客名: {data.clientName || "（未入力）"}</div>
                            <div className="mt-0.5">案件名: {data.projectName || "（未入力）"}</div>
                            <div className="mt-0.5">納期目安: {data.dueDate || "（未入力）"}</div>
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="text-xs font-semibold text-slate-700">作業要件スイッチ</div>
                          <div className="mt-1 space-y-0.5 text-sm text-slate-900">
                            <div>標準: {specProfileLabel(data.specProfile)}</div>
                            <div>媒体要件: {specFlags.requireMedia ? "必須" : "任意"}</div>
                            <div>メタデータ: {specFlags.requireMetadata ? "必須" : "任意"}</div>
                            <div>検査: {specFlags.fullInspection ? "全数検査" : inspectionLabel(data.inspectionLevel)}</div>
                          </div>
                        </div>
                      </div>

                      
<div className="rounded-lg border border-slate-200 bg-white p-3">
  <div className="text-xs font-semibold text-slate-700">作業一覧（内部指示）</div>
  <div className="mt-2 overflow-auto">
    <table className="w-full text-xs">
      <thead className="bg-slate-50">
        <tr className="text-left">
          <th className="p-2 border-b w-[26%]">作業</th>
          <th className="p-2 border-b w-[12%]">数量</th>
          <th className="p-2 border-b w-[26%]">スキャン仕様</th>
          <th className="p-2 border-b w-[18%]">付帯</th>
          <th className="p-2 border-b w-[18%]">備考</th>
        </tr>
      </thead>
      <tbody>
        {data.workItems.length === 0 ? (
          <tr>
            <td className="p-3 text-slate-500" colSpan={5}>
              作業項目が未入力です。
            </td>
          </tr>
        ) : (
          data.workItems.map((w) => (
            <tr key={w.id} className="align-top">
              <td className="p-2 border-b">
                <div className="font-medium text-slate-900">{w.title}</div>
                <div className="text-[11px] text-slate-600">
                  サイズ:{sizeLabel(w.sizeClass)} / 色:{colorModeLabel(w.colorMode)} / 解像度:{dpiLabel(w.dpi)}
                </div>
              </td>
              <td className="p-2 border-b">
                {toInt(w.qty)} {w.unit}
              </td>
              <td className="p-2 border-b">
                <div>形式: {w.formats.map(formatLabel).join(", ")}</div>
                <div>取扱: {handlingLabel(w.handling)}</div>
              </td>
              <td className="p-2 border-b">
                <div>OCR: {w.ocr ? "あり" : "なし"}</div>
                <div>メタデータ: {metadataLabel(w.metadataLevel)}</div>
              </td>
              <td className="p-2 border-b whitespace-pre-wrap">{w.notes || "—"}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</div>
<div className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="text-xs font-semibold text-slate-700">備品・実費（自由入力）</div>
                        <div className="mt-2">
                          {data.miscExpenses.length === 0 ? (
                            <div className="text-sm text-slate-500">登録なし</div>
                          ) : (
                            <div className="space-y-1">
                              {data.miscExpenses.map((m) => (
                                <div key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
                                  <div className="text-slate-800">{m.label || "（名称未入力）"}</div>
                                  <div className="font-mono text-slate-900">{fmtJPY(m.amount)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="text-xs font-semibold text-slate-700">備考</div>
                        <div className="mt-2 whitespace-pre-wrap text-sm text-slate-900">{data.notes || "（未入力）"}</div>
                      </div>
                    </div>
                  </Page>
                ) : (
                  <Card title="指示書（出力OFF）">
                    <div className="text-sm text-slate-700">入力画面の「出力対象」で「指示書」をONにすると、このタブに指示書が生成されます。</div>
                  </Card>
                )}

                {data.includeInternalCalc ? (
                  <Page title="内部用：計算書（ドラフト）">
                                                  <div className="mb-2 text-xs text-slate-600">
                                                    内部用のため、顧客提出用の体裁ではなく、計算の前提・内訳を残す。
                                                  </div>

                                                  <div className="rounded-lg border bg-slate-50 p-3 text-sm mb-3">
                                                    <div className="font-semibold">前提</div>
                                                    <div className="text-xs text-slate-600">
                                                      <ul className="list-disc space-y-1 pl-5">
                                                        <li>プラン：{tierLabel(data.tier)}（基礎単価 {fmtJPY(TIER_BASE_PER_UNIT[data.tier])}/頁）</li>
                                                        <li>検査：{inspectionLabel(data.inspectionLevel)}（倍率 ×{INSPECTION_MULTIPLIER[data.inspectionLevel].toFixed(2)}）</li>
                                                        <li>仕様プロファイル：{specProfileLabel(data.specProfile)}</li>
                                                        {data.specProfile === "gunma" ? (
                                                          <li>
                                                            厳格オプション：全数検査={data.gunmaAllInspection ? "ON" : "OFF"}／媒体要件={data.gunmaMediaRequirements ? "ON" : "OFF"}／メタデータ必須=
                                                            {data.gunmaMetadataMandatory ? "ON" : "OFF"}
                                                          </li>
                                                        ) : null}
                                                      </ul>
                                                    </div>
                                                  </div>

                                                  <LineItemTable items={calc.lineItems} />

                                                  <div className="mt-3 grid grid-cols-3 gap-3">
                                                    <div className="rounded-lg border bg-white p-3">
                                                      <div className="text-xs text-slate-600">小計（税抜）</div>
                                                      <div className="text-sm font-semibold tabular-nums">{fmtJPY(calc.subtotal)}</div>
                                                    </div>
                                                    <div className="rounded-lg border bg-white p-3">
                                                      <div className="text-xs text-slate-600">消費税</div>
                                                      <div className="text-sm font-semibold tabular-nums">{fmtJPY(calc.tax)}</div>
                                                    </div>
                                                    <div className="rounded-lg border bg-slate-900 p-3 text-white">
                                                      <div className="text-xs opacity-80">合計（税込）</div>
                                                      <div className="text-sm font-semibold tabular-nums">{fmtJPY(calc.total)}</div>
                                                    </div>
                                                  </div>

                                

                                                </Page>
                ) : null}

                {data.includeInternalPlanDiffPage ? (
                  <Page title="内部資料：プラン差分説明（内部用）">
                    <div className="mb-2 text-xs text-slate-600">
                      顧客提示の前に、プランの差（何が増えて何が減るか）を言語化しておくための内部資料。
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-800">
                      <div className="font-semibold">目的</div>
                      <div className="mt-1 text-slate-700">
                        顧客提示の前に、プランの差（何が増えて何が減るか）を、帳票として崩れない形で整理する。
                      </div>

                      <div className="mt-4 font-semibold">エコノミー</div>
                      <ul className="list-disc space-y-1 pl-5 text-slate-700">
                        <li>価格優先。検査は「抜取」までを基本に、工程の深追いはしない。</li>
                        <li>仕様書は必要十分の粒度（標準〜詳細）を選択可能。</li>
                      </ul>

                      <div className="mt-4 font-semibold">スタンダード</div>
                      <ul className="list-disc space-y-1 pl-5 text-slate-700">
                        <li>工程内の是正（撮り直し、命名ルール厳守、軽微な補正）を前提にした運用。</li>
                        <li>詳細レベルのメタデータ（項目群・整合性）を実務レベルで回す。</li>
                      </ul>

                      <div className="mt-4 font-semibold">プレミアム</div>
                      <ul className="list-disc space-y-1 pl-5 text-slate-700">
                        <li>品質責任を強く負う前提。全数検査・二重検査、監査可能な情報管理、詳細ログ等を含む。</li>
                        <li>厳格仕様（「全数検査／媒体要件／メタデータ必須」をONにした案件）にも耐える。</li>
                      </ul>

                      <div className="mt-4 text-slate-600">
                        ※ 本システムでは、差分を「基礎単価（L0）」「加算要素（L1〜）」「検査倍率」「案件固定費（F0〜）」に分解して表現している。
                      </div>
                    </div>
                  </Page>
                ) : null}

                {data.includeInternalPlanDiffPage ? (
                  <Page title="内部資料：3プラン比較詳細（内部用）">
                    <div className="mb-2 text-xs text-slate-600">
                      3プランの差分が「どこに現れるか（L0 と F0〜）」を、内部向けに一覧化する。加算要素（サイズ/色/dpi/形式/OCR等）は原則としてプラン共通であり、検査倍率・仕様スイッチと組み合わせて最終単価となる。
                    </div>

                    {(() => {
                      const tiers: Tier[] = ["economy", "standard", "premium"];
                      const fixedSum = (t: Tier) => PROJECT_FIXED_FEES[t].setup + PROJECT_FIXED_FEES[t].management;

                      return (
                        <div className="space-y-5">
                          <div>
                            <div className="text-sm font-semibold text-slate-900 mb-2">1) L0（基礎単価）・F0〜（案件固定費）の比較</div>
                            <div className="overflow-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-50">
                                  <tr className="text-left">
                                    <th className="p-2 border-b w-[16%]">プラン</th>
                                    <th className="p-2 border-b text-right">L0 基礎単価（円/頁）</th>
                                    <th className="p-2 border-b text-right">F0 セットアップ</th>
                                    <th className="p-2 border-b text-right">F1 管理・進行</th>
                                    <th className="p-2 border-b text-right">F0+F1 合計</th>
                                    <th className="p-2 border-b">含意（短い注記）</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tiers.map((t) => (
                                    <tr key={t} className="align-top">
                                      <td className="p-2 border-b font-semibold text-slate-800">{tierLabel(t)}</td>
                                      <td className="p-2 border-b text-right tabular-nums">{fmtJPY(TIER_BASE_PER_UNIT[t])}</td>
                                      <td className="p-2 border-b text-right tabular-nums">{fmtJPY(PROJECT_FIXED_FEES[t].setup)}</td>
                                      <td className="p-2 border-b text-right tabular-nums">{fmtJPY(PROJECT_FIXED_FEES[t].management)}</td>
                                      <td className="p-2 border-b text-right tabular-nums font-semibold">{fmtJPY(fixedSum(t))}</td>
                                      <td className="p-2 border-b text-slate-700">
                                        {t === "economy"
                                          ? "価格優先。工程是正・証跡は最小限。"
                                          : t === "standard"
                                            ? "工程内是正・整合性運用を前提。"
                                            : "品質責任・監査耐性（ログ等）を強く持つ。"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-semibold text-slate-900 mb-2">2) 検査倍率（Inspection Multiplier）の比較</div>
                            <div className="overflow-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-50">
                                  <tr className="text-left">
                                    <th className="p-2 border-b w-[30%]">検査レベル</th>
                                    <th className="p-2 border-b text-right">倍率</th>
                                    <th className="p-2 border-b">備考</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(["none", "sample", "full", "double_full"] as InspectionLevel[]).map((lv) => (
                                    <tr key={lv}>
                                      <td className="p-2 border-b font-semibold text-slate-800">{inspectionLabel(lv)}</td>
                                      <td className="p-2 border-b text-right tabular-nums">×{INSPECTION_MULTIPLIER[lv].toFixed(2)}</td>
                                      <td className="p-2 border-b text-slate-700">
                                        {lv === "sample"
                                          ? "抜取検査（品質の下振れリスクは残る）"
                                          : lv === "full"
                                            ? "全数検査（手戻り・是正を織り込む）"
                                            : lv === "double_full"
                                              ? "二重検査（監査耐性・証跡強化）"
                                              : "検査なし（工程内での是正は別途合意）"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
                            <div className="font-semibold text-slate-800 mb-1">3) 単価の構造（共通の見方）</div>
                            <div className="space-y-1">
                              <div>・単価（円/頁）は概ね「L0（プラン基礎単価）＋L1〜（加算要素）」×「検査倍率」で算定する。</div>
                              <div>・加算要素（サイズ/色/dpi/形式/OCR/メタデータ/取扱い等）は、プランではなく要件で決まる（＝プラン差の主因は L0 と F0〜）。</div>
                              <div>・案件固定費（F0〜）は「案件の立上げ・進行・管理・情報管理・監査耐性」に対応し、プランが上がるほど厚くなる。</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </Page>
                ) : null}
              </div>
            ) : null}

            {view === "estimate" ? (
              (() => {
                const totalPages =
                  (data.includeQuotation ? 1 : 0) +
                  (data.includeQuotation && data.includePriceRationalePage ? 1 : 0) +
                  (data.includeQuotation && data.includeFixedCostRationalePage ? 1 : 0);

                let pageNo = 0;
                const nextNo = () => {
                  pageNo += 1;
                  return pageNo;
                };

                const pages: ReactNode[] = [];

                if (data.includeQuotation) {
                  const no = nextNo();
                  pages.push(
                    <DocPage
                      key="quotation"
                      header={<DocHeader docTitle="御見積書" data={data} />}
                      footer={<DocFooter pageNo={no} totalPages={totalPages} />}
                    >
                      <div className="mb-4 text-[12px] text-slate-800">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                          <div><span className="font-semibold">プラン：</span>{tierLabel(data.tier)}</div>
                          <div><span className="font-semibold">検査：</span>{inspectionLabel(data.inspectionLevel)}</div>
                          <div><span className="font-semibold">仕様レベル：</span>{specProfilePublicLabel(data.specProfile)}</div>
                          <div><span className="font-semibold">税率：</span>{Math.round(data.taxRate * 100)}%</div>
                        </div>
                      </div>

                      <div className="text-sm font-semibold text-slate-900 mb-2">見積明細</div>
                      <LineItemTable items={calc.lineItems} />

                      <div className="mt-4 flex justify-end">
                        <table className="w-72 text-sm">
                          <tbody>
                            <tr>
                              <td className="py-1 text-slate-700">小計</td>
                              <td className="py-1 text-right tabular-nums">{fmtJPY(calc.subtotal)}</td>
                            </tr>
                            <tr>
                              <td className="py-1 text-slate-700">消費税</td>
                              <td className="py-1 text-right tabular-nums">{fmtJPY(calc.tax)}</td>
                            </tr>
                            <tr className="border-t">
                              <td className="py-1 font-semibold text-slate-900">合計</td>
                              <td className="py-1 text-right tabular-nums font-semibold text-slate-900">{fmtJPY(calc.total)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-6 text-xs text-slate-700">
                        <div className="font-semibold mb-1">注記</div>
                        <ol className="list-decimal pl-5 space-y-1">
                          <li>数量および作業範囲は、確定に伴い調整されることがあります。</li>
                          <li>単価の算定根拠は、別紙「単価算定根拠（倍率・加算の積算）」にて示します。</li>
                          <li>案件固定費の算定根拠は、別紙「案件固定費算定根拠（F0〜）」にて示します。</li>
                          <li>価格は税抜表示とし、消費税を別途加算します。</li>
                          <li>納品・検査・仕様の詳細は、別紙仕様書に従います。</li>
                        </ol>
                      </div>
                    </DocPage>
                  );
                }

                if (data.includeQuotation && data.includePriceRationalePage) {
                  const no = nextNo();
                  pages.push(
                    <DocPage
                      key="priceRationale"
                      header={<DocHeader docTitle="単価算定根拠（別紙）" data={data} />}
                      footer={<DocFooter pageNo={no} totalPages={totalPages} />}
                    >

                                <div className="mb-3 text-xs text-slate-600">
                                  本別紙は、見積書の単価がどのように算定されたか（基礎単価＋加算要素×検査倍率）を、顧客向けに明示するためのものです。
                                  端数処理は「円単位で四捨五入」を前提とします。
                                </div>

                                <div className="space-y-4">
                                  {data.workItems.map((w, i) => {
                                    const bd = calc.unitBreakdowns[w.id];
                                    if (!bd) return null;
                                    const formatParts = w.formats.map((f) => formatLabel(f)).join(", ");
                                    return (
                                      <div key={w.id} className="rounded-lg border border-slate-200 bg-white p-3">
                                        <div className="flex items-baseline justify-between gap-3">
                                          <div className="text-sm font-semibold text-slate-800">
                                            {i + 1}. {w.title || "（無題）"}
                                          </div>
                                          <div className="text-xs text-slate-600">
                                            数量：{Math.max(0, w.qty).toLocaleString()} {w.unit}
                                          </div>
                                        </div>
                                        <div className="mt-1 text-xs text-slate-600">
                                          サイズ：{sizeLabel(w.sizeClass)} ／ 色：{colorModeLabel(w.colorMode)} ／ 解像度：{dpiLabel(w.dpi)} ／ 形式：{formatParts} ／ OCR：
                                          {w.ocr ? "あり" : "なし"} ／ メタデータ：{metadataLabel(w.metadataLevel)} ／ 取扱：{handlingLabel(w.handling)}
                                        </div>

                                        <table className="mt-3 w-full text-xs">
                                          <thead>
                                            <tr className="border-b bg-slate-50">
                                              <th className="py-2 px-2 text-left font-semibold text-slate-700">コード</th>
                                              <th className="py-2 px-2 text-left font-semibold text-slate-700">要素</th>
                                              <th className="py-2 px-2 text-right font-semibold text-slate-700">金額（円/単位）</th>
                                              <th className="py-2 px-2 text-left font-semibold text-slate-700">備考</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr className="border-b">
                                              <td className="py-2 px-2 font-mono">L0</td>
                                              <td className="py-2 px-2">基礎単価（プラン）</td>
                                              <td className="py-2 px-2 text-right tabular-nums">{fmtJPY(bd.base)}</td>
                                              <td className="py-2 px-2">プラン：{tierLabel(data.tier)}</td>
                                            </tr>
                                            <tr className="border-b">
                                              <td className="py-2 px-2 font-mono">L1</td>
                                              <td className="py-2 px-2">サイズ加算</td>
                                              <td className="py-2 px-2 text-right tabular-nums">{fmtJPY(bd.size)}</td>
                                              <td className="py-2 px-2">{sizeLabel(w.sizeClass)}</td>
                                            </tr>
                                            <tr className="border-b">
                                              <td className="py-2 px-2 font-mono">L2</td>
                                              <td className="py-2 px-2">色加算</td>
                                              <td className="py-2 px-2 text-right tabular-nums">{fmtJPY(bd.color)}</td>
                                              <td className="py-2 px-2">{colorModeLabel(w.colorMode)}</td>
                                            </tr>
                                            <tr className="border-b">
                                              <td className="py-2 px-2 font-mono">L3</td>
                                              <td className="py-2 px-2">解像度加算</td>
                                              <td className="py-2 px-2 text-right tabular-nums">{fmtJPY(bd.dpi)}</td>
                                              <td className="py-2 px-2">{dpiLabel(w.dpi)}</td>
                                            </tr>
                                            <tr className="border-b">
                                              <td className="py-2 px-2 font-mono">L4</td>
                                              <td className="py-2 px-2">形式加算</td>
                                              <td className="py-2 px-2 text-right tabular-nums">{fmtJPY(bd.formats)}</td>
                                              <td className="py-2 px-2">{formatParts || "—"}</td>
                                            </tr>

{w.formats.length > 1
  ? w.formats.map((f, idx) => (
      <tr key={String(f) + idx} className="border-b">
        <td className="py-2 px-2 font-mono">{"L4-" + String(idx + 1)}</td>
        <td className="py-2 px-2">形式加算（内訳）</td>
        <td className="py-2 px-2 text-right tabular-nums">{fmtJPY(FORMAT_ADDER[f] ?? 0)}</td>
        <td className="py-2 px-2">{formatLabel(f)}</td>
      </tr>
    ))
  : null}
                                            <tr className="border-b">
                                              <td className="py-2 px-2 font-mono">L5</td>
                                              <td className="py-2 px-2">OCR加算</td>
                                              <td className="py-2 px-2 text-right tabular-nums">{fmtJPY(bd.ocr)}</td>
                                              <td className="py-2 px-2">{w.ocr ? "OCRあり" : "OCRなし"}</td>
                                            </tr>
                                            <tr className="border-b">
                                              <td className="py-2 px-2 font-mono">L6</td>
                                              <td className="py-2 px-2">メタデータ加算</td>
                                              <td className="py-2 px-2 text-right tabular-nums">{fmtJPY(bd.metadata)}</td>
                                              <td className="py-2 px-2">{metadataLabel(w.metadataLevel)}</td>
                                            </tr>
                                            <tr className="border-b">
                                              <td className="py-2 px-2 font-mono">L7</td>
                                              <td className="py-2 px-2">取扱加算</td>
                                              <td className="py-2 px-2 text-right tabular-nums">{fmtJPY(bd.handling)}</td>
                                              <td className="py-2 px-2">{handlingLabel(w.handling)}</td>
                                            </tr>

                                            <tr className="border-b bg-white">
                                              <td className="py-2 px-2 font-mono">A1</td>
                                              <td className="py-2 px-2 font-semibold">小計（検査倍率前）</td>
                                              <td className="py-2 px-2 text-right font-semibold tabular-nums">{fmtJPY(bd.subtotal)}</td>
                                              <td className="py-2 px-2">L0〜L7の合算</td>
                                            </tr>
                                            <tr className="border-b">
                                              <td className="py-2 px-2 font-mono">M1</td>
                                              <td className="py-2 px-2">検査倍率</td>
                                              <td className="py-2 px-2 text-right tabular-nums">×{bd.inspectionMultiplier.toFixed(2)}</td>
                                              <td className="py-2 px-2">{inspectionLabel(data.inspectionLevel)}</td>
                                            </tr>
                                            <tr>
                                              <td className="py-2 px-2 font-mono">P1</td>
                                              <td className="py-2 px-2 font-semibold">最終単価</td>
                                              <td className="py-2 px-2 text-right font-semibold tabular-nums">{fmtJPY(bd.finalUnitPrice)}</td>
                                              <td className="py-2 px-2">round(A1 × M1)</td>
                                            </tr>
                                          </tbody>
                                        </table>

                                        <div className="mt-2 text-xs text-slate-600">
                                          金額（本行）：{fmtJPY(bd.finalUnitPrice)} × {Math.max(0, w.qty).toLocaleString()} = {fmtJPY(bd.finalUnitPrice * Math.max(0, w.qty))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="mt-4 text-xs text-slate-600">
                                  参考：案件固定費（初期セットアップ費／進行管理・品質管理費）は、ページ単価とは別に案件単位で計上します。
                                </div>
                    </DocPage>
                  );
                }

                if (data.includeQuotation && data.includeFixedCostRationalePage) {
                  const no = nextNo();
                  pages.push(
                    <DocPage
                      key="fixedCostRationale"
                      header={<DocHeader docTitle="案件固定費算定根拠（別紙）" data={data} />}
                      footer={<DocFooter pageNo={no} totalPages={totalPages} />}
                    >

                                <div className="mb-3 text-xs text-slate-600">
                                  本別紙は、見積書に計上される「案件固定費（初期セットアップ費／進行管理・品質管理費）」および「付帯作業（定額）」の積算根拠を、顧客向けに明示するためのものです。
                                  作業単価（頁単価等）の積算根拠は、前ページ（単価算定根拠）をご参照ください。
                                </div>

                                {(() => {
                                  const rows = buildFixedCostRows(data);
                                  const fixedSubtotal = rows.filter((r) => r.enabled).reduce((s, r) => s + r.amount, 0);
                                  const miscSubtotal = calc.lineItems
                                    .filter((li) => li.kind === "misc")
                                    .reduce((s, li) => s + li.amount, 0);
                                  const subtotal = fixedSubtotal + miscSubtotal;
                                  const tax = Math.round(subtotal * data.taxRate);
                                  const total = subtotal + tax;

                                  return (
                                    <div className="space-y-4">
                                      <div className="rounded-lg border border-slate-200 bg-white">
                                        <div className="border-b border-slate-200 px-3 py-2 text-sm font-semibold">固定費・付帯定額の内訳（F0〜）</div>
                                        <table className="w-full text-xs">
                                          <thead className="bg-slate-50">
                                            <tr>
                                              <th className="py-2 px-2 text-left">コード</th>
                                              <th className="py-2 px-2 text-left">項目</th>
                                              <th className="py-2 px-2 text-left">適用</th>
                                              <th className="py-2 px-2 text-right">金額（税抜）</th>
                                              <th className="py-2 px-2 text-left">算定根拠（要旨）</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {rows.map((r) => (
                                              <tr key={r.code} className="border-t border-slate-200">
                                                <td className="py-2 px-2 font-mono">{r.code}</td>
                                                <td className="py-2 px-2">{r.label}</td>
                                                <td className="py-2 px-2">
                                                  <span
                                                    className={
                                                      r.enabled
                                                        ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                                                        : "inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                                                    }
                                                  >
                                                    {r.enabled ? "ON（計上）" : "OFF（不計上）"}
                                                  </span>
                                                </td>
                                                <td className={"py-2 px-2 text-right tabular-nums " + (r.enabled ? "" : "text-slate-400")}>
                                                  {fmtJPY(r.amount)}
                                                </td>
                                                <td className={"py-2 px-2 " + (r.enabled ? "" : "text-slate-400")}>{r.rationale}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>

                                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                                          <div className="text-sm font-semibold">固定費・付帯定額 小計（税抜）</div>
                                          <div className="mt-1 text-xl font-bold tabular-nums">{fmtJPY(fixedSubtotal)}</div>
                                          <div className="mt-2 text-xs text-slate-600">
                                            ※ OFF の項目は「単価は表示するが、金額には算入しない」扱いです（顧客と合意した範囲のみ計上）。
                                          </div>
                                        </div>

                                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                                          <div className="text-sm font-semibold">実費（入力値） 小計（税抜）</div>
                                          <div className="mt-1 text-xl font-bold tabular-nums">{fmtJPY(miscSubtotal)}</div>
                                          <div className="mt-2 text-xs text-slate-600">
                                            ※ 保存箱・中性紙封筒・外付けHDD等の実費項目（0円初期）を入力した場合に反映されます。
                                          </div>
                                        </div>
                                      </div>

                                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                                        <div className="flex items-baseline justify-between">
                                          <div className="text-sm font-semibold">本別紙の対象合計（固定費＋実費）</div>
                                          <div className="text-xs text-slate-600">税率：{Math.round(data.taxRate * 100)}%</div>
                                        </div>
                                        <div className="mt-2 space-y-1 text-sm">
                                          <div className="flex justify-between">
                                            <span>小計（税抜）</span>
                                            <span className="tabular-nums">{fmtJPY(subtotal)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>消費税</span>
                                            <span className="tabular-nums">{fmtJPY(tax)}</span>
                                          </div>
                                          <div className="flex justify-between text-base font-bold">
                                            <span>合計（税込）</span>
                                            <span className="tabular-nums">{fmtJPY(total)}</span>
                                          </div>
                                        </div>

                                        <div className="mt-3 rounded-md bg-slate-50 p-2 text-xs text-slate-700">
                                          参考：見積書全体の合計（税込）は {fmtJPY(calc.total)} です（作業単価×数量の部分は別紙「単価算定根拠」で説明）。
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                    </DocPage>
                  );
                }

                return (
                  <div className="space-y-4">
                    {pages}

                                      </div>
                );
              })()
            ) : null}

            {view === "spec" ? (
              <div className="print-area">
                {(() => {
                  const sections = buildSpecSections(data);
                  const chunks =
                    sections.length <= 8
                      ? [sections.slice(0, 5), sections.slice(5)]
                      : [sections.slice(0, 4), sections.slice(4, 8), sections.slice(8)];
                  const pages = chunks.filter((c) => c.length > 0);
                  const total = pages.length;

                  return pages.map((chunk, idx) => (
                    <DocPage
                      key={`spec-${idx}`}
                      header={<DocHeader docTitle={`仕様書（${specProfilePublicLabel(data.specProfile)}）`} data={data} />}
                      footer={
                        <DocFooter
                          pageNo={idx + 1}
                          totalPages={total}
                          note="本書は、入力条件に基づく仕様書（ドラフト）である。"
                        />
                      }
                    >
                      {idx === 0 ? (
                        <div className="mb-4 text-sm leading-relaxed">
                          <div>宛先：{data.clientName || "（未入力）"} 御中</div>
                          <div>作成者：株式会社◯◯　総務部</div>
                          <div>件名：{data.projectName || "（未入力）"}　仕様書</div>
                          <div>仕様レベル：{specProfilePublicLabel(data.specProfile)}</div>
                          <div>
                            発行日：{data.issueDate || "—"} ／ 納期：{data.dueDate || "—"}
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-4">
                        {chunk.map((s, i) => (
                          <section key={`${s.title}-${i}`}>
                            <div className="font-semibold">{s.title}</div>
                            <div className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-800">
                              {s.body}
                            </div>
                          </section>
                        ))}
                      </div>
                    </DocPage>
                  ));
                })()}
              </div>
            ) : null}

            {view === "inspection" ? (
              <div className="space-y-4">
                {data.includeInspectionDoc ? (
                  <Page title="検査表（内部用）">
                    <div className="space-y-4">
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="text-xs font-semibold text-slate-700">検査方式</div>
                        <div className="mt-2 space-y-1 text-sm text-slate-900">
                          <div>標準: {specProfileLabel(data.specProfile)}</div>
                          <div>検査: {specFlags.fullInspection ? "全数検査" : inspectionLabel(data.inspectionLevel)}</div>
                          <div>媒体要件: {specFlags.requireMedia ? "必須" : "任意"}</div>
                          <div>メタデータ: {specFlags.requireMetadata ? "必須" : "任意"}</div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="text-xs font-semibold text-slate-700">検査チェックリスト（例）</div>
                        <div className="mt-2 overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs text-slate-500">
                                <th className="py-2 pr-3">項目</th>
                                <th className="py-2 pr-3">判定基準</th>
                                <th className="py-2 pr-3">結果</th>
                                <th className="py-2">備考</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {[
                                ["画像欠落", "0件（全数）"],
                                ["傾き/天地", "許容範囲内"],
                                ["解像度/色", "指定プロファイル準拠"],
                                ["ファイル名規則", "規則どおり"],
                                ["メタデータ", specFlags.requireMetadata ? "必須項目の欠落なし" : "任意（提供分のみ）"],
                                ["媒体格納", specFlags.requireMedia ? "媒体要件準拠" : "任意"],
                              ].map(([item, criteria], i) => (
                                <tr key={i} className="align-top">
                                  <td className="py-2 pr-3 font-medium text-slate-900">{item}</td>
                                  <td className="py-2 pr-3 text-slate-700">{criteria}</td>
                                  <td className="py-2 pr-3 text-slate-500">□OK / □NG</td>
                                  <td className="py-2 text-slate-500">—</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                          注: 「全数検査」「媒体要件」「メタデータ必須項目」が規格化されている案件では、入力UIで「厳格」を選択し、各スイッチ（全数検査／媒体要件／メタデータ必須項目）をONにすることで、仕様書・検査書の本文に反映されます。
                        </div>
                      </div>
                    </div>
                  </Page>
                ) : (
                  <Card title="検査表（出力OFF）">
                    <div className="text-sm text-slate-700">入力画面の「出力対象」で「検査」をONにすると、このタブに検査表が生成されます。</div>
                  </Card>
                )}
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}