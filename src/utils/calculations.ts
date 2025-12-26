import { Data, WorkItem, Tier, ServiceCode } from "../types/pricing";
import { 
  SERVICE_DEFINITIONS, 
  SIZE_ADDERS, 
  FORMAT_ADDERS, 
  METADATA_UNIT_PRICES, 
  BASE_FEE_THRESHOLDS,
  STANDARD_FIXED_COSTS
} from "../constants/coefficients";
import { toInt } from "./formatters";

// ------------------------------------------------------------------
// 型定義
// ------------------------------------------------------------------

export type FactorResult = {
  value: number;
  reasons: string[];
};

export type FactorBreakdown = {
  c: number; q: number; p: number; i: number; k: number;
  raw: number; capped: number;
};

export type UnitPriceBreakdown = {
  base: number;
  factors: FactorBreakdown;
  sizeAdder: number;
  formatAdder: number;
  adders: number;
  unitPrice: number;
  subtotal: number;
  finalUnitPrice: number;
  inspectionMultiplier: number;
  formula: string;
  factorDetails: string[]; // ★追加: 詳細理由リスト
};

export type LineItem = {
  id: string;
  phase: "L1" | "L2" | "L3" | "L4" | "L5" | "Misc";
  name: string;
  spec: string;
  qty: number;
  unit: string;
  unitPrice: number;
  amount: number;
  explain?: string;
  kind?: "work" | "fixed" | "addon" | "misc";
};

export type CalcResult = {
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  totalVol: number;
  unitBreakdowns: Record<string, UnitPriceBreakdown>;
};

// ------------------------------------------------------------------
// 係数計算ロジック (詳細ログ付き)
// ------------------------------------------------------------------

export function getBaseUnit(service: ServiceCode, tier: Tier): number {
  const def = SERVICE_DEFINITIONS[service];
  if (!def) return 0;
  if (tier === "premium") return def.max;
  if (tier === "standard") return def.mid;
  return def.min;
}

export function calcFactorC(item: WorkItem): FactorResult {
  let v = 1.0;
  const reasons: string[] = [];
  if (item.fragile) { v += 0.5; reasons.push("脆弱資料 (+0.50)"); }
  if (!item.dismantleAllowed) { v += 0.15; reasons.push("解体不可 (+0.15)"); }
  if (item.restorationRequired) { v += 0.15; reasons.push("復元必須 (+0.15)"); }
  if (item.requiresNonContact) { v += 0.1; reasons.push("非接触要求 (+0.10)"); }
  return { value: v, reasons };
}

export function calcFactorQ(item: WorkItem, inspectionLevel: string): FactorResult {
  let v = 1.0;
  const reasons: string[] = [];
  const res = String(item.resolution);

  if (res.includes("600")) { v += 2.5; reasons.push("高精細600dpi (+2.50)"); }
  else if (res.includes("400")) { v += 0.5; reasons.push("精細400dpi (+0.50)"); }
  
  if (inspectionLevel.includes("二重")) { v += 0.5; reasons.push("二重全数検査 (+0.50)"); }
  else if (inspectionLevel.includes("全数")) { v += 0.2; reasons.push("全数検査 (+0.20)"); }

  if (item.colorSpace === "AdobeRGB") { v += 0.1; reasons.push("AdobeRGB管理 (+0.10)"); }

  return { value: v, reasons };
}

export function calcFactorP(data: Data): FactorResult {
  let v = 1.0;
  const reasons: string[] = [];
  if (data.tempHumidLog) { v += 0.1; reasons.push("温湿度ログ管理 (+0.10)"); }
  if (data.fumigation) { v += 0.1; reasons.push("燻蒸処理管理 (+0.10)"); }
  if (data.ocrProofread) { v += 0.25; reasons.push("OCR高精度校正 (+0.25)"); }
  if (data.namingRule === "ファイル名（完全手入力）") { v += 0.1; reasons.push("ファイル名手入力 (+0.10)"); }
  return { value: v, reasons };
}

export function calcFactorI(item: WorkItem, data: Data): FactorResult {
  let bonus = 0;
  const reasons: string[] = [];
  const isHighRes = String(item.resolution).includes("600") || String(item.resolution).includes("400");
  const isFragile = item.fragile;
  const isAdobe = item.colorSpace === "AdobeRGB";

  if (isHighRes && isFragile) { bonus += 0.05; reasons.push("高難度×脆弱 (+0.05)"); }
  if (isAdobe && isFragile) { bonus += 0.03; reasons.push("厳格色管理×脆弱 (+0.03)"); }

  const cappedBonus = Math.min(bonus, 0.10);
  return { value: 1.0 + cappedBonus, reasons };
}

export function calcFactorK(data: Data): FactorResult {
  const k = Math.max(0, Math.min(50, toInt(data.kLoadPct)));
  const v = 1.0 + k / 100;
  const reasons: string[] = k > 0 ? [`繁忙期/特急調整 (+${(k/100).toFixed(2)})`] : [];
  return { value: v, reasons };
}

