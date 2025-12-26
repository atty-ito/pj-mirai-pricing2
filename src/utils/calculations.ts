import { Data, WorkItem, Tier, ServiceCode, MiscExpense } from "../types/pricing";
import { 
  SERVICE_DEFINITIONS, 
  SIZE_ADDERS, 
  FORMAT_ADDERS, 
  METADATA_UNIT_PRICES, 
  BASE_FEE_THRESHOLDS 
} from "../constants/coefficients";
import { toInt, toMoney } from "./formatters";

// ------------------------------------------------------------------
// 型定義
// ------------------------------------------------------------------

// 係数の内訳（分析・デバッグ用）
export type FactorBreakdown = {
  c: number; // Condition (原本)
  q: number; // Quality (画質・検査)
  p: number; // Process (付帯)
  i: number; // Interaction (複合)
  k: number; // K_load (繁忙)
  raw: number;    // キャップ前
  capped: number; // キャップ後
};

// 単価の内訳
export type UnitPriceBreakdown = {
  base: number;       // 基準単価
  factors: FactorBreakdown; // 適用係数
  sizeAdder: number;  // サイズ加算
  formatAdder: number;// 形式加算
  unitPrice: number;  // 最終単価
};

// 行アイテム（見積明細）
export type LineItem = {
  id: string;
  phase: "L1" | "L2" | "L3" | "L4" | "L5" | "Misc";
  name: string;
  spec: string;
  qty: number;
  unit: string;
  unitPrice: number;
  amount: number;
  explain?: string; // 積算根拠の説明
  kind?: "work" | "fixed" | "addon" | "misc"; // 互換性用
};

// 計算結果全体
export type CalcResult = {
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  totalVol: number;
  unitBreakdowns: Record<string, UnitPriceBreakdown>; // workItem.id -> breakdown
};

// ------------------------------------------------------------------
// 係数計算ロジック (CQPIKモデル) - 旧版の完全移植
// ------------------------------------------------------------------

function getBaseUnit(service: ServiceCode, tier: Tier): number {
  const def = SERVICE_DEFINITIONS[service];
  if (!def) return 0;
  if (tier === "premium") return def.max;
  if (tier === "standard") return def.mid;
  return def.min; // economy
}

function factorC(item: WorkItem): number {
  let c = 1.0;
  if (item.fragile) c += 0.2;
  if (!item.dismantleAllowed) c += 0.15;
  if (item.restorationRequired) c += 0.15;
  if (item.requiresNonContact) c += 0.1;
  return c;
}

function factorQ(item: WorkItem, data: Data): number {
  let q = 1.0;
  const res = String(item.resolution);
  
  // 解像度による加算
  if (res.includes("600")) q += 0.75;
  else if (res.includes("400")) q += 0.5;
  else if (res.includes("300")) q += 0.2;

  // 検査レベルによる加算
  if (data.inspectionLevel.includes("二重")) q += 0.5;
  else if (data.inspectionLevel.includes("全数")) q += 0.25;

  // 色空間による加算
  if (item.colorSpace === "AdobeRGB") q += 0.15;
  if (data.deltaE && item.colorSpace === "AdobeRGB") q += 0.1;

  return q;
}

function factorP(data: Data): number {
  let p = 1.0;
  if (data.tempHumidLog) p += 0.1;
  if (data.fumigation) p += 0.1;
  if (data.ocr) p += 0.15;
  if (data.ocrProofread) p += 0.25;
  if (data.namingRule === "ファイル名（完全手入力）") p += 0.1;
  if (data.indexType !== "なし") p += 0.05;
  return p;
}

function factorInteraction(item: WorkItem, data: Data): number {
  let bonus = 0;
  const highRes = String(item.resolution).includes("400") || String(item.resolution).includes("600");
  const deepInspect = data.inspectionLevel.includes("二重");
  const strongColor = item.colorSpace === "AdobeRGB";

  // 複合的な難易度上昇へのボーナス
  if (highRes && deepInspect) bonus += 0.05;
  if (highRes && strongColor) bonus += 0.03;
  if (deepInspect && strongColor) bonus += 0.03;
  if (data.ocrProofread) bonus += 0.03;

  return 1.0 + Math.min(bonus, 0.1);
}

function factorKLoad(data: Data): number {
  const k = Math.max(0, Math.min(10, toInt(data.kLoadPct)));
  return 1.0 + k / 100;
}

function applyFactorCap(m: number, data: Data): number {
  const cap = data.capExceptionApproved ? data.factorCap : 2.2;
  return Math.min(m, cap);
}

// ------------------------------------------------------------------
// メイン計算関数
// ------------------------------------------------------------------

