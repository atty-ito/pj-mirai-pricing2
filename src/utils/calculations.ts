import { Tier, InspectionLevel, WorkItem, Data, FileFormat } from "../types/pricing";
import { 
  TIER_BASE_PER_UNIT, SIZE_ADDER, COLOR_ADDER, DPI_ADDER, FORMAT_ADDER, 
  DERIVED_PDF_SURCHARGE, DERIVED_PDFA_EXTRA, OCR_ADDER, METADATA_ADDER, 
  HANDLING_ADDER, INSPECTION_MULTIPLIER, PROJECT_FIXED_FEES, ADDON_FIXED_FEES 
} from "../constants/coefficients";
import { toInt } from "./formatters";

export type UnitPriceBreakdown = {
  base: number; size: number; color: number; dpi: number; formats: number;
  ocr: number; metadata: number; handling: number; subtotal: number;
  inspectionMultiplier: number; finalUnitPrice: number;
};

export function computeUnitPrice(tier: Tier, inspectionLevel: InspectionLevel, w: WorkItem): UnitPriceBreakdown {
  const base = TIER_BASE_PER_UNIT[tier];
  const size = SIZE_ADDER[w.sizeClass];
  const color = COLOR_ADDER[w.colorMode];
  const dpi = DPI_ADDER[w.dpi];
  const formatsBase = (w.formats || []).reduce((sum, f) => sum + (FORMAT_ADDER[f] ?? 0), 0);
  const hasMaster = (w.formats || []).some((f) => f === "TIFF" || f === "JPEG" || f === "JPEG2000");
  const hasPDF = (w.formats || []).some((f) => f === "PDF" || f === "PDF/A");
  const hasPDFA = (w.formats || []).includes("PDF/A");
  const derivedPdf = hasPDF && hasMaster ? DERIVED_PDF_SURCHARGE + (hasPDFA ? DERIVED_PDFA_EXTRA : 0) : 0;
  const formats = formatsBase + derivedPdf;
  const ocr = w.ocr ? OCR_ADDER : 0;
  const metadata = METADATA_ADDER[w.metadataLevel];
  const handling = HANDLING_ADDER[w.handling];
  const subtotal = base + size + color + dpi + formats + ocr + metadata + handling;
  const inspectionMultiplier = INSPECTION_MULTIPLIER[inspectionLevel];
  const finalUnitPrice = Math.round(subtotal * inspectionMultiplier);
  return { base, size, color, dpi, formats, ocr, metadata, handling, subtotal, inspectionMultiplier, finalUnitPrice };
}

export type LineItem = { label: string; qty: number; unit: string; unitPrice: number; amount: number; note?: string; kind: "work" | "fixed" | "addon" | "misc"; };
export type CalcResult = { lineItems: LineItem[]; subtotal: number; tax: number; total: number; unitBreakdowns: Record<string, UnitPriceBreakdown>; };

export function computeCalc(data: Data): CalcResult {
  const unitBreakdowns: Record<string, UnitPriceBreakdown> = {};
  const lineItems: LineItem[] = [];

  // 1. 通常の作業項目
  for (const w of data.workItems) {
    const bd = computeUnitPrice(data.tier, data.inspectionLevel, w);
    unitBreakdowns[w.id] = bd;
    const qty = Math.max(0, w.qty);
    lineItems.push({
      kind: "work", label: w.title || "（無題）", qty, unit: w.unit, unitPrice: bd.finalUnitPrice, amount: bd.finalUnitPrice * qty,
      note: [`サイズ:${w.sizeClass}`, `色:${w.colorMode}`, `解像度:${w.dpi}dpi`, `形式:${w.formats.join("・")}`, w.ocr ? "OCR:あり" : "OCR:なし", `メタデータ:${w.metadataLevel}`, `取扱:${w.handling}`].join(" / "),
    });
  }

  // 2. 特殊工程・実費 (並び順制御: 特殊工程(manual) -> 実費(expense))
  // 入力順序を維持しつつ、タイプごとにグループ化してソート
  const sortedMisc = [...data.miscExpenses].sort((a, b) => {
    // manual(特殊工程)を先に、expense(実費)を後に
    if (a.calcType === b.calcType) return 0;
    return a.calcType === "manual" ? -1 : 1;
  });

  for (const m of sortedMisc) {
    const label = (m.label ?? "").trim();
    const qty = Math.max(0, toInt(m.qty ?? 1, 1));
    const unit = (m.unit ?? "式").trim() || "式";
    
    // 単価計算ロジック
    let unitPrice = m.unitPrice || 0;
    
    // 実費の場合、市場価格(税込入力)に対して30%乗せを行う
    // 見積書への記載額として、税抜単価相当に変換するのではなく「提示単価（税抜扱い）」として計算
    // 最終的にこれに消費税がかかる形となる
    if (m.calcType === "expense") {
      unitPrice = Math.round(unitPrice * 1.3);
    } else {
      unitPrice = Math.round(unitPrice);
    }

    // 金額計算（数量 × 計算後単価）
    // 特殊工程で単価0・金額直接入力の場合の考慮も残す
    const amount = (m.unitPrice != null || m.qty != null) 
      ? Math.max(0, Math.round(qty * unitPrice)) 
      : Math.max(0, Math.round(m.amount));

    if (!label && amount === 0) continue;

    lineItems.push({ 
      kind: "misc", 
      label: label || "特殊工程・実費", 
      qty: qty || 1, 
      unit, 
      unitPrice, 
      amount,
      note: m.note // 付記（工程説明など）
    });
  }

  // 3. 固定費・付帯項目
  const fixed = PROJECT_FIXED_FEES[data.tier];
  lineItems.push({ kind: "fixed", label: "初期セットアップ費", note: data.setupFeeNote.trim() || undefined, qty: 1, unit: "式", unitPrice: fixed.setup, amount: fixed.setup });
  lineItems.push({ kind: "fixed", label: "進行管理・品質管理費", note: data.managementFeeNote.trim() || undefined, qty: 1, unit: "式", unitPrice: fixed.management, amount: fixed.management });
  
  if (data.includeFumigation) lineItems.push({ kind: "addon", label: "燻蒸（防カビ・防虫）", qty: 1, unit: "式", unitPrice: ADDON_FIXED_FEES.fumigation, amount: ADDON_FIXED_FEES.fumigation });
  if (data.includePacking) lineItems.push({ kind: "addon", label: "長期保存用資材への格納", qty: 1, unit: "式", unitPrice: ADDON_FIXED_FEES.packing, amount: ADDON_FIXED_FEES.packing });
  if (data.includePickupDelivery) lineItems.push({ kind: "addon", label: "集荷・納品", qty: 1, unit: "式", unitPrice: ADDON_FIXED_FEES.pickupDelivery, amount: ADDON_FIXED_FEES.pickupDelivery });
  if (data.includeOnsite) lineItems.push({ kind: "addon", label: "現地作業", qty: 1, unit: "式", unitPrice: ADDON_FIXED_FEES.onsite, amount: ADDON_FIXED_FEES.onsite });
  if (data.includeEncryption) lineItems.push({ kind: "addon", label: "暗号化・アクセス制御", qty: 1, unit: "式", unitPrice: ADDON_FIXED_FEES.encryption, amount: ADDON_FIXED_FEES.encryption });

  const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const tax = Math.round(subtotal * data.taxRate);
  return { lineItems, subtotal, tax, total: subtotal + tax, unitBreakdowns };
}