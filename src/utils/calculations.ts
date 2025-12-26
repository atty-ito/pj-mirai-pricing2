import { Data, WorkItem, Tier, ServiceCode, MiscExpense } from "../types/pricing";
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

export type FactorBreakdown = {
  c: number; q: number; p: number; i: number; k: number;
  raw: number; capped: number;
};

export type UnitPriceBreakdown = {
  base: number;
  factors: FactorBreakdown;
  sizeAdder: number;
  formatAdder: number;
  unitPrice: number;
  subtotal: number;
  finalUnitPrice: number;
  inspectionMultiplier: number;
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
  // OCRは標準になったため、P係数への影響は「校正」のみ大きくする
  if (data.ocr) p += 0.05; 
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
  const k = Math.max(0, Math.min(50, toInt(data.kLoadPct)));
  return 1.0 + k / 100;
}

export function applyFactorCap(m: number, data: Data): number {
  const cap = data.capExceptionApproved ? data.factorCap : 2.2;
  return Math.min(m, cap);
}

// ------------------------------------------------------------------
// メイン計算関数
// ------------------------------------------------------------------

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
  const sizeAdder = SIZE_ADDERS[w.sizeClass] ?? 0;
  
  // 形式加算（配列対応）
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
    subtotal: unitPrice,
    finalUnitPrice: unitPrice,
    inspectionMultiplier: q
  };
}

export function computeCalc(data: Data): CalcResult {
  const lineItems: LineItem[] = [];
  const unitBreakdowns: Record<string, UnitPriceBreakdown> = {};

  let totalVol = 0;

  // L3: 業務項目
  for (const w of data.workItems) {
    const qty = toInt(w.qty);
    totalVol += qty;

    const bd = computeUnitPrice(data.tier, data.inspectionLevel, w, data);
    unitBreakdowns[w.id] = bd;

    const amount = bd.unitPrice * qty;
    const serviceName = SERVICE_DEFINITIONS[w.service]?.name || w.service;
    const explain = `Base(${bd.base})×Factor(${bd.factors.capped.toFixed(2)}) + Adders(${bd.sizeAdder + bd.formatAdder})`;
    
    // 形式表示（自由入力含む）
    const formatStr = [...(w.fileFormats || []), w.fileFormatsFree].filter(Boolean).join("・");

    lineItems.push({
      id: `L3-${w.id}`,
      phase: "L3",
      name: w.title,
      spec: `${serviceName}\nサイズ: ${w.sizeClass} / 解像度: ${w.resolution} / 色: ${w.colorSpace} / 形式: ${formatStr}`,
      qty,
      unit: w.unit,
      unitPrice: bd.unitPrice,
      amount,
      explain,
      kind: "work"
    });

    addProcessLineItems(lineItems, w, data, qty);
  }

  // L1, L2, L5: 固定費・納品・その他
  addFixedLineItems(lineItems, data, totalVol);

  // Misc: 特殊工程・実費
  // ここでHDD等の単価比較ロジックを適用
  for (const m of data.miscExpenses) {
    let finalUnitPrice = toInt(m.unitPrice);
    let explain = "手入力";

    if (m.calcType === "expense") {
      // 市場価格の30%乗せ
      const withMarkup = Math.round(finalUnitPrice * 1.3);
      
      // 納品媒体（HDD/SSD）の場合の特別ロジック
      // 項目名に"HDD"や"SSD"が含まれていれば、標準固定単価と比較して高い方を採用
      if (m.label.toUpperCase().includes("HDD") || m.label.toUpperCase().includes("SSD")) {
        const stdPrice = STANDARD_FIXED_COSTS.HDD;
        if (withMarkup > stdPrice) {
          finalUnitPrice = withMarkup;
          explain = `実費+30%適用 (標準単価 ${stdPrice} < 算出単価 ${withMarkup})`;
        } else {
          finalUnitPrice = stdPrice;
          explain = `標準単価適用 (標準単価 ${stdPrice} > 算出単価 ${withMarkup})`;
        }
      } else {
        // その他の実費
        finalUnitPrice = withMarkup;
        explain = "実費 + 30%諸経費";
      }
    }

    const amt = finalUnitPrice * toInt(m.qty);
    lineItems.push({
      id: m.id, phase: "Misc", name: m.label, spec: m.note || "",
      qty: toInt(m.qty), unit: m.unit, unitPrice: finalUnitPrice, amount: amt, explain, kind: "misc"
    });
  }

  // フェーズ順ソート
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
    lines.push(createLine(`L4-NAME-${w.id}`, "L4", "メタデータ付与", `規則: ${data.namingRule}`, vol, w.unit, u));
  }
  // OCRは常に表示、校正有無で単価変動
  if (data.ocr) {
    if (data.ocrProofread) {
      lines.push(createLine(`L4-OCRP-${w.id}`, "L4", "OCR処理 (校正あり)", "高精度校正", vol, w.unit, 20));
    } else {
      lines.push(createLine(`L4-OCR-${w.id}`, "L4", "OCR処理 (校正なし)", "機械処理のみ", vol, w.unit, 5));
    }
  }
}