export function computeCalc(data: Data): CalcResult {
  const lineItems: LineItem[] = [];
  const unitBreakdowns: Record<string, UnitPriceBreakdown> = {};

  // 1. 変動費（L3 作業項目）の計算
  const fixedP = factorP(data);
  const kLoad = factorKLoad(data);
  let totalVol = 0;

  for (const w of data.workItems) {
    const qty = toInt(w.qty);
    totalVol += qty;

    const base = getBaseUnit(w.service, data.tier);
    const sizeAdder = SIZE_ADDERS[w.sizeClass] ?? 0;
    const fmtAdder = (w.fileFormats || []).reduce(
      (sum, f) => sum + (FORMAT_ADDERS[f] ?? 0), 0
    );

    // 係数計算
    const c = factorC(w);
    const q = factorQ(w, data);
    const inter = factorInteraction(w, data);
    const rawFactor = c * q * fixedP * inter * kLoad;
    const cappedFactor = applyFactorCap(rawFactor, data);

    // 単価決定: Base * Factor + Adders
    const unitPrice = Math.ceil(base * cappedFactor + sizeAdder + fmtAdder);
    const amount = unitPrice * qty;

    // 内訳を保存
    unitBreakdowns[w.id] = {
      base,
      factors: { c, q, p: fixedP, i: inter, k: kLoad, raw: rawFactor, capped: cappedFactor },
      sizeAdder,
      formatAdder: fmtAdder,
      unitPrice
    };

    // 明細行追加
    const serviceName = SERVICE_DEFINITIONS[w.service]?.name || w.service;
    const explain = `Base(${base})×Factor(${cappedFactor.toFixed(2)}) + Size(${sizeAdder}) + Fmt(${fmtAdder})`;
    
    lineItems.push({
      id: `L3-${w.id}`,
      phase: "L3",
      name: w.title,
      spec: `${serviceName} / ${w.sizeClass} / ${w.resolution} / ${w.colorSpace} / ${w.fileFormats.join("・")}`,
      qty,
      unit: w.unit,
      unitPrice,
      amount,
      explain,
      kind: "work"
    });

    // L4: 付帯処理（命名・画像処理など）の分離計上
    addProcessLineItems(lineItems, w, data, qty);
  }

  // 2. 固定費（L1, L2, L5）の計算
  addFixedLineItems(lineItems, data, totalVol);

  // 3. その他実費（自由入力）
  for (const m of data.miscExpenses) {
    // 実費(expense)の場合は30%乗せ、それ以外はそのまま
    let up = toInt(m.unitPrice);
    if (m.calcType === "expense") {
      up = Math.round(up * 1.3);
    }
    const amt = up * toInt(m.qty);
    lineItems.push({
      id: m.id,
      phase: "Misc",
      name: m.label,
      spec: m.note || "",
      qty: toInt(m.qty),
      unit: m.unit,
      unitPrice: up,
      amount: amt,
      explain: m.calcType === "expense" ? "実費+30%経費" : "手入力",
      kind: "misc"
    });
  }

  // 並び替え (L1 -> L2 -> L3 -> L4 -> L5 -> Misc)
  const phaseOrder: Record<string, number> = { L1: 1, L2: 2, L3: 3, L4: 4, L5: 5, Misc: 6 };
  lineItems.sort((a, b) => (phaseOrder[a.phase] || 99) - (phaseOrder[b.phase] || 99));

  // 合計
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const tax = Math.floor(subtotal * 0.1); // 税率10%固定（仕様）

  return {
    lineItems,
    subtotal,
    tax,
    total: subtotal + tax,
    totalVol,
    unitBreakdowns
  };
}

// ------------------------------------------------------------------
// 内部ヘルパー: 固定費・付帯処理の行生成
// ------------------------------------------------------------------

function addProcessLineItems(lines: LineItem[], w: WorkItem, data: Data, vol: number) {
  if (vol <= 0) return;

  // 命名規則による加算
  if (data.namingRule === "フォルダ名のみ") {
    const u = METADATA_UNIT_PRICES.folder;
    lines.push(createLine(`L4-NAMEF-${w.id}`, "L4", "メタデータ付与（フォルダ名）", `構造: ${data.folderStructure}`, vol, w.unit, u));
  } else if (data.namingRule === "ファイル名（背文字）") {
    const u = METADATA_UNIT_PRICES.file_simple;
    lines.push(createLine(`L4-NAME-${w.id}`, "L4", "メタデータ付与（背文字等）", `規則: ${data.namingRule}`, vol, w.unit, u));
  } else if (data.namingRule === "ファイル名（完全手入力）") {
    const u = METADATA_UNIT_PRICES.file_full;
    lines.push(createLine(`L4-NAMEFULL-${w.id}`, "L4", "メタデータ付与（完全手入力）", "手入力による完全命名", vol, w.unit, u));
  } else if (data.namingRule === "特殊命名規則") {
    const u = METADATA_UNIT_PRICES.special_rule;
    lines.push(createLine(`L4-SPECIAL-${w.id}`, "L4", "メタデータ付与（特殊規則）", "個別仕様ロジック適用", vol, w.unit, u));
  }

  // 2値化
  if (data.binaryConversion) {
    lines.push(createLine(`L4-BIN-${w.id}`, "L4", "画像処理（白黒2値化）", `閾値: ${data.binaryThreshold}`, vol, w.unit, 5));
  }

  // OCR
  if (data.ocr) {
    lines.push(createLine(`L4-OCR-${w.id}`, "L4", "OCR処理（校正なし）", "機械OCR処理", vol, w.unit, 5));
  }
  if (data.ocrProofread) {
    lines.push(createLine(`L4-OCRP-${w.id}`, "L4", "OCR校正（高精度）", "固有名詞・専門用語校正", vol, w.unit, 20));
  }
}

