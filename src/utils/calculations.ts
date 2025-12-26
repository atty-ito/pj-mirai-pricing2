import { Data, WorkItem, Tier, ServiceCode } from "../types/pricing";
import { 
  SERVICE_DEFINITIONS, 
  SIZE_ADDERS, 
  FORMAT_ADDERS, 
  METADATA_UNIT_PRICES, 
  BASE_FEE_THRESHOLDS 
} from "../constants/coefficients";
import { toInt } from "./formatters";

// ------------------------------------------------------------------
// 型定義
// ------------------------------------------------------------------

export type FactorBreakdown = {
  c: number;
  q: number;
  p: number;
  i: number;
  k: number;
  raw: number;
  capped: number;
};

export type UnitPriceBreakdown = {
  base: number;
  factors: FactorBreakdown;
  sizeAdder: number;
  formatAdder: number;
  unitPrice: number;
  subtotal: number; // base * factor + adders
  finalUnitPrice: number; // same as unitPrice, alias for compatibility
  inspectionMultiplier: number; // 互換性のため残す（CQPIKではQに含まれる）
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
// 係数計算ロジック
// ------------------------------------------------------------------

export function getBaseUnit(service: ServiceCode, tier: Tier): number {
  const def = SERVICE_DEFINITIONS[service];
  if (!def) return 0;
  if (tier === "premium") return def.max;
  if (tier === "standard") return def.mid;
  return def.min;
}

// 他のファイルから使えるようにエクスポート
export function factorC(item: WorkItem): number {
  let c = 1.0;
  if (item.fragile) c += 0.2;
  if (!item.dismantleAllowed) c += 0.15;
  if (item.restorationRequired) c += 0.15;
  if (item.requiresNonContact) c += 0.1;
  return c;
}

export function factorQ(item: WorkItem, inspectionLevel: string): number {
  let q = 1.0;
  const res = String(item.resolution);
  
  if (res.includes("600")) q += 0.75;
  else if (res.includes("400")) q += 0.5;
  else if (res.includes("300")) q += 0.2;

  if (inspectionLevel.includes("二重")) q += 0.5;
  else if (inspectionLevel.includes("全数")) q += 0.25;

  if (item.colorSpace === "AdobeRGB") q += 0.15;
  return q;
}

export function factorP(data: Data): number {
  let p = 1.0;
  if (data.tempHumidLog) p += 0.1;
  if (data.fumigation) p += 0.1;
  if (data.ocr) p += 0.15;
  if (data.ocrProofread) p += 0.25;
  if (data.namingRule === "ファイル名（完全手入力）") p += 0.1;
  if (data.indexType !== "なし") p += 0.05;
  return p;
}

export function factorInteraction(item: WorkItem, data: Data): number {
  let bonus = 0;
  const highRes = String(item.resolution).includes("400") || String(item.resolution).includes("600");
  const deepInspect = data.inspectionLevel.includes("二重");
  const strongColor = item.colorSpace === "AdobeRGB";

  if (highRes && deepInspect) bonus += 0.05;
  if (highRes && strongColor) bonus += 0.03;
  if (deepInspect && strongColor) bonus += 0.03;
  if (data.ocrProofread) bonus += 0.03;

  return 1.0 + Math.min(bonus, 0.1);
}

export function factorKLoad(data: Data): number {
  const k = Math.max(0, Math.min(20, toInt(data.kLoadPct)));
  return 1.0 + k / 100;
}

export function applyFactorCap(m: number, data: Data): number {
  const cap = data.capExceptionApproved ? data.factorCap : 2.2;
  return Math.min(m, cap);
}

// ★ 単価計算の個別関数（CompareViewで使用）
export function computeUnitPrice(tier: Tier, inspectionLevel: string, w: WorkItem, dataMock?: Partial<Data>): UnitPriceBreakdown {
  // dataMockがなければデフォルト値を使う簡易版として動作させる
  const data: Data = {
    ...dataMock,
    tier,
    inspectionLevel: inspectionLevel as any,
    // 必須項目のダミー
    kLoadPct: dataMock?.kLoadPct ?? 0,
    factorCap: dataMock?.factorCap ?? 2.2,
    capExceptionApproved: dataMock?.capExceptionApproved ?? false,
    tempHumidLog: false, fumigation: false, ocr: false, ocrProofread: false,
    namingRule: "連番のみ", indexType: "なし"
  } as Data;

  const base = getBaseUnit(w.service, tier);
  const sizeAdder = SIZE_ADDERS[w.sizeClass] ?? 0;
  const fmtAdder = (w.fileFormats || []).reduce(
    (sum, f) => sum + (FORMAT_ADDERS[f] ?? 0), 0
  );

  const c = factorC(w);
  const q = factorQ(w, inspectionLevel);
  const p = factorP(data);
  const inter = factorInteraction(w, data);
  const k = factorKLoad(data);
  
  const rawFactor = c * q * p * inter * k;
  const cappedFactor = applyFactorCap(rawFactor, data);

  const unitPrice = Math.ceil(base * cappedFactor + sizeAdder + fmtAdder);

  return {
    base,
    factors: { c, q, p, i: inter, k, raw: rawFactor, capped: cappedFactor },
    sizeAdder,
    formatAdder: fmtAdder,
    unitPrice,
    subtotal: unitPrice, // 互換性
    finalUnitPrice: unitPrice, // 互換性
    inspectionMultiplier: q // Q係数を代用
  };
}

// ------------------------------------------------------------------
// メイン計算関数
// ------------------------------------------------------------------

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
    const explain = `Base(${bd.base})×Factor(${bd.factors.capped.toFixed(2)}) + Adders(${bd.sizeAdder + bd.formatAdder})`;
    
    lineItems.push({
      id: `L3-${w.id}`,
      phase: "L3",
      name: w.title,
      spec: `${serviceName} / ${w.sizeClass} / ${w.resolution} / ${w.colorSpace}`,
      qty,
      unit: w.unit,
      unitPrice: bd.unitPrice,
      amount,
      explain,
      kind: "work"
    });

    addProcessLineItems(lineItems, w, data, qty);
  }

  addFixedLineItems(lineItems, data, totalVol);

  for (const m of data.miscExpenses) {
    let up = toInt(m.unitPrice);
    if (m.calcType === "expense") up = Math.round(up * 1.3);
    const amt = up * toInt(m.qty);
    lineItems.push({
      id: m.id, phase: "Misc", name: m.label, spec: m.note || "",
      qty: toInt(m.qty), unit: m.unit, unitPrice: up, amount: amt, explain: "自由入力", kind: "misc"
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
    let u = 10;
    if (data.namingRule.includes("ファイル名")) u = 30;
    if (data.namingRule.includes("特殊")) u = 50;
    lines.push(createLine(`L4-NAME-${w.id}`, "L4", "メタデータ付与", data.namingRule, vol, w.unit, u));
  }
  if (data.ocr) lines.push(createLine(`L4-OCR-${w.id}`, "L4", "OCR処理", "機械処理", vol, w.unit, 5));
  if (data.ocrProofread) lines.push(createLine(`L4-OCRP-${w.id}`, "L4", "OCR校正", "目視確認", vol, w.unit, 20));
}

function addFixedLineItems(lines: LineItem[], data: Data, totalVol: number) {
  let baseFee = 15000;
  for (const t of BASE_FEE_THRESHOLDS) {
    if (totalVol <= t.limit) { baseFee = t.fee; break; }
  }
  lines.push(createLine("F-BASE", "L1", "基本料金", "PM費", 1, "式", baseFee));
  lines.push(createLine("L1-SOW", "L1", "要件定義", "仕様策定", 1, "式", 15000));
  
  const dist = toInt(data.transportDistanceKm);
  const trips = Math.max(1, toInt(data.transportTrips));
  const perKm = data.shippingType.includes("セキュリティ") ? 500 : 120;
  const baseTrans = data.shippingType.includes("セキュリティ") ? 30000 : 5000;
  lines.push(createLine("L2-TRANS", "L2", `搬送(${data.shippingType})`, `${dist}km x ${trips}回`, trips, "往復", baseTrans + dist * perKm));

  if (data.strictCheckIn) lines.push(createLine("L2-CHK", "L2", "厳格照合", "リスト突合", 1, "式", 10000));
  if (data.fumigation) lines.push(createLine("L2-FUMI", "L2", "燻蒸", "密閉処理", 1, "式", 20000));
  if (data.tempHumidLog) lines.push(createLine("L4-ENV", "L4", "環境ログ", "温湿度記録", 1, "式", 10000));
  
  const mediaCount = Math.max(1, toInt(data.mediaCount));
  data.deliveryMedia.forEach(m => {
    if (m === "HDD/SSD") lines.push(createLine("L5-HDD", "L5", "納品媒体(HDD)", "暗号化込", mediaCount, "台", 20000));
    else lines.push(createLine("L5-DISK", "L5", `納品媒体(${m})`, "書込検証", mediaCount, "枚", 6000));
  });
}

function createLine(id: string, phase: LineItem["phase"], name: string, spec: string, qty: number, unit: string, unitPrice: number): LineItem {
  return { id, phase, name, spec, qty, unit, unitPrice, amount: qty * unitPrice, kind: "fixed" };
}