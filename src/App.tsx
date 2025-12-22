'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Archive OS v24.1 (SSOT-driven)
 * - SSOT: data + workItems[] から 帳票（作業指示書 / 見積書 / 仕様書 / 検査表）を生成
 * - 見積: “一式”禁止 → すべて行（LineItem）に分解
 * - 係数: C×Q×P×Interaction×K_load を明示し、上限×2.2（例外×2.5は承認フラグ必須）
 *
 * 使い方：
 * 1) 「入力」で data / workItems を編集
 * 2) 「指示書」「見積書」「仕様書」「検査表」で印刷（window.print）
 */

/* -----------------------------
 * Icons (no deps)
 * ----------------------------- */
const Icons = {
  FileText: (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Database: (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  Printer: (p: any) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  Coins: (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="8" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  ),
  FileSearch: (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <circle cx="10" cy="15" r="3" />
      <line x1="13" y1="18" x2="15" y2="20" />
    </svg>
  ),
  BadgeCheck: (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  Monitor: (p: any) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
};

/* -----------------------------
 * Constants / Layout
 * ----------------------------- */
const COMPANY_NAME = '株式会社国際マイクロ写真工業社';
const COMPANY_INFO = {
  address: '東京都新宿区箪笥町43',
  tel: '03-3260-5931',
  fax: '03-3260-5935',
  cert: 'JIS Q 27001 (ISMS) / プライバシーマーク取得済',
};

const A4_DOC_LAYOUT =
  'w-[210mm] min-h-[297mm] mx-auto bg-white p-[20mm] text-black border border-slate-300 print:m-0 print:border-none print:w-full print:p-[20mm] box-border shadow-lg print:shadow-none mb-8 font-serif leading-relaxed text-[11pt] relative';

const TABLE_STYLE = 'w-full border-collapse border border-black text-[10pt] my-4';
const TH_STYLE = 'border border-black bg-gray-100 p-2 font-bold text-center align-middle';
const TD_STYLE = 'border border-black p-2 align-top';

const INSPECTION_LEVELS = ['簡易目視検査 (抜き取り)', '標準全数検査 (作業者のみ)', '二重全数検査 (有資格者による再検)'] as const;
const COLOR_OPTS = ['モノクローム (TIFF/MMR)', 'sRGB', 'AdobeRGB'] as const;
const RESOLUTIONS = ['200dpi', '300dpi', '400dpi', '600dpi', '400dpi相当 (解像力120本/mm)'] as const;

type Tier = 'premium' | 'standard' | 'economy';
type View = 'input' | 'preview' | 'quotation' | 'spec' | 'qa';

const SERVICE_BASE = {
  A: { name: 'アーカイブ撮影（標準・非接触）', unit: 'cut', min: 300, mid: 325, max: 350 },
  A2: { name: 'アルバム特殊撮影（無反射・保護シート越し）', unit: 'cut', min: 1000, mid: 1000, max: 1000 },
  B: { name: '高速スキャン（ADF可・定型）', unit: '枚', min: 17, mid: 25.5, max: 34 },
  C: { name: '手置きスキャン（ADF不可・FB/OH）', unit: '枚', min: 60, mid: 72.5, max: 85 },
  D: { name: '大判スキャン（図面・長尺）', unit: '枚', min: 180, mid: 205, max: 230 },
  E: { name: 'MF電子化（保存/活用）', unit: 'コマ', min: 88, mid: 144, max: 200 },
  F: { name: '写真・乾板（透過原稿）', unit: 'コマ', min: 500, mid: 750, max: 1000 },
} as const;

type ServiceCode = keyof typeof SERVICE_BASE;

const SIZE_ADDERS: Record<string, number> = {
  'A4/B5': 0,
  A3: 0,
  B4: 50,
  A2: 2000,
  B2: 2500,
  A1: 3000,
  B3: 1500,
  'A0/長尺': 4000,
};

const FORMAT_ADDERS = {
  TIFF: 0,
  PDF: 10,
  JPG: 10,
  'PDF/A': 10,
  マルチPDF: 10,
  JPEG2000: 20,
};

const NAME_ENTRY_UNIT = {
  none: 0,
  folder: 10,
  file_simple: 30,
  file_full: 30,
  special_rule: 5,
} as const;

const formatDateJST = (date = new Date()) =>
  new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(date)
    .replace(/\//g, '-');

const num = (v: any) => {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

/* -----------------------------
 * UI Helpers
 * ----------------------------- */
const NavBtn = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-2 rounded w-full flex flex-col items-center gap-1 transition-all ${
      active ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
    }`}
  >
    <Icon />
    <span className="text-[9px]">{label}</span>
  </button>
);

const Card = ({ title, children }: any) => (
  <div className="bg-white p-6 rounded-lg border border-slate-300 shadow-sm h-full font-sans">
    <h4 className="text-sm font-bold border-b pb-2 mb-4 text-slate-700 flex items-center gap-2">{title}</h4>
    {children}
  </div>
);

const Field = ({ label, type = 'text', value, onChange, opts, disabled, placeholder, right }: any) => (
  <div className="space-y-1">
    <label className="text-[11px] font-bold text-slate-600 font-sans">{label}</label>
    {type === 'select' ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:border-indigo-500 font-medium"
        disabled={disabled}
      >
        {opts.map((o: any) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? e.target.value : e.target.value)}
        className={`w-full p-2 border border-slate-300 rounded text-sm disabled:bg-slate-100 focus:outline-none focus:border-indigo-500 font-medium ${
          right ? 'text-right' : ''
        }`}
        disabled={disabled}
        placeholder={placeholder}
      />
    )}
  </div>
);

const Checkbox = ({ label, checked, onChange, disabled }: any) => (
  <label className={`flex items-center gap-2 cursor-pointer font-sans ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} className="w-4 h-4 rounded border-slate-300" />
    <span className="text-xs font-bold text-slate-700">{label}</span>
  </label>
);

/* -----------------------------
 * Types (SSOT)
 * ----------------------------- */
type WorkItem = {
  id: number;
  service: ServiceCode;
  title: string;
  qty: number;
  unit: string;
  sizeClass: keyof typeof SIZE_ADDERS;
  resolution: (typeof RESOLUTIONS)[number];
  colorSpace: (typeof COLOR_OPTS)[number];
  fileFormats: string[];
  notes: string;
  fragile: boolean;
  dismantleAllowed: boolean;
  restorationRequired: boolean;
  requiresNonContact: boolean;
};

type Data = {
  jobNo: string;
  createdDate: string;
  subject: string;
  customerName: string;
  customerType: string;
  jurisdiction: string;
  contactName: string;
  contactTel: string;
  qualityManager: string;
  salesManager: string;
  supervisorCert: string;

  deadline: string;
  deadlineType: '絶対納期' | '目標納期';
  isExpress: boolean;
  expressLevel: '通常' | '特急(10営未満)' | '超特急(5営未満)';
  contractExists: boolean;
  meetingMemoExists: boolean;
  specStandard: boolean;
  privacyFlag: boolean;

  workLocation: '社内（高セキュリティ施設）' | '現地（出張）' | '外部委託（要承認）';
  strictCheckIn: boolean;
  checkInListProvided: boolean;
  transportDistanceKm: number;
  transportTrips: number;
  shippingType: '一般宅配' | '専用便' | 'セキュリティ専用便' | '特殊セキュリティカー';
  fumigation: boolean;
  tempHumidLog: boolean;
  neutralPaperBag: string;
  interleaving: boolean;
  unbinding: 'なし' | '紐外し' | '和綴じ解体' | 'ハードカバー解体';
  rebind: boolean;
  preprocessMemo: string;

  inspectionLevel: (typeof INSPECTION_LEVELS)[number];
  deltaE: boolean;
  reflectionSuppression: boolean;
  deskew: boolean;
  trimming: string;
  binaryConversion: boolean;
  binaryThreshold: string;
  ocr: boolean;
  ocrProofread: boolean;
  namingRule: '連番のみ' | 'フォルダ名のみ' | 'ファイル名（背文字）' | 'ファイル名（完全手入力）' | '特殊命名規則';
  folderStructure: string;
  indexType: 'なし' | '索引データ（Excel）' | 'TSV（UTF-8 BOMなし）';
  lineFeed: 'LF' | 'CRLF';

  deliveryMedia: Array<'HDD/SSD' | 'DVD-R' | 'BD-R' | 'クラウド'>;
  mediaCount: number;
  labelPrint: boolean;
  longTermStorageMonths: number;
  dataDeletionProof: boolean;
  disposal: 'なし' | '溶解処理' | '返却のみ';
  deliveryMemo: string;

  tier: Tier;
  kLoadPct: number;
  factorCap: 2.2 | 2.5;
  capExceptionApproved: boolean;
};

type LineItem = {
  id: string;
  phase: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  name: string;
  spec: string;
  qty: number;
  unit: string;
  unitPrice: number;
  amount: number;
  explain: string;
};

/* -----------------------------
 * Pricing engine (transparent)
 * ----------------------------- */
function baseUnitByTier(service: ServiceCode, tier: Tier) {
  const b = SERVICE_BASE[service];
  if (!b) return 0;
  if (tier === 'premium') return b.max;
  if (tier === 'standard') return b.mid;
  return b.min;
}

function factorC(item: WorkItem) {
  let c = 1.0;
  if (item.fragile) c += 0.2;
  if (!item.dismantleAllowed) c += 0.15;
  if (item.restorationRequired) c += 0.15;
  if (item.requiresNonContact) c += 0.1;
  return c;
}

function factorQ(item: WorkItem, data: Data) {
  let q = 1.0;
  const res = String(item.resolution);
  if (res.includes('600')) q += 0.75;
  else if (res.includes('400')) q += 0.5;
  else if (res.includes('300')) q += 0.2;

  if (data.inspectionLevel.includes('二重')) q += 0.5;
  else if (data.inspectionLevel.includes('全数')) q += 0.25;

  if (item.colorSpace === 'AdobeRGB') q += 0.15;
  if (data.deltaE && item.colorSpace === 'AdobeRGB') q += 0.1;

  return q;
}

function factorP(data: Data) {
  let p = 1.0;
  if (data.tempHumidLog) p += 0.1;
  if (data.fumigation) p += 0.1;
  if (data.ocr) p += 0.15;
  if (data.ocrProofread) p += 0.25;
  if (data.namingRule === 'ファイル名（完全手入力）') p += 0.1;
  if (data.indexType !== 'なし') p += 0.05;
  return p;
}

function factorInteraction(item: WorkItem, data: Data) {
  let bonus = 0;
  const highRes = String(item.resolution).includes('400') || String(item.resolution).includes('600');
  const deepInspect = data.inspectionLevel.includes('二重');
  const strongColor = item.colorSpace === 'AdobeRGB';

  if (highRes && deepInspect) bonus += 0.05;
  if (highRes && strongColor) bonus += 0.03;
  if (deepInspect && strongColor) bonus += 0.03;
  if (data.ocrProofread) bonus += 0.03;

  return 1.0 + Math.min(bonus, 0.1);
}

function factorKLoad(data: Data) {
  const k = Math.max(0, Math.min(10, num(data.kLoadPct)));
  return 1.0 + k / 100;
}

function applyFactorCap(m: number, data: Data) {
  const cap = data.capExceptionApproved ? data.factorCap : 2.2;
  return Math.min(m, cap);
}

function baseFeeF(totalVol: number) {
  if (totalVol <= 1000) return 30000;
  if (totalVol <= 10000) return 20000;
  return 15000;
}

function buildFixedLineItems(data: Data, totalVol: number): LineItem[] {
  const items: LineItem[] = [];

  items.push({
    id: 'L1-SOW',
    phase: 'L1',
    name: '要件定義・仕様策定（SOW作成、見積提示、設計）',
    spec: 'ヒアリング結果に基づく仕様確定、帳票一式生成、合意形成支援',
    qty: 1,
    unit: '件',
    unitPrice: 15000,
    amount: 15000,
    explain: 'L1（導入・設計）として固定計上。',
  });

  const dist = Math.max(0, num(data.transportDistanceKm));
  const trips = Math.max(1, num(data.transportTrips));
  const base = data.shippingType === 'セキュリティ専用便' ? 30000 : data.shippingType === '専用便' ? 10000 : data.shippingType === '特殊セキュリティカー' ? 60000 : 5000;
  const perKm = data.shippingType === 'セキュリティ専用便' ? 500 : data.shippingType === '専用便' ? 250 : data.shippingType === '特殊セキュリティカー' ? 800 : 120;

  items.push({
    id: 'L2-TRANS',
    phase: 'L2',
    name: `搬送（${data.shippingType}）`,
    spec: `距離${dist}km × 往復${trips}回。施錠・追跡・引渡し記録を含む。`,
    qty: trips,
    unit: '往復',
    unitPrice: base + dist * perKm,
    amount: (base + dist * perKm) * trips,
    explain: '距離課金＋ベースで構成。',
  });

  if (data.strictCheckIn) {
    const checkIn = 10000 + (data.checkInListProvided ? 0 : 10000);
    items.push({
      id: 'L2-CHECKIN',
      phase: 'L2',
      name: '厳格照合・受領記録（点数突合、借用書、入出庫ログ）',
      spec: data.checkInListProvided ? '顧客提供リストに基づく突合' : '顧客リスト未提供のためリスト作成を含む',
      qty: 1,
      unit: '件',
      unitPrice: checkIn,
      amount: checkIn,
      explain: '照合工数を固定作業として分離回収。',
    });
  }

  if (data.interleaving) {
    items.push({
      id: 'L2-INTERLEAVE',
      phase: 'L2',
      name: '前処理（合紙着脱・裏写り対策）',
      spec: '薄葉紙・裏写り対策として合紙を挿入し、撮影/スキャン毎に着脱',
      qty: totalVol,
      unit: '枚',
      unitPrice: 20,
      amount: totalVol * 20,
      explain: '枚単位で計上（平均¥20/枚）。',
    });
  }

  if (data.unbinding !== 'なし') {
    const u = data.unbinding === '紐外し' ? 1500 : data.unbinding === '和綴じ解体' ? 10000 : data.unbinding === 'ハードカバー解体' ? 3000 : 0;
    items.push({
      id: 'L2-UNBIND',
      phase: 'L2',
      name: `解体作業（${data.unbinding}）`,
      spec: '原本の構造を保持しつつ、読み取り可能状態へ移行',
      qty: 1,
      unit: '冊',
      unitPrice: u,
      amount: u,
      explain: '冊単位で計上。',
    });
  }

  if (data.rebind) {
    items.push({
      id: 'L5-REBIND',
      phase: 'L5',
      name: '復元・再製本（原状回復）',
      spec: '綴じ直し、復元工程を含む（原本の外観保持）',
      qty: 1,
      unit: '冊',
      unitPrice: 3500,
      amount: 3500,
      explain: '復元工程を分離計上。',
    });
  }

  if (data.fumigation) {
    items.push({
      id: 'L2-FUMI',
      phase: 'L2',
      name: '燻蒸処理（害虫・カビ対策）',
      spec: '密閉環境での燻蒸実施、作業安全と資料保全を確保',
      qty: 1,
      unit: '回',
      unitPrice: 20000,
      amount: 20000,
      explain: '環境確保・安全管理の固定費。',
    });
  }

  if (data.tempHumidLog) {
    items.push({
      id: 'L4-ENVLOG',
      phase: 'L4',
      name: '温湿度管理・ログ提出（60分間隔）',
      spec: '22℃±2℃、55%±5%、60%超過禁止。経時グラフとログを提出。',
      qty: 1,
      unit: '件',
      unitPrice: 10000,
      amount: 10000,
      explain: '監視負荷を固定費として回収。',
    });
  }

  if (data.deliveryMedia.includes('HDD/SSD')) {
    const n = Math.max(1, num(data.mediaCount));
    items.push({
      id: 'L5-HDD',
      phase: 'L5',
      name: '納品用SSD/HDD準備',
      spec: '媒体調達・検査・暗号化対応（必要時）を含む。',
      qty: n,
      unit: '台',
      unitPrice: 20000,
      amount: n * 20000,
      explain: '調達費＋検査工数。',
    });
  }
  if (data.deliveryMedia.includes('DVD-R')) {
    const n = Math.max(1, num(data.mediaCount));
    items.push({
      id: 'L5-DVDR',
      phase: 'L5',
      name: '長期保存用DVD-R作成',
      spec: '書込検証・冗長化を含む。',
      qty: n,
      unit: '枚',
      unitPrice: 6000,
      amount: n * 6000,
      explain: '書込検証を含む。',
    });
  }
  if (data.deliveryMedia.includes('BD-R')) {
    const n = Math.max(1, num(data.mediaCount));
    items.push({
      id: 'L5-BDR',
      phase: 'L5',
      name: '長期保存用BD-R作成',
      spec: '書込検証・冗長化を含む。',
      qty: n,
      unit: '枚',
      unitPrice: 9000,
      amount: n * 9000,
      explain: '書込検証を含む。',
    });
  }
  if (data.labelPrint) {
    const n = Math.max(1, num(data.mediaCount));
    items.push({
      id: 'L5-LABEL',
      phase: 'L5',
      name: 'レーベル印字・識別表示',
      spec: '案件番号、媒体番号、作成日を印字',
      qty: n,
      unit: '枚',
      unitPrice: 500,
      amount: n * 500,
      explain: '識別管理のため媒体ごとに実施。',
    });
  }

  if (num(data.longTermStorageMonths) > 0) {
    items.push({
      id: 'L5-STORE',
      phase: 'L5',
      name: 'データ保管（期限付き）',
      spec: `一次保管（${data.longTermStorageMonths}か月）。`,
      qty: num(data.longTermStorageMonths),
      unit: '月',
      unitPrice: 2500,
      amount: num(data.longTermStorageMonths) * 2500,
      explain: '期限付きで月額課金。',
    });
  }

  if (data.dataDeletionProof) {
    items.push({
      id: 'L5-DELPROOF',
      phase: 'L5',
      name: 'データ消去証明（証跡提出）',
      spec: '消去手順、実施日、担当者、消去ログ（可能な範囲）を提出',
      qty: 1,
      unit: '件',
      unitPrice: 10000,
      amount: 10000,
      explain: '証跡整備作業を分離計上。',
    });
  }

  const fee = baseFeeF(totalVol);
  items.push({
    id: 'F-BASEFEE',
    phase: 'L1',
    name: '基本料金（プロジェクト管理・最低受注額）',
    spec: '案件管理、工程設計、品質管理体制の維持',
    qty: 1,
    unit: '件',
    unitPrice: fee,
    amount: fee,
    explain: '最低受注額（F）として明示。',
  });

  return items;
}

function buildVariableLineItems(data: Data, workItems: WorkItem[]) {
  const totalVol = workItems.reduce((s, w) => s + num(w.qty), 0);
  const fixedP = factorP(data);
  const kLoad = factorKLoad(data);

  const lines: LineItem[] = [];

  for (const w of workItems) {
    const base = baseUnitByTier(w.service, data.tier);
    const sizeAdder = SIZE_ADDERS[w.sizeClass] ?? 0;
    const fmtAdder = (w.fileFormats || []).reduce((sum, f) => sum + (FORMAT_ADDERS as any)[f] ?? 0, 0);

    const c = factorC(w);
    const q = factorQ(w, data);
    const inter = factorInteraction(w, data);
    const mRaw = c * q * fixedP * inter * kLoad;
    const m = applyFactorCap(mRaw, data);

    const unitPrice = Math.ceil(base * m + sizeAdder + fmtAdder);
    const amount = unitPrice * num(w.qty);

    const explain =
      `Base(${yen(base)}/${w.unit}) × M_total(${m.toFixed(2)}) + サイズ加算(${yen(sizeAdder)}) + 形式加算(${yen(fmtAdder)})。` +
      ` 内訳: C=${c.toFixed(2)}, Q=${q.toFixed(2)}, P=${fixedP.toFixed(2)}, Interaction=${inter.toFixed(2)}, K_load=${kLoad.toFixed(2)}。` +
      ` 上限=${data.capExceptionApproved ? data.factorCap : 2.2}。`;

    lines.push({
      id: `L3-${w.id}`,
      phase: 'L3',
      name: w.title,
      spec: `${SERVICE_BASE[w.service].name} / ${w.sizeClass} / ${w.resolution} / ${w.colorSpace} / ${w.fileFormats.join('・')}\n${w.notes}`,
      qty: num(w.qty),
      unit: w.unit,
      unitPrice,
      amount,
      explain,
    });

    const vol = num(w.qty);

    if (data.namingRule === 'フォルダ名のみ') {
      const u = NAME_ENTRY_UNIT.folder;
      lines.push({
        id: `L4-NAMEF-${w.id}`,
        phase: 'L4',
        name: 'メタデータ付与（フォルダ名入力）',
        spec: `フォルダ構造: ${data.folderStructure}`,
        qty: vol,
        unit: w.unit,
        unitPrice: u,
        amount: vol * u,
        explain: 'フォルダ単位の命名を分離計上。',
      });
    } else if (data.namingRule === 'ファイル名（背文字）') {
      const u = NAME_ENTRY_UNIT.file_simple;
      lines.push({
        id: `L4-NAME-${w.id}`,
        phase: 'L4',
        name: 'メタデータ付与（ファイル名入力：背文字等）',
        spec: `命名規則: ${data.namingRule}`,
        qty: vol,
        unit: w.unit,
        unitPrice: u,
        amount: vol * u,
        explain: '転記入力を分離計上。',
      });
    } else if (data.namingRule === 'ファイル名（完全手入力）') {
      const u = NAME_ENTRY_UNIT.file_full;
      lines.push({
        id: `L4-NAMEFULL-${w.id}`,
        phase: 'L4',
        name: 'メタデータ付与（ファイル名完全手入力）',
        spec: '手入力による完全命名',
        qty: vol,
        unit: w.unit,
        unitPrice: u,
        amount: vol * u,
        explain: '入力品質責任が増す前提で分離計上。',
      });
    } else if (data.namingRule === '特殊命名規則') {
      const u = NAME_ENTRY_UNIT.special_rule;
      lines.push({
        id: `L4-SPECIALNAME-${w.id}`,
        phase: 'L4',
        name: 'メタデータ付与（特殊命名規則）',
        spec: '個別仕様に基づく命名ロジック適用',
        qty: vol,
        unit: w.unit,
        unitPrice: u,
        amount: vol * u,
        explain: '要件に応じた加算として計上。',
      });
    }

    if (data.binaryConversion) {
      const u = 5;
      lines.push({
        id: `L4-BIN-${w.id}`,
        phase: 'L4',
        name: '画像処理（白黒2値化）',
        spec: `閾値: ${data.binaryThreshold}`,
        qty: vol,
        unit: w.unit,
        unitPrice: u,
        amount: vol * u,
        explain: '2値化は調整が必要なため別行で計上。',
      });
    }

    if (data.ocr) {
      const u = 5;
      lines.push({
        id: `L4-OCR-${w.id}`,
        phase: 'L4',
        name: 'OCR処理（校正なし）',
        spec: '機械OCR（校正なし）',
        qty: vol,
        unit: w.unit,
        unitPrice: u,
        amount: vol * u,
        explain: 'OCRを追加工程として分離計上。',
      });
    }
    if (data.ocrProofread) {
      const u = 20;
      lines.push({
        id: `L4-OCRP-${w.id}`,
        phase: 'L4',
        name: 'OCR校正（高精度）',
        spec: '固有名詞・専門用語の校正',
        qty: vol,
        unit: w.unit,
        unitPrice: u,
        amount: vol * u,
        explain: '人手作業のため別行で計上。',
      });
    }
  }

  return { lines, totalVol };
}

function summarize(lineItems: LineItem[]) {
  const subtotal = lineItems.reduce((s, x) => s + x.amount, 0);
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

/* -----------------------------
 * Spec builder (long form)
 * ----------------------------- */
function buildSpecSections(data: Data, workItems: WorkItem[]) {
  const totalVol = workItems.reduce((s, w) => s + num(w.qty), 0);
  const services = workItems.map((w) => `${w.title}（${w.qty}${w.unit}）`).join('、');
  const env = data.tempHumidLog
    ? '作業環境は温度22℃（±2℃）、湿度55%（±5%）を維持し、湿度60%超過を禁止する。60分間隔ログを採取し、経時グラフを提出する。'
    : '原本保存に適した清浄な温湿度環境を維持し、原本の変質リスクを最小化する。';

  const inspection = data.inspectionLevel.includes('二重')
    ? '全数検査に加え、有資格者による再検（いわゆる二重全数検査）を実施する。'
    : data.inspectionLevel.includes('全数')
    ? '全数検査を実施する。'
    : '抜取検査を実施する。';

  return [
    {
      title: '第1章 総則',
      p: [
        `本仕様書は、「${data.subject}」に関するデジタル化及び関連業務（以下「本業務」という。）の条件を定める。`,
        `対象範囲は、${services}を含む。総数量は概ね${totalVol.toLocaleString()}単位である。`,
        '受託者は、原資料の物理的保全を最優先事項とし、情報落ち（欠落、判読不能、色再現の破綻等）を生じさせない品質で遂行する。',
      ],
    },
    {
      title: '第2章 情報セキュリティ・管理体制',
      p: [
        `${COMPANY_INFO.cert} を満たす管理体制の下で本業務を遂行する。原本及びデータは、権限管理、入退室管理、施錠保管、媒体管理等により、漏えい・滅失・毀損を防止する。`,
        `作業場所は「${data.workLocation}」とする。外部委託を行う場合は、発注者の事前承認を要する。`,
      ],
    },
    {
      title: '第3章 受領・搬送・照合（L2）',
      p: [
        `搬送は「${data.shippingType}」により実施し、施錠、追跡、引渡し記録を確保する。`,
        `厳格照合は「${data.strictCheckIn ? '実施' : '未実施'}」とする。顧客リスト提供は「${data.checkInListProvided ? '有' : '無'}」。`,
        `前処理（合紙）は「${data.interleaving ? '実施' : '不要'}」。解体は「${data.unbinding}」。復元（再製本）は「${data.rebind ? '実施' : '不要'}」。`,
      ],
    },
    {
      title: '第4章 撮影・スキャン仕様（L3）',
      p: [
        '各作業項目ごとに、解像度、色空間、読み取り範囲、ファイル形式を満たすデータを作成する。',
        'デジタル補間による擬似的な解像度向上は行わず、光学的精細度を確保する。',
        `反射抑制（無反射対策）は「${data.reflectionSuppression ? '実施' : '不要'}」。`,
      ],
    },
    {
      title: '第5章 画像処理・メタデータ（L4）',
      p: [
        `傾き補正は「${data.deskew ? '実施' : '不要'}」。トリミングは「${data.trimming}」。`,
        `2値化は「${data.binaryConversion ? '実施' : '不要'}」。閾値は「${data.binaryThreshold}」。`,
        `OCRは「${data.ocr ? '実施' : '不要'}」。校正は「${data.ocrProofread ? '実施' : 'なし'}」。`,
        `命名規則は「${data.namingRule}」。フォルダ構造は「${data.folderStructure}」。索引は「${data.indexType}」。改行は「${data.lineFeed}」。`,
      ],
    },
    {
      title: '第6章 検査・品質保証（L4）',
      p: [
        `検査深度は「${data.inspectionLevel}」。${inspection}`,
        '検査項目は、欠落・重複・順序・判読性・ピント・傾き・異物混入・ファイル破損・命名規則違反・索引整合等を含む。',
      ],
    },
    {
      title: '第7章 環境管理（L4）',
      p: [env, `燻蒸は「${data.fumigation ? '実施' : '不要'}」。中性紙袋等は「${data.neutralPaperBag}」。`],
    },
    {
      title: '第8章 納品・保管・消去（L5）',
      p: [
        `納品媒体は ${data.deliveryMedia.join('、')}、媒体セット数は${data.mediaCount}。ラベル印字は「${data.labelPrint ? '実施' : '不要'}」。`,
        `保管（月）は${data.longTermStorageMonths}。データ消去証明は「${data.dataDeletionProof ? '提出' : '不要'}」。`,
        `廃棄（原本/媒体）は「${data.disposal}」。`,
        `備考：${data.deliveryMemo || '—'}`,
      ],
    },
    {
      title: '第9章 積算・係数の原則（付則）',
      p: [
        '見積の基本構造は、Total = [(Base×Vol)×(C×Q×P×Interaction×K_load)] + S + F に従う。',
        '係数積の上限は×2.2とし、例外として×2.5の適用は承認（決裁）を要する。',
        '交互作用（Interaction）は二重計上を避け、最大+10%を上限とする。',
      ],
    },
  ];
}

/* -----------------------------
 * Document helpers
 * ----------------------------- */
const HeaderBlock = ({ title, data }: { title: string; data: Data }) => (
  <div className="mb-4">
    <div className="flex justify-between items-start">
      <div>
        <div className="text-[14pt] font-bold">{title}</div>
        <div className="text-[10pt] mt-1">案件番号：{data.jobNo}　発行日：{data.createdDate}</div>
      </div>
      <div className="text-right text-[9pt] leading-snug">
        <div className="font-bold">{COMPANY_NAME}</div>
        <div>{COMPANY_INFO.address}</div>
        <div>TEL {COMPANY_INFO.tel} / FAX {COMPANY_INFO.fax}</div>
      </div>
    </div>
    <div className="mt-3 border-t border-black" />
  </div>
);

const SmallMetaTable = ({ data }: { data: Data }) => (
  <table className={TABLE_STYLE}>
    <tbody>
      <tr>
        <th className={TH_STYLE} style={{ width: '18%' }}>
          発注者
        </th>
        <td className={TD_STYLE} style={{ width: '32%' }}>
          {data.customerName}
          <div className="text-[9pt] text-slate-700">{data.jurisdiction}</div>
        </td>
        <th className={TH_STYLE} style={{ width: '18%' }}>
          担当（先方）
        </th>
        <td className={TD_STYLE} style={{ width: '32%' }}>
          {data.contactName}　{data.contactTel}
        </td>
      </tr>
      <tr>
        <th className={TH_STYLE}>件名</th>
        <td className={TD_STYLE} colSpan={3}>
          {data.subject}
        </td>
      </tr>
      <tr>
        <th className={TH_STYLE}>納期</th>
        <td className={TD_STYLE}>
          {data.deadline}（{data.deadlineType}）
          {data.isExpress ? <span className="ml-2 font-bold">［{data.expressLevel}］</span> : null}
        </td>
        <th className={TH_STYLE}>作業場所</th>
        <td className={TD_STYLE}>{data.workLocation}</td>
      </tr>
      <tr>
        <th className={TH_STYLE}>品質責任者</th>
        <td className={TD_STYLE}>{data.qualityManager}</td>
        <th className={TH_STYLE}>営業担当</th>
        <td className={TD_STYLE}>{data.salesManager}</td>
      </tr>
    </tbody>
  </table>
);

function groupByPhase(lineItems: LineItem[]) {
  const groups: Record<string, LineItem[]> = { L1: [], L2: [], L3: [], L4: [], L5: [] };
  for (const li of lineItems) groups[li.phase].push(li);
  return groups;
}

/* -----------------------------
 * App
 * ----------------------------- */
export default function App() {
  const [view, setView] = useState<View>('input');
  const mainRef = useRef<HTMLDivElement | null>(null);

  const [data, setData] = useState<Data>({
    jobNo: '25-001024',
    createdDate: formatDateJST(),
    subject: '令和5年度 所蔵資料デジタル化業務委託',
    customerName: '○○組合長',
    customerType: '官公庁・自治体',
    jurisdiction: '総務課 契約担当',
    contactName: '○○ ○○',
    contactTel: '00-0000-0000',
    qualityManager: '高橋 幸一',
    salesManager: '一木',
    supervisorCert: '文書情報管理士1級',

    deadline: '2026-03-31',
    deadlineType: '絶対納期',
    isExpress: false,
    expressLevel: '通常',
    contractExists: true,
    meetingMemoExists: true,
    specStandard: true,
    privacyFlag: true,

    workLocation: '社内（高セキュリティ施設）',
    strictCheckIn: true,
    checkInListProvided: true,
    transportDistanceKm: 30,
    transportTrips: 2,
    shippingType: 'セキュリティ専用便',
    fumigation: true,
    tempHumidLog: true,
    neutralPaperBag: 'AFプロテクトH相当',
    interleaving: false,
    unbinding: 'なし',
    rebind: false,
    preprocessMemo: '受領時に劣化・汚損の有無を確認し、必要な場合は協議の上で補修を行う。',

    inspectionLevel: '二重全数検査 (有資格者による再検)',
    deltaE: false,
    reflectionSuppression: false,
    deskew: true,
    trimming: 'あり (110%)',
    binaryConversion: false,
    binaryThreshold: '固定128',
    ocr: false,
    ocrProofread: false,
    namingRule: '連番のみ',
    folderStructure: 'Root / 書誌ID / 分冊',
    indexType: '索引データ（Excel）',
    lineFeed: 'LF',

    deliveryMedia: ['HDD/SSD', 'DVD-R'],
    mediaCount: 1,
    labelPrint: true,
    longTermStorageMonths: 0,
    dataDeletionProof: true,
    disposal: 'なし',
    deliveryMemo: '納品媒体の暗号化は要望に応じて対応する。',

    tier: 'premium',
    kLoadPct: 0,
    factorCap: 2.2,
    capExceptionApproved: false,
  });

  const [workItems, setWorkItems] = useState<WorkItem[]>([
    {
      id: 1,
      service: 'C',
      title: '資料の電子化（見開きA3以内）',
      qty: 65100,
      unit: '枚',
      sizeClass: 'A3',
      resolution: '400dpi',
      colorSpace: 'モノクローム (TIFF/MMR)',
      fileFormats: ['TIFF', 'マルチPDF'],
      notes: '原寸、落丁・乱丁防止、見開き保持。',
      fragile: true,
      dismantleAllowed: true,
      restorationRequired: true,
      requiresNonContact: true,
    },
    {
      id: 2,
      service: 'D',
      title: '図面の電子化（A2）',
      qty: 5,
      unit: '枚',
      sizeClass: 'A2',
      resolution: '400dpi',
      colorSpace: 'sRGB',
      fileFormats: ['TIFF', 'JPG'],
      notes: '折り目・反りの補正、全体図と細部の判読性確保。',
      fragile: false,
      dismantleAllowed: true,
      restorationRequired: false,
      requiresNonContact: false,
    },
  ]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const el = mainRef.current;
    if (el) el.scrollTop = 0;
  }, [view]);

  const applyTier = (t: Tier) => {
    setData((p) => {
      const base: Partial<Data> =
        t === 'premium'
          ? { inspectionLevel: '二重全数検査 (有資格者による再検)', tempHumidLog: true, shippingType: 'セキュリティ専用便', kLoadPct: 0 }
          : t === 'standard'
          ? { inspectionLevel: '標準全数検査 (作業者のみ)', tempHumidLog: false, shippingType: '専用便', kLoadPct: 0 }
          : { inspectionLevel: '簡易目視検査 (抜き取り)', tempHumidLog: false, shippingType: '一般宅配', kLoadPct: 0 };
      return { ...p, tier: t, ...base };
    });
  };

  const addWorkItem = () => {
    const id = Date.now();
    setWorkItems((p) => [
      ...p,
      {
        id,
        service: 'C',
        title: '（新規）作業項目',
        qty: 0,
        unit: '枚',
        sizeClass: 'A4/B5',
        resolution: '300dpi',
        colorSpace: 'sRGB',
        fileFormats: ['PDF'],
        notes: '',
        fragile: false,
        dismantleAllowed: true,
        restorationRequired: false,
        requiresNonContact: false,
      },
    ]);
  };
  const removeWorkItem = (id: number) => setWorkItems((p) => p.filter((x) => x.id !== id));
  const updateWorkItem = (id: number, patch: Partial<WorkItem>) => setWorkItems((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const pricing = useMemo(() => {
    const { lines: variableLines, totalVol } = buildVariableLineItems(data, workItems);
    const fixedLines = buildFixedLineItems(data, totalVol);
    const all = [...fixedLines, ...variableLines];
    const order: Record<LineItem['phase'], number> = { L1: 1, L2: 2, L3: 3, L4: 4, L5: 5 };
    all.sort((a, b) => order[a.phase] - order[b.phase]);
    const sum = summarize(all);
    return { lineItems: all, totalVol, ...sum };
  }, [data, workItems]);

  const specSections = useMemo(() => buildSpecSections(data, workItems), [data, workItems]);

  const factorSnapshot = useMemo(() => {
    const w = workItems[0];
    if (!w) return null;
    const c = factorC(w);
    const q = factorQ(w, data);
    const p = factorP(data);
    const i = factorInteraction(w, data);
    const k = factorKLoad(data);
    const raw = c * q * p * i * k;
    const capped = applyFactorCap(raw, data);
    return { c, q, p, i, k, raw, capped };
  }, [data, workItems]);

  const phaseGroups = useMemo(() => groupByPhase(pricing.lineItems), [pricing.lineItems]);

  return (
    <div className="flex h-screen min-h-0 bg-slate-100 text-slate-900 font-sans overflow-hidden">
      <aside className="w-16 bg-slate-800 text-white flex flex-col items-center py-8 gap-8 shrink-0 print:hidden z-50 shadow-2xl">
        <div className="bg-indigo-600 p-2 rounded mb-4">
          <Icons.Database />
        </div>
        <NavBtn icon={Icons.FileText} label="入力" active={view === 'input'} onClick={() => setView('input')} />
        <NavBtn icon={Icons.Monitor} label="指示書" active={view === 'preview'} onClick={() => setView('preview')} />
        <NavBtn icon={Icons.Coins} label="見積書" active={view === 'quotation'} onClick={() => setView('quotation')} />
        <NavBtn icon={Icons.FileSearch} label="仕様書" active={view === 'spec'} onClick={() => setView('spec')} />
        <NavBtn icon={Icons.BadgeCheck} label="検査表" active={view === 'qa'} onClick={() => setView('qa')} />
      </aside>

      <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto bg-slate-50">
        <div className="p-8 print:p-0 print:bg-white">
          <div className="flex justify-between items-center mb-6 print:hidden max-w-[1100px] mx-auto">
            <div>
              <h1 className="text-xl font-bold">
                Archive OS v24.1 <span className="text-sm font-normal text-slate-500">for {COMPANY_NAME}</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">SSOT / “一式”禁止 / 係数の可視化 / そのまま印刷可能（A4）</p>
            </div>
            <button type="button" onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2">
              <Icons.Printer /> 印刷
            </button>
          </div>

          {view === 'input' && (
            <div className="max-w-[1100px] mx-auto space-y-6 pb-20">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-300 flex justify-between items-center">
                <div className="flex gap-8">
                  <div>
                    <p className="text-xs text-slate-500 font-bold">プラン</p>
                    <p className="text-xl font-bold text-indigo-700 uppercase">{data.tier}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold">代表係数（C×Q×P×I×K）</p>
                    <p className="text-xl font-bold text-slate-800">{factorSnapshot ? factorSnapshot.capped.toFixed(2) : '—'}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      raw={factorSnapshot?.raw.toFixed(2)} → cap={data.capExceptionApproved ? data.factorCap : 2.2}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold">見積合計（税込）</p>
                    <p className="text-xl font-bold text-slate-900">{yen(pricing.total)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(['premium', 'standard', 'economy'] as Tier[]).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => applyTier(t)}
                      className={`px-4 py-2 rounded text-xs font-bold uppercase border-2 transition ${
                        data.tier === t ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Apply {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Card title="L1 導入・設計 / 基本情報">
                  <div className="grid gap-4">
                    <Field label="Job No" value={data.jobNo} onChange={(v: string) => setData((p) => ({ ...p, jobNo: v }))} />
                    <Field label="発行日" type="date" value={data.createdDate} onChange={(v: string) => setData((p) => ({ ...p, createdDate: v }))} />
                    <Field label="顧客名" value={data.customerName} onChange={(v: string) => setData((p) => ({ ...p, customerName: v }))} />
                    <Field label="件名" value={data.subject} onChange={(v: string) => setData((p) => ({ ...p, subject: v }))} />
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="主管課" value={data.jurisdiction} onChange={(v: string) => setData((p) => ({ ...p, jurisdiction: v }))} />
                      <Field label="顧客種別" value={data.customerType} onChange={(v: string) => setData((p) => ({ ...p, customerType: v }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="担当（先方）" value={data.contactName} onChange={(v: string) => setData((p) => ({ ...p, contactName: v }))} />
                      <Field label="電話（先方）" value={data.contactTel} onChange={(v: string) => setData((p) => ({ ...p, contactTel: v }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="品質責任者" value={data.qualityManager} onChange={(v: string) => setData((p) => ({ ...p, qualityManager: v }))} />
                      <Field label="営業担当" value={data.salesManager} onChange={(v: string) => setData((p) => ({ ...p, salesManager: v }))} />
                    </div>
                    <Field label="監督者資格" value={data.supervisorCert} onChange={(v: string) => setData((p) => ({ ...p, supervisorCert: v }))} />
                    <div className="grid grid-cols-2 gap-4 bg-blue-50 p-3 rounded border border-blue-200">
                      <Field label="納期" type="date" value={data.deadline} onChange={(v: string) => setData((p) => ({ ...p, deadline: v }))} />
                      <Field
                        label="納期種別"
                        type="select"
                        value={data.deadlineType}
                        onChange={(v: any) => setData((p) => ({ ...p, deadlineType: v }))}
                        opts={[
                          { v: '絶対納期', l: '絶対納期' },
                          { v: '目標納期', l: '目標納期' },
                        ]}
                      />
                      <Checkbox label="特急" checked={data.isExpress} onChange={(v: boolean) => setData((p) => ({ ...p, isExpress: v }))} />
                      <Field
                        label="特急レベル"
                        type="select"
                        value={data.expressLevel}
                        onChange={(v: any) => setData((p) => ({ ...p, expressLevel: v }))}
                        opts={[
                          { v: '通常', l: '通常' },
                          { v: '特急(10営未満)', l: '特急(10営未満)' },
                          { v: '超特急(5営未満)', l: '超特急(5営未満)' },
                        ]}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border">
                      <Checkbox label="仕様書（公的規格準拠）" checked={data.specStandard} onChange={(v: boolean) => setData((p) => ({ ...p, specStandard: v }))} />
                      <Checkbox label="個人情報フラグ" checked={data.privacyFlag} onChange={(v: boolean) => setData((p) => ({ ...p, privacyFlag: v }))} />
                      <Checkbox label="契約書あり" checked={data.contractExists} onChange={(v: boolean) => setData((p) => ({ ...p, contractExists: v }))} />
                      <Checkbox label="打合せ記録あり" checked={data.meetingMemoExists} onChange={(v: boolean) => setData((p) => ({ ...p, meetingMemoExists: v }))} />
                    </div>
                  </div>
                </Card>

                <Card title="L2〜L5 運用条件 / 係数運用">
                  <div className="grid gap-4">
                    <Field
                      label="作業場所"
                      type="select"
                      value={data.workLocation}
                      onChange={(v: any) => setData((p) => ({ ...p, workLocation: v }))}
                      opts={[
                        { v: '社内（高セキュリティ施設）', l: '社内（高セキュリティ施設）' },
                        { v: '現地（出張）', l: '現地（出張）' },
                        { v: '外部委託（要承認）', l: '外部委託（要承認）' },
                      ]}
                    />
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border">
                      <Checkbox label="厳格照合" checked={data.strictCheckIn} onChange={(v: boolean) => setData((p) => ({ ...p, strictCheckIn: v }))} />
                      <Checkbox label="顧客リスト提供" checked={data.checkInListProvided} onChange={(v: boolean) => setData((p) => ({ ...p, checkInListProvided: v }))} />
                      <Checkbox label="燻蒸" checked={data.fumigation} onChange={(v: boolean) => setData((p) => ({ ...p, fumigation: v }))} />
                      <Checkbox label="温湿度ログ" checked={data.tempHumidLog} onChange={(v: boolean) => setData((p) => ({ ...p, tempHumidLog: v }))} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="搬送距離(km)" type="number" right value={data.transportDistanceKm} onChange={(v: any) => setData((p) => ({ ...p, transportDistanceKm: num(v) }))} />
                      <Field label="往復回数" type="number" right value={data.transportTrips} onChange={(v: any) => setData((p) => ({ ...p, transportTrips: Math.max(1, num(v)) }))} />
                    </div>
                    <Field
                      label="輸送形態"
                      type="select"
                      value={data.shippingType}
                      onChange={(v: any) => setData((p) => ({ ...p, shippingType: v }))}
                      opts={[
                        { v: '一般宅配', l: '一般宅配' },
                        { v: '専用便', l: '専用便' },
                        { v: 'セキュリティ専用便', l: 'セキュリティ専用便' },
                        { v: '特殊セキュリティカー', l: '特殊セキュリティカー' },
                      ]}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="検査深度"
                        type="select"
                        value={data.inspectionLevel}
                        onChange={(v: any) => setData((p) => ({ ...p, inspectionLevel: v }))}
                        opts={INSPECTION_LEVELS.map((v) => ({ v, l: v }))}
                      />
                      <Field
                        label="命名ルール"
                        type="select"
                        value={data.namingRule}
                        onChange={(v: any) => setData((p) => ({ ...p, namingRule: v }))}
                        opts={[
                          { v: '連番のみ', l: '連番のみ' },
                          { v: 'フォルダ名のみ', l: 'フォルダ名のみ' },
                          { v: 'ファイル名（背文字）', l: 'ファイル名（背文字）' },
                          { v: 'ファイル名（完全手入力）', l: 'ファイル名（完全手入力）' },
                          { v: '特殊命名規則', l: '特殊命名規則' },
                        ]}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border">
                      <Checkbox label="白黒2値化" checked={data.binaryConversion} onChange={(v: boolean) => setData((p) => ({ ...p, binaryConversion: v }))} />
                      <Checkbox label="傾き補正" checked={data.deskew} onChange={(v: boolean) => setData((p) => ({ ...p, deskew: v }))} />
                      <Checkbox label="OCR" checked={data.ocr} onChange={(v: boolean) => setData((p) => ({ ...p, ocr: v }))} />
                      <Checkbox label="OCR校正" checked={data.ocrProofread} onChange={(v: boolean) => setData((p) => ({ ...p, ocrProofread: v }))} />
                      <Checkbox label="ΔE保証" checked={data.deltaE} onChange={(v: boolean) => setData((p) => ({ ...p, deltaE: v }))} />
                      <Checkbox label="消去証明" checked={data.dataDeletionProof} onChange={(v: boolean) => setData((p) => ({ ...p, dataDeletionProof: v }))} />
                    </div>

                    {data.binaryConversion && <Field label="2値化閾値" value={data.binaryThreshold} onChange={(v: string) => setData((p) => ({ ...p, binaryThreshold: v }))} />}

                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="繁忙期調整(K_load %)"
                        type="number"
                        right
                        value={data.kLoadPct}
                        onChange={(v: any) => setData((p) => ({ ...p, kLoadPct: Math.max(0, Math.min(10, num(v))) }))}
                      />
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 font-sans">係数上限</label>
                        <div className="bg-white border rounded p-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">通常上限</span>
                            <span className="text-xs font-mono">×2.2</span>
                          </div>
                          <Checkbox
                            label="例外（×2.5）承認済"
                            checked={data.capExceptionApproved}
                            onChange={(v: boolean) => setData((p) => ({ ...p, capExceptionApproved: v, factorCap: v ? 2.5 : 2.2 }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-[11px] font-bold text-slate-600 font-sans">納品媒体</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border">
                        {(['HDD/SSD', 'DVD-R', 'BD-R', 'クラウド'] as const).map((m) => (
                          <Checkbox
                            key={m}
                            label={m}
                            checked={data.deliveryMedia.includes(m)}
                            onChange={(v: boolean) =>
                              setData((p) => ({
                                ...p,
                                deliveryMedia: v ? Array.from(new Set([...p.deliveryMedia, m])) : p.deliveryMedia.filter((x) => x !== m),
                              }))
                            }
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="媒体セット数" type="number" right value={data.mediaCount} onChange={(v: any) => setData((p) => ({ ...p, mediaCount: Math.max(1, num(v)) }))} />
                        <Field label="保管（月）" type="number" right value={data.longTermStorageMonths} onChange={(v: any) => setData((p) => ({ ...p, longTermStorageMonths: Math.max(0, num(v)) }))} />
                      </div>
                      <Checkbox label="ラベル印字" checked={data.labelPrint} onChange={(v: boolean) => setData((p) => ({ ...p, labelPrint: v }))} />
                    </div>
                  </div>
                </Card>

                <Card title="L3 業務内訳（workItems：見積の心臓部）">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-slate-500">“一式”禁止のため、業務を必ず行単位に分解する。</div>
                      <button type="button" onClick={addWorkItem} className="text-xs font-bold text-indigo-700 underline">
                        + 作業項目を追加
                      </button>
                    </div>

                    {workItems.map((w) => (
                      <div key={w.id} className="border rounded p-3 bg-white">
                        <div className="flex justify-between items-start gap-4">
                          <div className="grid grid-cols-2 gap-3 flex-1">
                            <Field
                              label="サービス"
                              type="select"
                              value={w.service}
                              onChange={(v: any) => updateWorkItem(w.id, { service: v })}
                              opts={(Object.keys(SERVICE_BASE) as ServiceCode[]).map((k) => ({ v: k, l: `${k}: ${SERVICE_BASE[k].name}` }))}
                            />
                            <Field label="名称（明細名）" value={w.title} onChange={(v: string) => updateWorkItem(w.id, { title: v })} />
                            <Field label="数量" type="number" right value={w.qty} onChange={(v: any) => updateWorkItem(w.id, { qty: num(v) })} />
                            <Field label="単位" value={w.unit} onChange={(v: string) => updateWorkItem(w.id, { unit: v })} />
                            <Field
                              label="サイズ区分"
                              type="select"
                              value={w.sizeClass}
                              onChange={(v: any) => updateWorkItem(w.id, { sizeClass: v })}
                              opts={(Object.keys(SIZE_ADDERS) as any).map((k: any) => ({ v: k, l: `${k}（加算${yen(SIZE_ADDERS[k])}）` }))}
                            />
                            <Field label="解像度" type="select" value={w.resolution} onChange={(v: any) => updateWorkItem(w.id, { resolution: v })} opts={RESOLUTIONS.map((x) => ({ v: x, l: x }))} />
                            <Field label="色空間" type="select" value={w.colorSpace} onChange={(v: any) => updateWorkItem(w.id, { colorSpace: v })} opts={COLOR_OPTS.map((x) => ({ v: x, l: x }))} />
                            <Field
                              label="ファイル形式（CSV入力：TIFF,JPG等）"
                              value={w.fileFormats.join(',')}
                              onChange={(v: string) => updateWorkItem(w.id, { fileFormats: v.split(',').map((s) => s.trim()).filter(Boolean) })}
                            />
                            <Field label="備考（仕様条件）" value={w.notes} onChange={(v: string) => updateWorkItem(w.id, { notes: v })} />
                          </div>
                          <button type="button" onClick={() => removeWorkItem(w.id)} className="text-xs text-red-600 font-bold mt-6">
                            ×
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3 bg-slate-50 p-3 rounded border">
                          <Checkbox label="脆弱資料" checked={w.fragile} onChange={(v: boolean) => updateWorkItem(w.id, { fragile: v })} />
                          <Checkbox label="解体可" checked={w.dismantleAllowed} onChange={(v: boolean) => updateWorkItem(w.id, { dismantleAllowed: v })} />
                          <Checkbox label="復元必須" checked={w.restorationRequired} onChange={(v: boolean) => updateWorkItem(w.id, { restorationRequired: v })} />
                          <Checkbox label="非接触要求" checked={w.requiresNonContact} onChange={(v: boolean) => updateWorkItem(w.id, { requiresNonContact: v })} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="積算プレビュー（内部確認）">
                  <div className="text-sm space-y-3">
                    <div className="border rounded p-3 bg-slate-50">
                      <div className="flex justify-between">
                        <span className="font-bold">総数量（概算）</span>
                        <span className="font-mono">{pricing.totalVol.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="font-bold">小計</span>
                        <span className="font-mono">{yen(pricing.subtotal)}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="font-bold">消費税(10%)</span>
                        <span className="font-mono">{yen(pricing.tax)}</span>
                      </div>
                      <div className="flex justify-between mt-1 text-lg">
                        <span className="font-bold">合計（税込）</span>
                        <span className="font-mono font-bold">{yen(pricing.total)}</span>
                      </div>
                    </div>

                    <div className="border rounded p-3 bg-white">
                      <p className="text-xs text-slate-500 font-bold mb-2">係数の考え方（代表値：workItems[0]）</p>
                      {factorSnapshot ? (
                        <div className="text-xs leading-relaxed">
                          C={factorSnapshot.c.toFixed(2)} / Q={factorSnapshot.q.toFixed(2)} / P={factorSnapshot.p.toFixed(2)} / Interaction={factorSnapshot.i.toFixed(2)} / K_load=
                          {factorSnapshot.k.toFixed(2)}
                          <br />
                          raw={factorSnapshot.raw.toFixed(2)} → cap={factorSnapshot.capped.toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-xs">workItemsがありません。</div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {view === 'preview' && (
            <div className="space-y-8">
              <div className={A4_DOC_LAYOUT}>
                <HeaderBlock title="作業指示書（プロジェクト実施指図）" data={data} />
                <SmallMetaTable data={data} />

                <div className="mt-4">
                  <div className="font-bold">1. 作業対象と範囲</div>
                  <p className="mt-2">
                    本件は「{data.subject}」のデジタル化業務であり、作業内訳は下表のとおりである。なお、“一式”としての計上は行わず、各作業を行単位で管理する。
                  </p>

                  <table className={TABLE_STYLE}>
                    <thead>
                      <tr>
                        <th className={TH_STYLE}>No</th>
                        <th className={TH_STYLE}>作業項目</th>
                        <th className={TH_STYLE}>数量</th>
                        <th className={TH_STYLE}>仕様（解像度/色/形式）</th>
                        <th className={TH_STYLE}>原本条件</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workItems.map((w, idx) => (
                        <tr key={w.id}>
                          <td className={TD_STYLE} style={{ textAlign: 'center' }}>
                            {idx + 1}
                          </td>
                          <td className={TD_STYLE}>
                            <div className="font-bold">{w.title}</div>
                            <div className="text-[9pt] text-slate-700">{SERVICE_BASE[w.service].name}</div>
                          </td>
                          <td className={TD_STYLE} style={{ textAlign: 'right' }}>
                            {num(w.qty).toLocaleString()} {w.unit}
                          </td>
                          <td className={TD_STYLE}>
                            {w.sizeClass} / {w.resolution} / {w.colorSpace}
                            <div className="text-[9pt] text-slate-700 mt-1">{w.fileFormats.join('・')}</div>
                          </td>
                          <td className={TD_STYLE}>
                            {w.fragile ? '脆弱資料 ' : ''}
                            {!w.dismantleAllowed ? '解体不可 ' : '解体可 '}
                            {w.restorationRequired ? '復元必須 ' : ''}
                            {w.requiresNonContact ? '非接触要求' : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4">
                  <div className="font-bold">2. 受領・搬送・保管</div>
                  <p className="mt-2">
                    搬送は「{data.shippingType}」により実施し、施錠・追跡・引渡し記録を確保する。厳格照合は「{data.strictCheckIn ? '実施' : '未実施'}」とし、顧客リスト提供は「{data.checkInListProvided ? '有' : '無'}」である。
                  </p>
                  <p className="mt-2">
                    原本は施錠設備下で保管し、作業時以外は保管庫に格納する。燻蒸は「{data.fumigation ? '実施' : '不要'}」とする。
                  </p>
                </div>

                <div className="mt-4">
                  <div className="font-bold">3. 画像処理・メタデータ</div>
                  <p className="mt-2">
                    傾き補正：{data.deskew ? '実施' : '不要'}。トリミング：{data.trimming}。2値化：{data.binaryConversion ? `実施（閾値：${data.binaryThreshold}）` : '不要'}。OCR：{data.ocr ? `実施（校正：${data.ocrProofread ? '有' : '無'}）` : '不要'}。
                  </p>
                  <p className="mt-2">
                    命名規則：{data.namingRule}。フォルダ構造：{data.folderStructure}。索引：{data.indexType}（改行 {data.lineFeed}）。
                  </p>
                </div>

                <div className="mt-4">
                  <div className="font-bold">4. 検査・品質</div>
                  <p className="mt-2">
                    検査深度：{data.inspectionLevel}。検査項目は欠落・重複・順序・判読性・ピント・傾き・異物混入・ファイル破損・命名規則違反・索引整合を含む。
                  </p>
                </div>

                <div className="mt-6 flex justify-between text-[10pt]">
                  <div>作成：{data.salesManager}　確認：{data.qualityManager}</div>
                  <div>承認：＿＿＿＿＿＿＿＿</div>
                </div>
              </div>
            </div>
          )}

          {view === 'quotation' && (
            <div className="space-y-8">
              <div className={A4_DOC_LAYOUT}>
                <HeaderBlock title="御見積書" data={data} />
                <SmallMetaTable data={data} />

                <div className="mt-2 text-[10pt]">
                  <div>下記のとおり御見積申し上げます。</div>
                  <div className="mt-1">
                    小計：{yen(pricing.subtotal)}　消費税：{yen(pricing.tax)}　合計（税込）：<span className="font-bold">{yen(pricing.total)}</span>
                  </div>
                </div>

                <table className={TABLE_STYLE}>
                  <thead>
                    <tr>
                      <th className={TH_STYLE} style={{ width: '8%' }}>
                        区分
                      </th>
                      <th className={TH_STYLE} style={{ width: '34%' }}>
                        品名
                      </th>
                      <th className={TH_STYLE} style={{ width: '28%' }}>
                        摘要（仕様）
                      </th>
                      <th className={TH_STYLE} style={{ width: '10%' }}>
                        数量
                      </th>
                      <th className={TH_STYLE} style={{ width: '8%' }}>
                        単位
                      </th>
                      <th className={TH_STYLE} style={{ width: '12%' }}>
                        金額
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricing.lineItems.map((li) => (
                      <tr key={li.id}>
                        <td className={TD_STYLE} style={{ textAlign: 'center' }}>
                          {li.phase}
                        </td>
                        <td className={TD_STYLE}>
                          <div className="font-bold">{li.name}</div>
                        </td>
                        <td className={TD_STYLE} style={{ whiteSpace: 'pre-wrap' }}>
                          {li.spec}
                        </td>
                        <td className={TD_STYLE} style={{ textAlign: 'right' }}>
                          {num(li.qty).toLocaleString()}
                        </td>
                        <td className={TD_STYLE} style={{ textAlign: 'center' }}>
                          {li.unit}
                        </td>
                        <td className={TD_STYLE} style={{ textAlign: 'right' }}>
                          {yen(li.amount)}
                          <div className="text-[8pt] text-slate-700 mt-1">単価 {yen(li.unitPrice)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-4">
                  <div className="font-bold">積算の前提（係数の可視化）</div>
                  <p className="mt-2 text-[10pt]">
                    代表係数（workItems[0]）：
                    {factorSnapshot ? (
                      <>
                        C={factorSnapshot.c.toFixed(2)} / Q={factorSnapshot.q.toFixed(2)} / P={factorSnapshot.p.toFixed(2)} / Interaction={factorSnapshot.i.toFixed(2)} / K_load=
                        {factorSnapshot.k.toFixed(2)}。raw={factorSnapshot.raw.toFixed(2)} → cap={factorSnapshot.capped.toFixed(2)}。
                      </>
                    ) : (
                      '—'
                    )}
                    係数上限は原則×2.2。例外（×2.5）の適用は承認（決裁）を要する。
                  </p>
                  <p className="mt-2 text-[10pt]">
                    “一式”は行為・責任・検査範囲を曖昧化するため採用しない。本見積は、工程（L1〜L5）単位で内訳化し、品質保証の根拠を残す。
                  </p>
                </div>

                <div className="mt-6 text-[10pt]">
                  <div className="font-bold">備考</div>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>原本劣化等により仕様達成に限界がある場合は、影響評価を行い、協議の上で対応を確定する。</li>
                    <li>外部委託は原則行わない。やむを得ず行う場合は事前承認を要する。</li>
                    <li>本見積の有効期限：発行日より30日。</li>
                  </ul>
                </div>
              </div>

              <div className={A4_DOC_LAYOUT}>
                <HeaderBlock title="見積内訳（説明用：係数・根拠）" data={data} />
                <div className="text-[10pt]">
                  <p>
                    本ページは、見積書に記載しきれない積算根拠（係数の内訳）を説明するための内部/説明用資料である。対外提出が必要な場合は、範囲を調整して提出する。
                  </p>
                </div>

                {(['L1', 'L2', 'L3', 'L4', 'L5'] as const).map((ph) => (
                  <div key={ph} className="mt-4">
                    <div className="font-bold">工程 {ph}</div>
                    <table className={TABLE_STYLE}>
                      <thead>
                        <tr>
                          <th className={TH_STYLE} style={{ width: '28%' }}>
                            品名
                          </th>
                          <th className={TH_STYLE} style={{ width: '22%' }}>
                            単価・数量
                          </th>
                          <th className={TH_STYLE}>積算根拠（説明）</th>
                        </tr>
                      </thead>
                      <tbody>
                        {phaseGroups[ph].length === 0 ? (
                          <tr>
                            <td className={TD_STYLE} colSpan={3}>
                              該当なし
                            </td>
                          </tr>
                        ) : (
                          phaseGroups[ph].map((li) => (
                            <tr key={li.id}>
                              <td className={TD_STYLE}>
                                <div className="font-bold">{li.name}</div>
                              </td>
                              <td className={TD_STYLE}>
                                <div>
                                  単価：{yen(li.unitPrice)} / {li.unit}
                                </div>
                                <div>
                                  数量：{num(li.qty).toLocaleString()} {li.unit}
                                </div>
                                <div className="font-bold mt-1">金額：{yen(li.amount)}</div>
                              </td>
                              <td className={TD_STYLE} style={{ whiteSpace: 'pre-wrap' }}>
                                {li.explain}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'spec' && (
            <div className="space-y-8">
              <div className={A4_DOC_LAYOUT}>
                <HeaderBlock title="業務仕様書（SOW / Technical Specification）" data={data} />
                <SmallMetaTable data={data} />
                <div className="mt-4 text-[10pt]">
                  <p>
                    本仕様書は、見積の根拠となる技術条件と品質保証条件を定義する。仕様変更は、工程影響（C/Q/P/Interaction/K_load）及び費用影響を明示した上で、書面により合意する。
                  </p>
                </div>

                <div className="mt-4">
                  <div className="font-bold">0. 仕様サマリー</div>
                  <table className={TABLE_STYLE}>
                    <tbody>
                      <tr>
                        <th className={TH_STYLE}>検査深度</th>
                        <td className={TD_STYLE}>{data.inspectionLevel}</td>
                        <th className={TH_STYLE}>温湿度ログ</th>
                        <td className={TD_STYLE}>{data.tempHumidLog ? '提出' : '不要'}</td>
                      </tr>
                      <tr>
                        <th className={TH_STYLE}>燻蒸</th>
                        <td className={TD_STYLE}>{data.fumigation ? '実施' : '不要'}</td>
                        <th className={TH_STYLE}>命名規則</th>
                        <td className={TD_STYLE}>{data.namingRule}</td>
                      </tr>
                      <tr>
                        <th className={TH_STYLE}>索引</th>
                        <td className={TD_STYLE}>
                          {data.indexType}（改行 {data.lineFeed}）
                        </td>
                        <th className={TH_STYLE}>納品媒体</th>
                        <td className={TD_STYLE}>
                          {data.deliveryMedia.join('、')}（{data.mediaCount}）
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-6">
                  <div className="font-bold">1. 作業項目一覧</div>
                  <table className={TABLE_STYLE}>
                    <thead>
                      <tr>
                        <th className={TH_STYLE}>No</th>
                        <th className={TH_STYLE}>作業項目</th>
                        <th className={TH_STYLE}>数量</th>
                        <th className={TH_STYLE}>仕様</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workItems.map((w, idx) => (
                        <tr key={w.id}>
                          <td className={TD_STYLE} style={{ textAlign: 'center' }}>
                            {idx + 1}
                          </td>
                          <td className={TD_STYLE}>
                            <div className="font-bold">{w.title}</div>
                            <div className="text-[9pt] text-slate-700">{SERVICE_BASE[w.service].name}</div>
                            <div className="text-[9pt] mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                              {w.notes}
                            </div>
                          </td>
                          <td className={TD_STYLE} style={{ textAlign: 'right' }}>
                            {num(w.qty).toLocaleString()} {w.unit}
                          </td>
                          <td className={TD_STYLE}>
                            {w.sizeClass} / {w.resolution} / {w.colorSpace}
                            <div className="text-[9pt] text-slate-700 mt-1">{w.fileFormats.join('・')}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6">
                  <div className="font-bold">2. 共通要件（情報セキュリティ・管理）</div>
                  <p className="mt-2 text-[10pt]">
                    受託者は、{COMPANY_INFO.cert}に適合する管理体制の下で本業務を遂行する。原本及びデータは、権限管理、入退室管理、監視、施錠保管、媒体管理等により漏えい・滅失・毀損を防止する。
                    外部委託は原則禁止とし、実施する場合は発注者の事前承認を要する。
                  </p>
                </div>

                <div className="mt-6">
                  <div className="font-bold">3. 受領・搬送・前処理</div>
                  <p className="mt-2 text-[10pt]">
                    搬送は「{data.shippingType}」により実施する。厳格照合は「{data.strictCheckIn ? '実施' : '未実施'}」とし、顧客リスト提供（{data.checkInListProvided ? '有' : '無'}）に応じて突合範囲を確定する。
                    合紙（{data.interleaving ? '実施' : '不要'}）、解体（{data.unbinding}）、復元（{data.rebind ? '実施' : '不要'}）を適用する。
                  </p>
                  <p className="mt-2 text-[10pt]">前処理メモ：{data.preprocessMemo}</p>
                </div>

                <div className="mt-6">
                  <div className="font-bold">4. 撮影・スキャン及び画像処理</div>
                  <p className="mt-2 text-[10pt]">
                    傾き補正：{data.deskew ? '実施' : '不要'}。トリミング：{data.trimming}。2値化：{data.binaryConversion ? `実施（閾値：${data.binaryThreshold}）` : '不要'}。反射抑制：{data.reflectionSuppression ? '実施' : '不要'}。
                  </p>
                  <p className="mt-2 text-[10pt]">
                    OCR：{data.ocr ? '実施' : '不要'}。校正：{data.ocrProofread ? '実施' : 'なし'}。命名：{data.namingRule}。フォルダ構造：{data.folderStructure}。索引：{data.indexType}。
                  </p>
                </div>

                <div className="mt-6">
                  <div className="font-bold">5. 検査・品質保証</div>
                  <p className="mt-2 text-[10pt]">
                    検査深度は「{data.inspectionLevel}」とする。検査項目は欠落・重複・順序・判読性・ピント・傾き・異物混入・ファイル破損・命名規則違反・索引整合等を含む。不良が発見された場合、再撮影又は再スキャンにより補完し、再検査を行う。
                  </p>
                </div>

                <div className="mt-6">
                  <div className="font-bold">6. 環境管理</div>
                  <p className="mt-2 text-[10pt]">
                    温湿度ログ：{data.tempHumidLog ? '提出' : '不要'}。燻蒸：{data.fumigation ? '実施' : '不要'}。中性紙袋等：{data.neutralPaperBag}。
                  </p>
                </div>

                <div className="mt-6">
                  <div className="font-bold">7. 納品・保管・消去</div>
                  <p className="mt-2 text-[10pt]">
                    納品媒体：{data.deliveryMedia.join('、')}（{data.mediaCount}）。ラベル印字：{data.labelPrint ? '実施' : '不要'}。保管：{data.longTermStorageMonths}か月。消去証明：{data.dataDeletionProof ? '提出' : '不要'}。
                  </p>
                  <p className="mt-2 text-[10pt]">備考：{data.deliveryMemo || '—'}</p>
                </div>
              </div>

              <div className={A4_DOC_LAYOUT}>
                <HeaderBlock title="仕様書（条項形式：運用・品質・責任境界）" data={data} />
                <div className="text-[10pt] space-y-3">
                  {specSections.map((sec, i) => (
                    <div key={i} className="mt-4">
                      <div className="font-bold">{sec.title}</div>
                      {sec.p.map((t, j) => (
                        <p key={j} className="mt-2">
                          {t}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'qa' && (
            <div className="space-y-8">
              <div className={A4_DOC_LAYOUT}>
                <HeaderBlock title="検査表（マイクロフィルム/デジタル共通 QA Sheet）" data={data} />
                <SmallMetaTable data={data} />

                <div className="mt-4">
                  <div className="font-bold">1. 検査条件</div>
                  <table className={TABLE_STYLE}>
                    <tbody>
                      <tr>
                        <th className={TH_STYLE}>検査深度</th>
                        <td className={TD_STYLE}>{data.inspectionLevel}</td>
                        <th className={TH_STYLE}>検査責任者</th>
                        <td className={TD_STYLE}>{data.qualityManager}</td>
                      </tr>
                      <tr>
                        <th className={TH_STYLE}>環境ログ</th>
                        <td className={TD_STYLE}>{data.tempHumidLog ? '提出（60分間隔）' : '不要'}</td>
                        <th className={TH_STYLE}>燻蒸</th>
                        <td className={TD_STYLE}>{data.fumigation ? '実施' : '不要'}</td>
                      </tr>
                      <tr>
                        <th className={TH_STYLE}>命名規則</th>
                        <td className={TD_STYLE}>{data.namingRule}</td>
                        <th className={TH_STYLE}>索引</th>
                        <td className={TD_STYLE}>{data.indexType}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4">
                  <div className="font-bold">2. 検査チェックリスト（全項目）</div>
                  <table className={TABLE_STYLE}>
                    <thead>
                      <tr>
                        <th className={TH_STYLE} style={{ width: '52%' }}>
                          検査項目
                        </th>
                        <th className={TH_STYLE} style={{ width: '12%' }}>
                          結果
                        </th>
                        <th className={TH_STYLE}>所見・是正（再撮影/再処理 等）</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        '欠落（落丁）',
                        '重複（二重取り込み）',
                        'ページ順序（乱丁）',
                        '判読性（文字潰れ/薄い）',
                        'ピント/解像度（ボケ）',
                        '傾き（補正漏れ）',
                        'トリミング（欠け/余白過多）',
                        '汚れ/異物混入（ゴミ・影）',
                        '色再現（色転び/階調）',
                        'ファイル破損（開けない/欠損）',
                        '命名規則違反（連番/規則逸脱）',
                        '索引整合（ID/リンク不整合）',
                        '媒体書込検証（読み出し確認）',
                        'セキュリティ（持出/権限）',
                      ].map((name) => (
                        <tr key={name}>
                          <td className={TD_STYLE}>{name}</td>
                          <td className={TD_STYLE} style={{ textAlign: 'center' }}>
                            □OK　□NG
                          </td>
                          <td className={TD_STYLE}> </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6">
                  <div className="font-bold">3. 作業項目別 検査記録</div>
                  {workItems.map((w) => (
                    <div key={w.id} className="mt-4">
                      <div className="font-bold">
                        {w.title}（{num(w.qty).toLocaleString()}
                        {w.unit}）
                      </div>
                      <table className={TABLE_STYLE}>
                        <tbody>
                          <tr>
                            <th className={TH_STYLE} style={{ width: '18%' }}>
                              仕様
                            </th>
                            <td className={TD_STYLE}>
                              {w.sizeClass} / {w.resolution} / {w.colorSpace} / {w.fileFormats.join('・')}
                            </td>
                          </tr>
                          <tr>
                            <th className={TH_STYLE}>検査結果</th>
                            <td className={TD_STYLE}>□OK　□NG　（NGの場合、是正内容と再検日を記載）</td>
                          </tr>
                          <tr>
                            <th className={TH_STYLE}>所見</th>
                            <td className={TD_STYLE} style={{ height: '40mm' }} />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-between text-[10pt]">
                  <div>検査者：＿＿＿＿＿＿＿＿</div>
                  <div>検査責任者：{data.qualityManager}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