function addFixedLineItems(lines: LineItem[], data: Data, totalVol: number) {
  // L1: 基本料金
  let baseFee = 15000;
  for (const t of BASE_FEE_THRESHOLDS) {
    if (totalVol <= t.limit) {
      baseFee = t.fee;
      break;
    }
  }
  lines.push(createLine("F-BASE", "L1", "基本料金（PM費・最低受注額）", "案件管理・工程設計・品質体制", 1, "式", baseFee));

  // L1: 要件定義
  lines.push(createLine("L1-SOW", "L1", "要件定義・仕様策定", "SOW作成・仕様合意形成", 1, "式", 15000));

  // L2: 搬送
  const dist = toInt(data.transportDistanceKm);
  const trips = Math.max(1, toInt(data.transportTrips));
  let transBase = 5000;
  let perKm = 120;
  if (data.shippingType === "セキュリティ専用便") { transBase = 30000; perKm = 500; }
  else if (data.shippingType === "専用便") { transBase = 10000; perKm = 250; }
  else if (data.shippingType === "特殊セキュリティカー") { transBase = 60000; perKm = 800; }
  
  const transPrice = transBase + (dist * perKm);
  lines.push(createLine("L2-TRANS", "L2", `搬送（${data.shippingType}）`, `距離${dist}km × 往復${trips}回`, trips, "往復", transPrice));

  // L2: 照合
  if (data.strictCheckIn) {
    const checkInPrice = 10000 + (data.checkInListProvided ? 0 : 10000);
    lines.push(createLine("L2-CHECKIN", "L2", "厳格照合・受領記録", data.checkInListProvided ? "リスト突合" : "リスト作成含む", 1, "式", checkInPrice));
  }

  // L2: 前処理（合紙）
  if (data.interleaving && totalVol > 0) {
    lines.push(createLine("L2-INTERLEAVE", "L2", "前処理（合紙着脱）", "薄葉紙・裏写り対策", totalVol, "枚", 20));
  }

  // L2: 解体
  if (data.unbinding !== "なし") {
    let uPrice = 0;
    if (data.unbinding === "紐外し") uPrice = 1500;
    if (data.unbinding === "和綴じ解体") uPrice = 10000;
    if (data.unbinding === "ハードカバー解体") uPrice = 3000;
    lines.push(createLine("L2-UNBIND", "L2", `解体作業（${data.unbinding}）`, "原本構造保持・復元前提", 1, "式", uPrice));
  }

  // L2: 燻蒸
  if (data.fumigation) {
    lines.push(createLine("L2-FUMI", "L2", "燻蒸処理", "密閉環境・殺虫殺菌", 1, "回", 20000));
  }

  // L4: 環境ログ
  if (data.tempHumidLog) {
    lines.push(createLine("L4-ENVLOG", "L4", "温湿度管理ログ提出", "60分間隔・グラフ提出", 1, "式", 10000));
  }

  // L5: 復元
  if (data.rebind) {
    lines.push(createLine("L5-REBIND", "L5", "復元・再製本", "原状回復・綴じ直し", 1, "式", 3500));
  }

  // L5: 納品媒体
  const mediaCount = Math.max(1, toInt(data.mediaCount));
  data.deliveryMedia.forEach(media => {
    if (media === "HDD/SSD") lines.push(createLine("L5-HDD", "L5", "納品用HDD/SSD", "調達・暗号化・検査", mediaCount, "台", 20000));
    if (media === "DVD-R") lines.push(createLine("L5-DVDR", "L5", "長期保存用DVD-R", "書込検証・冗長化", mediaCount, "枚", 6000));
    if (media === "BD-R") lines.push(createLine("L5-BDR", "L5", "長期保存用BD-R", "書込検証・冗長化", mediaCount, "枚", 9000));
  });

  // L5: ラベル
  if (data.labelPrint) {
    lines.push(createLine("L5-LABEL", "L5", "レーベル印字・識別", "案件/媒体番号印字", mediaCount, "枚", 500));
  }

  // L5: 保管
  const months = toInt(data.longTermStorageMonths);
  if (months > 0) {
    lines.push(createLine("L5-STORE", "L5", "データ一時保管", `期間: ${months}ヶ月`, months, "月", 2500));
  }

  // L5: 消去証明
  if (data.dataDeletionProof) {
    lines.push(createLine("L5-DELPROOF", "L5", "データ消去証明", "証跡・ログ提出", 1, "式", 10000));
  }
}

function createLine(id: string, phase: LineItem["phase"], name: string, spec: string, qty: number, unit: string, unitPrice: number): LineItem {
  return {
    id, phase, name, spec, qty, unit, unitPrice,
    amount: qty * unitPrice,
    kind: "fixed" // 固定費扱い
  };
}