import { useMemo, useState, type ReactNode } from "react";

/**
 * v24_3.tsx
 * 単一ファイルで動く「見積＋内部計算＋仕様書」アプリ。
 * - コンパイルが通ることを最優先（未使用importなし、TSの到達不能警告なし）。
 * - 3プラン（Economy / Standard / Premium）
 * - 「NDL準拠／群馬仕様」など、仕様書の“規格スイッチ”を入力UIで再現
 * - 備品実費等（自由入力の品目＋金額）を見積に反映
 * - チェックボックスと単価計算が連動し、行ごとに「参考単価」を即時表示
 */

type Tier = "economy" | "standard" | "premium";
type SpecProfile = "standard" | "ndl" | "gunma";

type InspectionLevel = "none" | "sample" | "full" | "double_full";

type SizeClass = "A4以下" | "A3" | "A2" | "A1" | "A0" | "図面特大";
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
  includeInternalCalc: boolean;
  includeSpecDoc: boolean;
  includeInstructionDoc: boolean;
  includeInspectionDoc: boolean;

  // 仕様スイッチ
  specProfile: SpecProfile; // standard / ndl / gunma
  // 群馬仕様で「入力UI上のスイッチ」として再現する論点
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
  if (p === "standard") return "標準（簡易）";
  if (p === "ndl") return "NDL準拠（詳細）";
  return "群馬仕様（厳格）";
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

// ---- 仕様書（規格スイッチに応じて詳細度が変わる） ----

type SpecSection = { title: string; body: string };