function addFixedLineItems(lines: LineItem[], data: Data, totalVol: number) {
  let baseFee = 15000;
  for (const t of BASE_FEE_THRESHOLDS) {
    if (totalVol <= t.limit) { baseFee = t.fee; break; }
  }
  lines.push(createLine("F-BASE", "L1", "基本料金", "PM費・工程設計費", 1, "式", baseFee));
  
  // 要件定義費（L1）
  lines.push(createLine("L1-SOW", "L1", "要件定義・仕様策定", "仕様書作成・合意形成", 1, "式", 15000));
  
  // 搬送費（L2）
  const dist = toInt(data.transportDistanceKm);
  const trips = Math.max(1, toInt(data.transportTrips));
  let perKm = 120;
  let baseTrans = 5000;
  
  if (data.shippingType === "セキュリティ専用便") { baseTrans = 30000; perKm = 500; }
  else if (data.shippingType === "専用便") { baseTrans = 10000; perKm = 250; }
  else if (data.shippingType === "特殊セキュリティカー") { baseTrans = 60000; perKm = 800; }
  
  const transPrice = baseTrans + (dist * perKm);
  lines.push(createLine("L2-TRANS", "L2", `搬送費 (${data.shippingType})`, `距離${dist}km × 往復${trips}回`, trips, "往復", transPrice));

  if (data.strictCheckIn) lines.push(createLine("L2-CHK", "L2", "厳格照合・受領記録", "リスト突合・借用書作成", 1, "式", 10000));
  if (data.fumigation) lines.push(createLine("L2-FUMI", "L2", "燻蒸処理", "密閉環境・殺虫殺菌", 1, "式", STANDARD_FIXED_COSTS.FUMIGATION));
  if (data.tempHumidLog) lines.push(createLine("L4-ENV", "L4", "環境モニタリング", "温湿度ログ提出 (60分間隔)", 1, "式", 10000));
  
  // 納品媒体（L5）: MiscExpenseで入力されたものは重複計上しないよう、ここでは自動計算分を「標準」として追加
  // ただし、MiscExpenseを使わずにチェックボックスだけで選んだ場合のロジックが必要
  // 今回の要件では「実費入力させる」ため、自動計上はDVD/BDなどの光学メディアのみ残し、HDDはMiscExpense推奨とするか、
  // あるいはここで計上し、InputViewで制御するか。
  // → シンプルに、Checkboxで選ばれたものは「標準単価」で計上する。
  // MiscExpenseで「HDD」が入力された場合は、そちらが優先される（二重計上になるため、運用でCheckboxを外すか、ここで判定する）。
  // ここでは「CheckboxがON」かつ「MiscExpenseに同種がない」場合のみ追加するロジックにする。
  
  const mediaCount = Math.max(1, toInt(data.mediaCount));
  const miscLabels = data.miscExpenses.map(m => m.label.toUpperCase());

  data.deliveryMedia.forEach(m => {
    // MiscExpenseに同等のものが含まれていればスキップ（二重計上防止）
    const isHdd = m.includes("HDD") || m.includes("SSD");
    const hasManualEntry = miscLabels.some(l => isHdd ? (l.includes("HDD") || l.includes("SSD")) : l.includes(m.toUpperCase()));

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