export function applyFactorCap(m: number, data: Data): { value: number; isCapped: boolean } {
  const cap = data.capExceptionApproved ? data.factorCap : 2.2;
  return { value: Math.min(m, cap), isCapped: m > cap };
}

// 単価計算 (Compute Unit Price)
export function computeUnitPrice(tier: Tier, inspectionLevel: string, w: WorkItem, dataMock?: Partial<Data>): UnitPriceBreakdown {
  const data: Data = {
    ...dataMock,
    tier,
    inspectionLevel: inspectionLevel as any,
    kLoadPct: dataMock?.kLoadPct ?? 0,
    factorCap: dataMock?.factorCap ?? 2.2,
    capExceptionApproved: dataMock?.capExceptionApproved ?? false,
    tempHumidLog: dataMock?.tempHumidLog ?? false, 
    fumigation: dataMock?.fumigation ?? false, 
    ocr: dataMock?.ocr ?? true, 
    ocrProofread: dataMock?.ocrProofread ?? false,
    namingRule: dataMock?.namingRule ?? "連番のみ", 
    indexType: dataMock?.indexType ?? "なし"
  } as Data;

  const base = getBaseUnit(w.service, tier);
  const fc = calcFactorC(w);
  const fq = calcFactorQ(w, inspectionLevel);
  const fp = calcFactorP(data);
  const fi = calcFactorI(w, data);
  const fk = calcFactorK(data);

  const rawFactor = fc.value * fq.value * fp.value * fi.value * fk.value;
  const { value: cappedFactor, isCapped } = applyFactorCap(rawFactor, data);

  const allReasons = [...fc.reasons, ...fq.reasons, ...fp.reasons, ...fi.reasons, ...fk.reasons];
  if (isCapped) allReasons.push(`係数上限適用 (算出${rawFactor.toFixed(2)} → 上限${cappedFactor.toFixed(2)})`);

  const sizeAdder = SIZE_ADDERS[w.sizeClass] ?? 0;
  const fmtAdder = (w.fileFormats || []).reduce((sum, f) => sum + (FORMAT_ADDERS[f] ?? 0), 0);
  const adders = sizeAdder + fmtAdder;

  const unitPrice = Math.ceil((base * cappedFactor) + adders);

  return {
    base,
    factors: { c: fc.value, q: fq.value, p: fp.value, i: fi.value, k: fk.value, raw: rawFactor, capped: cappedFactor },
    sizeAdder,
    formatAdder: fmtAdder,
    adders,
    unitPrice,
    subtotal: unitPrice,
    finalUnitPrice: unitPrice,
    inspectionMultiplier: fq.value, 
    formula: `(${base} × ${cappedFactor.toFixed(2)}) + ${adders} = ${unitPrice}`,
    factorDetails: allReasons // ★ここを追加
  };
}

// メイン計算 (Calculate All)
export function computeCalc(data: Data): CalcResult {
  const lineItems: LineItem[] = [];
  const unitBreakdowns: Record<string, UnitPriceBreakdown> = {};
  let totalVol = 0;

  for (const w of data.workItems) {
    const qty = toInt(w.qty);
    totalVol += qty;

    const bd = computeUnitPrice(data.tier, data.inspectionLevel, w, data);
    unitBreakdowns[w.id] = bd;

    const amount = bd.unitPrice * qty;
    const serviceName = SERVICE_DEFINITIONS[w.service]?.name || w.service;
    const formatStr = [...(w.fileFormats || []), w.fileFormatsFree].filter(Boolean).join("・");

    lineItems.push({
      id: `L3-${w.id}`,
      phase: "L3",
      name: w.title,
      spec: `${serviceName}\nサイズ:${w.sizeClass} / DPI:${w.resolution} / 色:${w.colorSpace} / 形式:${formatStr}`,
      qty,
      unit: w.unit,
      unitPrice: bd.unitPrice,
      amount,
      explain: "基本技術料＋仕様加算",
      kind: "work"
    });

    addProcessLineItems(lineItems, w, data, qty);
  }

  addFixedLineItems(lineItems, data, totalVol);

  for (const m of data.miscExpenses) {
    let finalUnitPrice = toInt(m.unitPrice);
    let explain = "手入力";

    if (m.calcType === "expense") {
      const withMarkup = Math.round(finalUnitPrice * 1.3);
      if (m.label.toUpperCase().includes("HDD") || m.label.toUpperCase().includes("SSD")) {
        const stdPrice = STANDARD_FIXED_COSTS.HDD;
        if (withMarkup > stdPrice) {
          finalUnitPrice = withMarkup;
        } else {
          finalUnitPrice = stdPrice;
        }
      } else {
        finalUnitPrice = withMarkup;
      }
      explain = "機材調達・設定費として";
    }

    const amt = finalUnitPrice * toInt(m.qty);
    lineItems.push({
      id: m.id, phase: "Misc", name: m.label, spec: m.note || "",
      qty: toInt(m.qty), unit: m.unit, unitPrice: finalUnitPrice, amount: amt, explain, kind: "misc"
    });
  }

  const phaseOrder: Record<string, number> = { L1: 1, L2: 2, L3: 3, L4: 4, L5: 5, Misc: 6 };
  lineItems.sort((a, b) => (phaseOrder[a.phase] || 99) - (phaseOrder[b.phase] || 99));

  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const tax = Math.floor(subtotal * 0.1);

  return { lineItems, subtotal, tax, total: subtotal + tax, totalVol, unitBreakdowns };
}