function buildSpecSections(data: Data): SpecSection[] {
  const profile = data.specProfile;
  const flags = deriveSpecFlags(data);

  const sections: SpecSection[] = [];
  let n = 1;
  const push = (label: string, body: string) => {
    sections.push({ title: `${n}. ${label}`, body });
    n += 1;
  };

  push(
    "目的・範囲",
    "本仕様書は、対象資料のデジタル化（撮影・補正・データ作成）および納品要件について、受託者が遵守すべき基準を定めるものである。"
  );

  push(
    "対象資料・数量",
    data.workItems.length === 0
      ? "対象範囲は別途協議により確定する。"
      : data.workItems
          .map((w, i) => {
            const formats = w.formats.map((f) => formatLabel(f)).join(", ");
            return `${i + 1}. ${w.title || "（無題）"}：${Math.max(0, w.qty).toLocaleString()}${w.unit}（${sizeLabel(w.sizeClass)} / ${colorModeLabel(w.colorMode)} / ${dpiLabel(
              w.dpi
            )} / 形式:${formats || "—"} / OCR:${w.ocr ? "あり" : "なし"} / メタデータ:${metadataLabel(w.metadataLevel)}）`;
          })
          .join("\n")
  );

  push(
    "作業体制",
    [
      "・工程責任者を置き、作業計画・進捗・品質の統括を行う。",
      "・作業者は命名規則・取扱手順・補正基準を事前に共有し、工程内で逸脱が出ないよう運用する。",
      profile === "ndl" || profile === "gunma"
        ? "・仕様準拠（NDL／群馬）の場合、メタデータ整合・媒体要件・ログ保全の観点で、レビュー工程を追加する。"
        : "・標準（簡易）の場合も、最低限の品質確認（欠落・破損・判読不能等の検知）を実施する。",
    ].join("\n")
  );

  push(
    "作業工程",
    [
      "1) 受入・棚卸・前処理（資料状態の確認、通番/ラベル付与）",
      "2) 撮影・スキャン（解像度・色設定に従う）",
      "3) 画像補正（傾き補正、トリミング、必要に応じた軽微な濃度補正）",
      "4) データ生成（指定形式：TIFF/PDF/PDF-A/JPEG等）",
      "5) メタデータ作成（仕様に応じて必須項目を作成）",
      "6) 検査（抜取／全数／二重等。検査表により記録）",
      "7) 納品データ作成（フォルダ構成、命名規則、チェックサム等）",
      "8) 納品・受入確認・是正（必要時）",
    ].join("\n")
  );

  // --- 追加：納品構成・命名規則（不足しがちな実務記述を厚くする）
  push(
    "納品データ構成・命名規則",
    [
      "【基本方針】",
      "・納品データは、原則として「保存用（master）」「閲覧用（access）」「メタデータ（metadata）」「ログ・証跡（log）」の階層構造で管理する。",
      "・命名は、通番の一意性を担保し、後工程（検索・突合・監査）に耐える形式とする。",
      "",
      "【例：フォルダ構成】",
      "・/master/  … 保存用TIFF等（非圧縮想定）",
      "・/access/  … 閲覧用PDF/PDF-A/JPEG等",
      "・/metadata/ … メタデータCSV/TSV/XML等",
      "・/log/     … 検査表、是正履歴、チェックサム一覧等（プレミアム／厳格時）",
      "",
      "【例：命名規則（通番）】",
      "・（案件ID）_（資料ID）_（通番5桁）.tif  例：PJ001_DOC01_00001.tif",
      "・同一資料内で通番は欠番を作らない。欠番が生じる場合は理由をログへ記録する。",
      "",
      flags.requireMedia ? "【媒体・完全性】\n・チェックサム（例：SHA-256）一覧を作成し、納品媒体内に同梱する。" : "【媒体・完全性】\n・必要に応じ、チェックサム等の完全性手当を協議する。",
      "・色管理が必要な場合（カラー/高精細等）は、ICCプロファイルの埋込または別添を行う。",
    ].join("\n")
  );

  push(
    "品質基準・検査",
    [
      "・欠落（ページ抜け）、重複、判読不能、極端な傾き、過度のトリミング欠落を不適合とする。",
      flags.fullInspection ? "・検査は全数を原則とする。" : "・検査は抜取を基本とし、リスクに応じて全数へ移行する。",
      data.tier === "premium" || profile === "gunma"
        ? "・是正（再撮影・補正）を工程内で閉じる運用を前提とし、是正履歴を残す。"
        : "・軽微な是正（傾き等）は工程内で対応し、重大なものは協議により判断する。",
    ].join("\n")
  );

  push(
    profile === "ndl" || profile === "gunma" ? "メタデータ（NDL／厳格）" : "メタデータ（任意）",
    [
      flags.requireMetadata
        ? "・メタデータは必須。項目群、型、必須/任意、整合規則（例：日付形式、コード体系）を定め、不整合は不合格扱いとする。"
        : "・メタデータは任意。必要時に、基本項目（例：資料名、通番、作成年、備考等）を作成する。",
      "・メタデータと画像の突合（通番一致、件数一致）を実施する。",
      "・納品形式は、CSV/TSV/XML等、発注者要件に従う。",
    ].join("\n")
  );

  if (profile === "gunma" && data.gunmaMediaRequirements) {
    push(
      "媒体要件（群馬）",
      [
        "・納品媒体は、発注者指定に従う（外付けHDD/SSD等）。",
        "・媒体ラベル（案件名・媒体番号・作成日）を付し、封緘・輸送手配までを行う。",
        "・チェックサム一覧を同梱し、受入側で検証可能な状態とする。",
      ].join("\n")
    );
  }

  push(
    "情報管理",
    [
      "・作業データはアクセス制御された環境で保管し、不要な複製を作らない。",
      data.tier === "premium" || profile === "gunma"
        ? "・監査可能なログ（アクセス、持出、是正履歴）を保持する。"
        : "・必要に応じ、作業記録（担当/日付/是正有無）を残す。",
      "・納品後、保存期間・廃棄（消去）方針は契約・協議により定める。",
    ].join("\n")
  );

  push(
    "受入・納品・是正",
    [
      "・納品前に件数一致、フォルダ構成、命名規則の適合を確認する。",
      "・受入後に不適合が見つかった場合は、是正手順（再撮影/差替/ログ記録）に従い対応する。",
      "・仕様変更（例：OCR追加、メタデータ項目追加）が発生した場合は、差分見積の対象とする。",
    ].join("\n")
  );

  const addonLines: string[] = [];
  if (data.includeFumigation) addonLines.push("・燻蒸（防カビ・防虫）");
  if (data.includePacking) addonLines.push("・長期保存資材への格納（保存箱・中性紙封筒等）");
  if (data.includePickupDelivery) addonLines.push("・集荷・納品（梱包・輸送手配含む）");
  if (data.includeOnsite) addonLines.push("・現地作業（臨時設営・動線確保等）");
  if (data.includeEncryption) addonLines.push("・暗号化・アクセス制御（媒体暗号化／鍵管理等）");

  if (addonLines.length > 0) {
    push("付帯作業", addonLines.join("\n"));
  }

  return sections;
}


