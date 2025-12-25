import { 
    Tier, 
    InspectionLevel, 
    WorkItem, 
    Data, 
    SizeClass, 
    ColorMode, 
    Dpi, 
    FileFormat, 
    MetadataLevel, 
    Handling 
  } from "../types/pricing";
  import { 
    TIER_BASE_PER_UNIT, 
    SIZE_ADDER, 
    COLOR_ADDER, 
    DPI_ADDER, 
    FORMAT_ADDER, 
    DERIVED_PDF_SURCHARGE, 
    DERIVED_PDFA_EXTRA, 
    OCR_ADDER, 
    METADATA_ADDER, 
    HANDLING_ADDER, 
    INSPECTION_MULTIPLIER, 
    PROJECT_FIXED_FEES, 
    ADDON_FIXED_FEES 
  } from "../constants/coefficients";
  
  /**
   * 単価の内訳を保持する型定義
   */
  export type UnitPriceBreakdown = {
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
  
  /**
   * 作業項目（WorkItem）ごとの単価を計算する
   */
  export function computeUnitPrice(
    tier: Tier, 
    inspectionLevel: InspectionLevel, 
    w: WorkItem
  ): UnitPriceBreakdown {
    const base = TIER_BASE_PER_UNIT[tier];
    const size = SIZE_ADDER[w.sizeClass];
    const color = COLOR_ADDER[w.colorMode];
    const dpi = DPI_ADDER[w.dpi];
  
    const formatsBase = (w.formats || []).reduce((sum, f) => sum + (FORMAT_ADDER[f] ?? 0), 0);
  
    const hasMaster = (w.formats || []).some((f) => f === "TIFF" || f === "JPEG" || f === "JPEG2000");
    const hasPDF = (w.formats || []).some((f) => f === "PDF" || f === "PDF/A");
    const hasPDFA = (w.formats || []).includes("PDF/A");
  
    // 派生PDF生成の加算ロジック
    const derivedPdf = hasPDF && hasMaster ? DERIVED_PDF_SURCHARGE + (hasPDFA ? DERIVED_PDFA_EXTRA : 0) : 0;
    const formats = formatsBase + derivedPdf;
  
    const ocr = w.ocr ? OCR_ADDER : 0;
    const metadata = METADATA_ADDER[w.metadataLevel];
    const handling = HANDLING_ADDER[w.handling];
  
    const subtotal = base + size + color + dpi + formats + ocr + metadata + handling;
    const inspectionMultiplier = INSPECTION_MULTIPLIER[inspectionLevel];
    const finalUnitPrice = Math.round(subtotal * inspectionMultiplier);
  
    return { 
      base, size, color, dpi, formats, ocr, metadata, handling, 
      subtotal, inspectionMultiplier, finalUnitPrice 
    };
  }
  
  /**
   * 見積明細（LineItem）の型定義
   */
  export type LineItem = {
    label: string;
    qty: number;
    unit: string;
    unitPrice: number;
    amount: number;
    note?: string;
    kind: "work" | "fixed" | "addon" | "misc";
  };
  
  /**
   * 全体の見積計算結果の型定義
   */
  export type CalcResult = {
    lineItems: LineItem[];
    subtotal: number;
    tax: number;
    total: number;
    unitBreakdowns: Record<string, UnitPriceBreakdown>;
  };
  
  /**
   * アプリ全体のデータを元に、すべての見積金額を計算する
   */
  export function computeCalc(data: Data): CalcResult {
    const unitBreakdowns: Record<string, UnitPriceBreakdown> = {};
    const lineItems: LineItem[] = [];
  
    // 1) 作業対象の計算
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
          `サイズ:${w.sizeClass}`,
          `色:${w.colorMode === "mono" ? "モノクロ" : w.colorMode === "gray" ? "グレー" : "カラー"}`,
          `解像度:${w.dpi}dpi`,
          `形式:${w.formats.join(" / ")}`,
          w.ocr ? "OCR:あり" : "OCR:なし",
          `メタデータ:${w.metadataLevel === "none" ? "なし" : w.metadataLevel === "basic" ? "基本" : "充実"}`,
          `取扱:${w.handling === "normal" ? "通常" : "特殊"}`,
        ].join(" / "),
      });
    }
  
    // 2) 特殊工程・実費（自由入力）
    for (const m of data.miscExpenses) {
      const label = (m.label ?? "").trim();
      const qty = Math.max(0, m.qty ?? 1);
      const unit = (m.unit ?? "式").trim() || "式";
  
      const unitPrice = m.unitPrice != null 
        ? Math.max(0, Math.round(m.unitPrice)) 
        : (qty > 0 ? Math.max(0, Math.round(m.amount / qty)) : Math.max(0, Math.round(m.amount)));
  
      const amount = m.unitPrice != null || m.qty != null || m.unit != null
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
      });
    }
  
    // 3) 案件単位の固定費
    const fixed = PROJECT_FIXED_FEES[data.tier];
    lineItems.push({
      kind: "fixed",
      label: "初期セットアップ費",
      note: (data.setupFeeNote || "").trim() || undefined,
      qty: 1,
      unit: "式",
      unitPrice: fixed.setup,
      amount: fixed.setup,
    });
    lineItems.push({
      kind: "fixed",
      label: "進行管理・品質管理費",
      note: (data.managementFeeNote || "").trim() || undefined,
      qty: 1,
      unit: "式",
      unitPrice: fixed.management,
      amount: fixed.management,
    });
  
    // 4) 付帯（定額）
    if (data.includeFumigation) {
      lineItems.push({ kind: "addon", label: "燻蒸（防カビ・防虫）", qty: 1, unit: "式", unitPrice: ADDON_FIXED_FEES.fumigation, amount: ADDON_FIXED_FEES.fumigation });
    }
    if (data.includePacking) {
      lineItems.push({ kind: "addon", label: "長期保存用資材への格納", qty: 1, unit: "式", unitPrice: ADDON_FIXED_FEES.packing, amount: ADDON_FIXED_FEES.packing });
    }
    if (data.includePickupDelivery) {
      lineItems.push({ kind: "addon", label: "集荷・納品（輸送手配込）", qty: 1, unit: "式", unitPrice: ADDON_FIXED_FEES.pickupDelivery, amount: ADDON_FIXED_FEES.pickupDelivery });
    }
    if (data.includeOnsite) {
      lineItems.push({ kind: "addon", label: "現地作業（臨時設営等）", qty: 1, unit: "式", unitPrice: ADDON_FIXED_FEES.onsite, amount: ADDON_FIXED_FEES.onsite });
    }
    if (data.includeEncryption) {
      lineItems.push({ kind: "addon", label: "暗号化・アクセス制御", qty: 1, unit: "式", unitPrice: ADDON_FIXED_FEES.encryption, amount: ADDON_FIXED_FEES.encryption });
    }
  
    const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
    const tax = Math.round(subtotal * data.taxRate);
    const total = subtotal + tax;
  
    return { lineItems, subtotal, tax, total, unitBreakdowns };
  }