function addProcessLineItems(lines: LineItem[], w: WorkItem, data: Data, vol: number) {
  if (vol <= 0) return;
  if (data.namingRule !== "連番のみ") {
    let u = METADATA_UNIT_PRICES.folder;
    if (data.namingRule.includes("ファイル名")) u = METADATA_UNIT_PRICES.file_simple;
    if (data.namingRule.includes("特殊")) u = METADATA_UNIT_PRICES.special_rule;
    lines.push(createLine(`L4-NAME-${w.id}`, "L4", "メタデータ付与", `規則: ${data.namingRule}`, vol, w.unit, u));
  }
  if (data.ocrProofread) {
    lines.push(createLine(`L4-OCRP-${w.id}`, "L4", "OCR校正（専門スタッフ）", "高精度校正", vol, w.unit, 20));
  }
}

function addFixedLineItems(lines: LineItem[], data: Data, totalVol: number) {
  let baseFee = 15000;
  for (const t of BASE_FEE_THRESHOLDS) {
    if (totalVol <= t.limit) { baseFee = t.fee; break; }
  }
  lines.push(createLine("F-BASE", "L1", "基本料金", `PM費・工程設計`, 1, "式", baseFee));
  lines.push(createLine("L1-SOW", "L1", "要件定義・仕様策定", "仕様書作成・合意形成", 1, "式", 15000));
  
  const dist = toInt(data.transportDistanceKm);
  const trips = Math.max(1, toInt(data.transportTrips));
  let perKm = 120;
  let baseTrans = 5000;
  if (data.shippingType === "セキュリティ専用便") { baseTrans = 30000; perKm = 500; }
  else if (data.shippingType === "専用便") { baseTrans = 10000; perKm = 250; }
  else if (data.shippingType === "特殊セキュリティカー") { baseTrans = 60000; perKm = 800; }
  
  const transPrice = baseTrans + (dist * perKm);
  lines.push(createLine("L2-TRANS", "L2", `搬送費 (${data.shippingType})`, `距離${dist}km × 往復${trips}回`, trips, "往復", transPrice));

  if (data.strictCheckIn) lines.push(createLine("L2-CHK", "L2", "厳格照合・受領記録", "リスト突合", 1, "式", 10000));
  if (data.fumigation) lines.push(createLine("L2-FUMI", "L2", "燻蒸処理", "密閉環境", 1, "式", STANDARD_FIXED_COSTS.FUMIGATION));
  if (data.tempHumidLog) lines.push(createLine("L4-ENV", "L4", "環境モニタリング", "温湿度ログ提出", 1, "式", 10000));

  const mediaCount = Math.max(1, toInt(data.mediaCount));
  const miscLabels = data.miscExpenses.map(m => m.label.toUpperCase());

  data.deliveryMedia.forEach(m => {
    const isHdd = m.includes("HDD") || m.includes("SSD");
    const hasManualEntry = miscLabels.some(l => (isHdd ? (l.includes("HDD") || l.includes("SSD")) : l.includes(m.toUpperCase())));

    if (!hasManualEntry) {
      if (isHdd) {
        lines.push(createLine("L5-HDD", "L5", "納品用HDD/SSD (標準)", "調達・暗号化・検査込", mediaCount, "台", STANDARD_FIXED_COSTS.HDD));
      } else if (m.includes("DVD")) {
        lines.push(createLine("L5-DVD", "L5", "納品用DVD-R", "検証・冗長化", mediaCount, "枚", STANDARD_FIXED_COSTS.DVDR));
      } else if (m.includes("BD")) {
        lines.push(createLine("L5-BDR", "L5", "納品用BD-R", "検証・冗長化", mediaCount, "枚", STANDARD_FIXED_COSTS.BDR));
      }
    }
  });

  if (data.labelPrint) {
    lines.push(createLine("L5-LABEL", "L5", "媒体ラベル印字", "管理番号印字", mediaCount, "枚", STANDARD_FIXED_COSTS.LABEL));
  }
}

function createLine(id: string, phase: LineItem["phase"], name: string, spec: string, qty: number, unit: string, unitPrice: number): LineItem {
  return { id, phase, name, spec, qty, unit, unitPrice, amount: qty * unitPrice, kind: "fixed" };
}