// ---- UI部品 ----

function Card(props: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="print-page rounded-2xl border bg-white shadow-sm">
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
    <div className="print-page rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <div className="text-sm font-semibold text-slate-800">{props.title}</div>
      </div>
      <div className="p-4">{props.children}</div>
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
        title: "大型図面（A2以上）",
        qty: 120,
        unit: "点",
        sizeClass: "A2以上",
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


  const specSections = useMemo(() => buildSpecSections(data), [data]);

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

                          <Card title="3) 仕様書の規格スイッチ（NDL／群馬）">
                            <div className="grid grid-cols-2 gap-3">
                              <SelectField<SpecProfile>
                                label="仕様プロファイル"
                                value={data.specProfile}
                                onChange={(v) =>
                                  setData((p) => ({
                                    ...p,
                                    specProfile: v,
                                    // 群馬に寄せた場合は、実務的に全数寄りになるため、検査レベルも補助的に引き上げる（ただし強制はしない）
                                    inspectionLevel: v === "gunma" && p.inspectionLevel === "none" ? "sample" : p.inspectionLevel,
                                  }))
                                }
                                options={[
                                  { value: "standard", label: "標準（簡易）" },
                                  { value: "ndl", label: "NDL準拠（詳細）" },
                                  { value: "gunma", label: "群馬仕様（厳格）" },
                                ]}
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
                                  label="全数検査（群馬）"
                                  checked={data.gunmaAllInspection}
                                  onChange={(v) => setData((p) => ({ ...p, gunmaAllInspection: v }))}
                                  hint="工程・出荷前を含め、全数を原則化。"
                                />
                                <Checkbox
                                  label="媒体要件（群馬）"
                                  checked={data.gunmaMediaRequirements}
                                  onChange={(v) => setData((p) => ({ ...p, gunmaMediaRequirements: v }))}
                                  hint="媒体、チェックサム、命名規則等の規格化。"
                                />
                                <Checkbox
                                  label="メタデータ必須項目（群馬）"
                                  checked={data.gunmaMetadataMandatory}
                                  onChange={(v) => setData((p) => ({ ...p, gunmaMetadataMandatory: v }))}
                                  hint="必須欠落を不合格扱いとする運用。"
                                />
                              </div>
                            ) : (
                              <div className="mt-3 text-xs text-slate-600">
                                群馬仕様を選択した場合のみ、「全数検査／媒体要件／メタデータ必須項目」を入力UI上のスイッチとして表示します。
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
                                            hint="NDL／群馬仕様の場合、仕様書側で項目群が詳細化されます。"
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
              </div>
            ) : null}

            {view === "estimate" ? (
              <div className="space-y-4">
                            {data.includeQuotation ? (
                              <Page title="顧客提出用：見積書（ドラフト）">
                                <div className="mb-3">
                                  <div className="text-sm font-semibold">{data.projectName}</div>
                                  <div className="text-xs text-slate-600">顧客：{data.clientName}　／　担当：{data.contactName}　／　発行日：{data.issueDate}</div>
                                </div>

                                <div className="mb-3 rounded-lg border bg-slate-50 p-3 text-sm">
                                  <div className="font-semibold text-slate-800 mb-1">プラン：{tierLabel(data.tier)}</div>
                                  <div className="text-xs text-slate-600">
                                    検査：{inspectionLabel(data.inspectionLevel)} ／ 仕様：{specProfileLabel(data.specProfile)}
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

                                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                                  <div className="text-xs font-semibold text-slate-700">注記</div>
                                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-700">
                                    <li>本見積は概算であり、数量確定・要件確定後に増減する可能性があります。</li>
                                    <li>仕様（NDL／群馬等）の詳細は、別紙仕様書に従います。</li>
                                    <li>価格は税抜表示（消費税別途）です。</li>
                                  </ol>
                                </div>
                              </Page>
                             ) : null}

                            {data.includeQuotation && data.includePriceRationalePage ? (
                              <Page title="顧客提出用：単価算定根拠（別紙）">
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
                              </Page>
                            ) : null}

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
                                          群馬スイッチ：全数検査={data.gunmaAllInspection ? "ON" : "OFF"}／媒体要件={data.gunmaMediaRequirements ? "ON" : "OFF"}／メタデータ必須=
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

                                {data.includeInternalPlanDiffPage ? (
                                  <div className="mt-4 rounded-xl border bg-white p-4">
                                    <div className="text-sm font-semibold mb-2">（内部用）プラン差分説明（見積書の“続くページ”相当）</div>
                                    <div className="text-xs text-slate-700">
                                      <div className="mb-2">
                                        目的：顧客提示の前に、プランの差（何が増えて何が減るか）を、帳票として崩れない形で整理する。
                                      </div>

                                      <div className="mt-2 font-semibold">エコノミー</div>
                                      <ul className="list-disc space-y-1 pl-5">
                                        <li>価格優先。検査は「抜取」までを基本に、工程の深追いはしない。</li>
                                        <li>仕様書は必要十分の粒度（標準〜NDL準拠）を選択可能。</li>
                                      </ul>

                                      <div className="mt-3 font-semibold">スタンダード</div>
                                      <ul className="list-disc space-y-1 pl-5">
                                        <li>工程内の是正（撮り直し、命名ルール厳守、軽微な補正）を前提にした運用。</li>
                                        <li>NDL準拠のメタデータ（項目群・整合性）を実務レベルで回す。</li>
                                      </ul>

                                      <div className="mt-3 font-semibold">プレミアム</div>
                                      <ul className="list-disc space-y-1 pl-5">
                                        <li>品質責任を強く負う前提。全数検査・二重検査、監査可能な情報管理、詳細ログ等を含む。</li>
                                        <li>厳格仕様（群馬仕様のような「全数検査／媒体要件／メタデータ必須」をONにした案件）にも耐える。</li>
                                      </ul>

                                      <div className="mt-3 text-slate-600">
                                        ※ 本システムでは、差分を「基礎単価」「加算要素」「検査倍率」「案件固定費（管理・セットアップ）」に分解して表現している。
                                      </div>
                                    </div>
                                  </div>
                                ) : null}
                              </Page>
                            ) : null}
              </div>
            ) : null}

            {view === "spec" ? (
              <div className="space-y-4">
                {data.includeSpecDoc ? (
                  <Page title="仕様書（ドラフト：規格スイッチ連動）">
                                  <div className="mb-3 rounded-lg border bg-slate-50 p-3 text-sm">
                                    <div className="font-semibold text-slate-800">仕様プロファイル：{specProfileLabel(data.specProfile)}</div>
                                    <div className="text-xs text-slate-600">
                                      検査：{inspectionLabel(data.inspectionLevel)}
                                      {data.specProfile === "gunma"
                                        ? ` ／ 群馬スイッチ：全数検査=${data.gunmaAllInspection ? "ON" : "OFF"}・媒体要件=${data.gunmaMediaRequirements ? "ON" : "OFF"}・メタデータ必須=${data.gunmaMetadataMandatory ? "ON" : "OFF"}`
                                        : ""}
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    {specSections.map((s, idx) => (
                                      <div key={idx} className="rounded-xl border bg-white p-3">
                                        <div className="text-sm font-semibold text-slate-800 mb-2">{s.title}</div>
                                        <div className="text-sm text-slate-700 whitespace-pre-wrap">{s.body}</div>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="mt-3 text-xs text-slate-600 whitespace-pre-wrap">
                                    【注】本仕様書は、本システムの入力情報から自動生成されるドラフトである。発注仕様（RFP）に固有の要件がある場合は、該当箇所を追記・優先する。
                                  </div>
                                </Page>
                ) : (
                  <Card title="仕様書（出力OFF）">
                    <div className="text-sm text-slate-700">入力画面の「出力対象」で「仕様書」をONにすると、このタブに仕様書が生成されます。</div>
                  </Card>
                )}
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
                          注: 群馬仕様など「全数検査」「媒体要件」「メタデータ必須項目」が規格化されている場合は、入力UIのスイッチ（標準=群馬）で自動的に強制されます。
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
