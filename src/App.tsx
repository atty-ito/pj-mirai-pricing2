'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';

// --- 0. アイコンコンポーネント (SVG直書き・ライブラリ非依存) ---
const Icons = {
  FileText: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Database: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Camera: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Layers: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Printer: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  Check: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  Shield: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Coins: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="8"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>,
  FileSearch: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="15" r="3"/><line x1="13" y1="18" x2="15" y2="20"/></svg>,
  BadgeCheck: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76z"/><path d="m9 12 2 2 4-4"/></svg>,
  ClipboardList: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h6"/><path d="M9 8h6"/></svg>,
  Monitor: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  Landmark: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>,
  CheckSquare: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  ScanLine: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  FileBarChart: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="8" y1="18" x2="8" y2="15"/><line x1="16" y1="18" x2="16" y2="13"/></svg>,
  Building2: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
};

// --- アイコンラッパー (QAビュー等で使用) ---
const IconBadgeCheck = ({ size = 18, ...p }) => <Icons.BadgeCheck width={size} height={size} {...p} />;
const IconScanLine = ({ size = 18, ...p }) => <Icons.ScanLine width={size} height={size} {...p} />;
const IconFileBarChart = ({ size = 18, ...p }) => <Icons.FileBarChart width={size} height={size} {...p} />;

// --- 1. 定数・スタイル ---
const COMPANY_NAME = "株式会社国際マイクロ写真工業社";
const COMPANY_INFO = {
  address: "東京都新宿区箪笥町43",
  tel: "03-3260-5931",
  fax: "03-3260-5935",
  cert: "JIS Q 27001 (ISMS) / プライバシーマーク取得済"
};

// A4 帳票用共通スタイル (210mm幅固定・relative・ストイックデザイン)
const A4_DOC_LAYOUT = "w-[210mm] min-h-[297mm] mx-auto bg-white p-[20mm] text-black border border-slate-300 print:m-0 print:border-none print:w-full print:p-[20mm] box-border shadow-lg print:shadow-none mb-8 font-serif text-[10.5pt] leading-relaxed relative";

const TABLE_STYLE = "w-full border-collapse border border-black text-[10pt] my-4";
const TH_STYLE = "border border-black bg-gray-100 p-2 font-bold text-center align-middle w-[25%]";
const TD_STYLE = "border border-black p-2 align-top";

const PRICE_TABLE = {
  A: { name: 'アーカイブ撮影 (デジカメ)', min: 300, mid: 325, max: 350 },
  B: { name: 'ADFスキャン (自動給紙)', min: 17, mid: 25.5, max: 34 },
  C: { name: '手置きスキャン (フラットベッド)', min: 60, mid: 72.5, max: 85 },
  D: { name: '大判スキャン (A0/A1)', min: 180, mid: 205, max: 230 },
  E: { name: 'MF電子化 (マイクロフィルム)', min: 88, mid: 144, max: 200 },
  F: { name: '写真・乾板 (透過原稿)', min: 500, mid: 750, max: 1000 }
};

// 選択肢定義
const INSPECTION_LEVELS = [
  '簡易目視検査 (抜き取り)',
  '標準全数検査 (作業者のみ)',
  '二重全数検査 (有資格者による再検)'
];
const COLOR_OPTS = [
  'モノクローム (TIFF/MMR)',
  'sRGB',
  'AdobeRGB'
];
const RESOLUTIONS = [
  '200dpi',
  '300dpi',
  '300dpi以上',
  '400dpi',
  '600dpi',
  '400dpi相当 (解像力120本/mm)'
];
const MEDIA_OPTS = [
  '紙（製本）',
  '紙（製本・和綴じ）',
  '紙（バラ）',
  'MF',
  '永年保存文書 (A3以下/A3超)',
  '大判図面'
];

// 媒体整合性用セット
const MICRO_MEDIA_SET = new Set([
  'MF',
  '永年保存文書 (A3以下/A3超)'
]);

// --- ヘルパー: 日付フォーマット (JST固定) ---
const formatDateJST = (date = new Date()) => {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date).replace(/\//g, '-');
};

// --- ヘルパー: DPI抽出 ---
const getDpi = (resStr) => {
  const s = String(resStr ?? '');
  const m = s.match(/(\d+)\s*dpi/i);
  if (m) return Number(m[1]);
  const m2 = s.match(/(\d+)/);
  return m2 ? Number(m2[1]) : 300;
};

// --- ヘルパーコンポーネント ---
const NavBtn = ({ icon: Icon, label, active, onClick }) => (
  <button 
    type="button" 
    onClick={onClick} 
    className={`p-3 rounded-lg w-full flex flex-col items-center gap-1 transition-all ${active ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
  >
    <Icon />
    <span className="text-[10px]">{label}</span>
  </button>
);

const Card = ({ title, children }) => (
  <div className="bg-white p-6 rounded-lg border border-slate-300 shadow-sm h-full font-sans">
    <h4 className="text-sm font-bold border-b pb-2 mb-4 text-slate-700 flex items-center gap-2">
      {title}
    </h4>
    {children}
  </div>
);

const Field = ({ label, type="text", name, val, set, opts, disabled=false, placeholder = "" }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-bold text-slate-600 font-sans">{label}</label>
    {type==='select' ? (
      <select name={name} value={val[name]} onChange={set} className="w-full p-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:border-indigo-500 font-medium" disabled={disabled}>
        {opts.map(o => {
          const value = typeof o === 'string' ? o : o.v;
          const labelText = typeof o === 'string' ? o : o.l;
          return <option key={value} value={value}>{labelText}</option>;
        })}
      </select>
    ) : (
      <input type={type} name={name} value={val[name]} onChange={set} className="w-full p-2 border border-slate-300 rounded text-sm disabled:bg-slate-100 focus:outline-none focus:border-indigo-500 font-medium" disabled={disabled} placeholder={placeholder}/>
    )}
  </div>
);

const Checkbox = ({ name, label, checked, onChange, disabled = false}) => (
  <label className={`flex items-center gap-2 cursor-pointer group font-sans ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
    />
    <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">{label}</span>
  </label>
);

// --- メインコンポーネント ---
export default function App() {
  const [view, setView] = useState('input');
  const [tier, setTier] = useState('premium');
  const mainRef = useRef(null); 

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const el = mainRef.current;
    if (el) {
      el.scrollTop = 0;
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        el.scrollTop = 0;
      });
    }
  }, [view]);
  
  // --- 2. マスターデータ (SSOT) ---
  const [data, setData] = useState({
    jobNo: '25-001024',
    createdDate: formatDateJST(),
    subject: '令和5年度 所蔵資料デジタル化業務委託',
    customerName: '○○組合長',
    customerType: '官公庁・自治体',
    jurisdiction: '総務課 契約担当',
    qualityManager: '高橋 幸一', 
    salesManager: '一木', 
    supervisorCert: '文書情報管理士1級',
    
    deadline: '2026-03-31',
    isExpress: false,
    deadlineType: '絶対納期',
    
    category: 'E',
    media: '永年保存文書 (A3以下/A3超)', 
    fragility: 'Brittle', 
    redLot: true,
    aceticSmell: false,
    dismantleAllowed: true,
    restorationRequired: true,
    fumigation: true,
    neutralPaperBag: 'AFプロテクトH相当',
    stickerSize: '13mm四方 (D円直径10mm)',
    
    scannerType: 'AR1000 アーカイブライター',
    resolution: '400dpi相当 (解像力120本/mm)', 
    colorSpace: 'モノクローム (TIFF/MMR)',
    inspectionLevel: '二重全数検査 (有資格者による再検)',
    deltaE: false,
    reflectionSuppression: false,
    
    fileFormat: 'マルチTIFF (MMR)',
    namingRule: '全半角英数混在',
    folderStructure: 'Root / 書誌ID / 分冊',
    indexType: '索引データ (Excel)',
    lineFeed: 'LF',
    tempHumidLog: true,
    bookmarkRequired: false,
    ocrProofread: false,
    dataDeletionProof: true,
    
    volume: 65100,
    volumeUnit: 'ページ',
    mediaCost: 20000,
    shippingType: 'セキュリティ専用便',
    
    specStandard: true,
    privacyFlag: true,
    contractExists: true,
    meetingMemoExists: true,
    achievement: true
  });

  useEffect(() => {
    const isMicro = data.category === 'E';
    const isMicroMedia = MICRO_MEDIA_SET.has(data.media);

    if (isMicro && !isMicroMedia) {
       setData(prev => {
         const target = '永年保存文書 (A3以下/A3超)';
         if (prev.media === target) return prev;
         return { ...prev, media: target };
       });
    }
    if (!isMicro && isMicroMedia) {
       setData(prev => {
         const target = '紙（製本・和綴じ）';
         if (prev.media === target) return prev;
         return { ...prev, media: target };
       });
    }
  }, [data.category, data.media]);

  // --- 3. 統合計算エンジン ---
  const calc = useMemo(() => {
    const baseObj = PRICE_TABLE[data.category] || PRICE_TABLE.E;
    let basePrice = tier === 'premium' ? baseObj.max 
                    : tier === 'standard' ? baseObj.mid 
                    : baseObj.min;

    let c = 1.0; 
    if (data.fragility === 'Brittle') c += 0.2;
    if (data.restorationRequired) c += 0.15;
    if (!data.dismantleAllowed) c += 0.15;

    let q = 1.0;
    const dpi = getDpi(data.resolution);
    if (dpi >= 400) q += 0.5;
    if (data.inspectionLevel.includes('二重')) q += 0.5;
    if (data.colorSpace === 'AdobeRGB') q += 0.15;
    if (data.deltaE) q += 0.1;

    let p = 1.0;
    if (data.tempHumidLog) p += 0.1;
    if (data.ocrProofread) p += 0.25;

    const totalFactor = Math.min(c * q * p, 3.5);
    const unitPrice = Math.ceil(basePrice * totalFactor);
    
    const volNum = Number(String(data.volume).replace(/,/g, '')) || 0;
    const subtotal = unitPrice * volNum;
    
    // 0円許容ロジック
    const mediaCostVal = Number(String(data.mediaCost).replace(/,/g, ''));
    const mediaCostSafe = Number.isFinite(mediaCostVal) ? mediaCostVal : 20000;

    const fixedCosts = {
      base: tier === 'premium' ? 50000 : 30000,
      shipping: tier === 'premium' ? 60000 : 15000,
      media: mediaCostSafe,
      options: (data.tempHumidLog ? 10000 : 0) + (data.fumigation ? 20000 : 0)
    };
    const totalFixed = Object.values(fixedCosts).reduce((a, b) => a + b, 0);
    
    const totalBeforeTax = subtotal + totalFixed;
    const tax = Math.floor(totalBeforeTax * 0.1);
    const grandTotal = totalBeforeTax + tax;
    
    return { 
      factor: totalFactor, 
      unit: unitPrice, 
      sub: subtotal, 
      fixedCosts, 
      total: totalBeforeTax,
      tax,
      grandTotal
    };
  }, [data, tier]);

  // --- 4. プラン同期 ---
  const applyTierSettings = (t) => {
    setTier(t);
    setData(prev => {
      const isMicro = prev.category === 'E';
      
      const presets = isMicro ? {
        premium: {
          resolution: '400dpi相当 (解像力120本/mm)', 
          colorSpace: COLOR_OPTS[0], 
          inspectionLevel: INSPECTION_LEVELS[2], 
          tempHumidLog: true, deltaE: false, dismantleAllowed: true, restorationRequired: true,
          fileFormat: 'マルチTIFF (MMR)', indexType: '索引データ (Excel)',
          shippingType: 'セキュリティ専用便'
        },
        standard: {
          resolution: '300dpi', 
          colorSpace: COLOR_OPTS[0], 
          inspectionLevel: INSPECTION_LEVELS[1], 
          tempHumidLog: false, deltaE: false, dismantleAllowed: true, restorationRequired: true,
          fileFormat: 'マルチTIFF', indexType: '索引データ',
          shippingType: '専用便'
        },
        economy: {
          resolution: '200dpi', 
          colorSpace: COLOR_OPTS[0], 
          inspectionLevel: INSPECTION_LEVELS[0], 
          tempHumidLog: false, deltaE: false, dismantleAllowed: true, restorationRequired: false,
          fileFormat: 'PDF', indexType: 'なし',
          shippingType: '一般宅配'
        }
      } : {
        premium: {
          resolution: '400dpi', 
          colorSpace: COLOR_OPTS[2], // AdobeRGB
          inspectionLevel: INSPECTION_LEVELS[2], 
          tempHumidLog: true, deltaE: true, dismantleAllowed: false, restorationRequired: true,
          fileFormat: 'JPEG2000', indexType: 'TSV (Unicode/UTF-8 BOMなし)',
          shippingType: 'セキュリティ専用便'
        },
        standard: {
          resolution: '400dpi', 
          colorSpace: COLOR_OPTS[1], // sRGB
          inspectionLevel: INSPECTION_LEVELS[1],
          tempHumidLog: false, deltaE: false, dismantleAllowed: false, restorationRequired: false,
          fileFormat: 'PDF/A', indexType: 'Excel',
          shippingType: '専用便'
        },
        economy: {
          resolution: '300dpi', 
          colorSpace: COLOR_OPTS[1], // sRGB
          inspectionLevel: INSPECTION_LEVELS[0],
          tempHumidLog: false, deltaE: false, dismantleAllowed: false, restorationRequired: false,
          fileFormat: 'PDF', indexType: 'なし',
          shippingType: '一般宅配'
        }
      };

      return { ...prev, ...presets[t] };
    });
  };

  const handleChange = (k, v) => setData(prev => ({ ...prev, [k]: v }));

  const currentCat = PRICE_TABLE[data.category] || PRICE_TABLE.E;

  // --- 5. 文言増幅エンジン (specText) ---
  const specText = useMemo(() => {
    const isMicro = data.category === 'E';
    const isJP2 = String(data.fileFormat ?? '').includes('JPEG2000');
    const requiresDeltaE = data.colorSpace === 'AdobeRGB' && data.deltaE;

    return {
      purpose: isMicro 
        ? <>本仕様書は、発注者が所蔵する<strong>「{data.subject}」</strong>のデジタル化及びマイクロフィルム作成業務（以下「本業務」という。）の委託について、必要な事項を定めることを目的とする。受託者は、原資料の物理的保全を至上命題とし、一字一句の情報落なき完遂を義務付ける。</>
        : <>本仕様書は、発注者が所蔵する<strong>「{data.subject}」</strong>のデジタル化及びアーカイブ構築業務の委託について、必要な事項を定めることを目的とする。受託者は、公的ガイドラインに準拠した最高水準の品質で業務を遂行するものとする。</>,
      
      tech_res: isMicro 
        ? <>画像データの仕様は、データ形式を原則TIFFデータとし、圧縮形式はMMR(G4)とする。解像度は<strong>{data.resolution}</strong>とし、簿冊ごとにマルチページ化を行う。ファイルサイズは1ファイル500MBまでとする。</>
        : <>原資料に対し物理的光学解像度 <strong>{data.resolution}</strong> 以上を確保し、サンプリング誤差は±1%以内とする。デジタル補間（拡大処理）による解像度の擬似向上は一切認めず、光学的な精細度を保証すること。</>,
      
      tech_film: isMicro
        ? <>マイクロフィルムの解像値は<strong>120本/mm</strong>とする。フィルム濃度はバックグラウンド0.8~1.2、未露光部0.12以下でなければならない。撮影縮率誤差は±3%以内とする。撮影は、別紙「マイクロフィルムの構成」に基づき、開始ターゲット、解像力・濃度試験版、件名ターゲット、本文、証明書、終了ターゲットの順序で行うものとする。</>
        : <>該当なし</>,

      tech_color: data.colorSpace === 'AdobeRGB' 
        ? (requiresDeltaE 
            ? <>色空間は<strong>AdobeRGB(JIS Z 8781-6)</strong>を準拠とし、平均色差(ΔE)が<strong>6.5以下</strong>であることを各バッチの撮影においてカラーチャート実測に基づき保証し、証跡を残すこと。</>
            : <>色空間は<strong>AdobeRGB</strong>を準拠とし、原本の色彩・階調性を忠実に再現すること（本プランでは色差ΔEの実測保証は行わない）。</>
          )
        : data.colorSpace.includes('モノクロ')
          ? <>画像データはモノクローム（2値またはグレースケール）とし、文字の可読性を最優先に階調を調整すること。圧縮形式はMMR(G4)を採用する。</>
          : <>色空間はsRGBとし、原本の色彩・階調性を忠実に再現すること。</>,
      
      tech_format: isJP2
        ? <>保存用データは<strong>JPEG 2000形式(ISO/IEC 15444-1)</strong>とし、可逆圧縮方式(ウェーブレット変換5x3フィルタ、RLCPプログレッション順序)にて作成する。COMセグメントには著作権情報を適切に埋め込むこと。</>
        : <><strong>{data.fileFormat}</strong>形式にて作成し、長期保存に耐えうるIT的整合性を確保すること。</>,

      preservation: data.fragility.includes('Brittle')
        ? <>対象文書の取扱いには慎重を期し、破損・汚損等を生じさせないこと。破損している場合には、裏打ち等により補修を行うこと。しわ等は自動温度調整付きアイロンを使用してプレスし、文字が判読できる状態にすること。</>
        : <>原資料の負荷を最小限に抑える撮影方式を採用すること。</>,
      
      environment: data.tempHumidLog 
        ? <>原本保管庫および作業場所は温度22℃(±2℃)、湿度55%(±5%)、湿度60%超過禁止を24時間維持すること。<strong>60分間隔の自動測定ログ</strong>及び経時変化グラフを納品時に証跡として提出すること。</>
        : <>原本保存に適した清浄な温湿度環境を維持すること。</>,

      inspection: data.inspectionLevel.includes('二重')
        ? <>委託業務完了後、成果品納品前に「外見検査（波打ち、損傷、変色等）」および「撮影検査（順序、ターゲット、焦点、異物）」を行い、その結果について報告書を提出すること。不良コマは補完撮影を行うこと。</>
        : <>全数検査を実施し、仕様を満たしていることを確認すること。</>
    };
  }, [data]);

  return (
    <div className="flex h-screen min-h-0 bg-slate-100 text-slate-900 font-sans overflow-hidden">
      <aside className="w-16 bg-slate-800 text-white flex flex-col items-center py-8 gap-8 shrink-0 print:hidden z-50 shadow-2xl">
        <div className="bg-indigo-600 p-2 rounded mb-4"><Icons.Database /></div>
        <NavBtn icon={Icons.FileText} label="入力" active={view==='input'} onClick={()=>setView('input')} />
        <NavBtn icon={Icons.Monitor} label="指示" active={view==='preview'} onClick={()=>setView('preview')} />
        <NavBtn icon={Icons.Coins} label="見積" active={view==='quotation'} onClick={()=>setView('quotation')} />
        <NavBtn icon={Icons.FileSearch} label="仕様" active={view==='spec'} onClick={()=>setView('spec')} />
        <NavBtn icon={Icons.BadgeCheck} label="検査" active={view==='qa'} onClick={()=>setView('qa')} />
      </aside>

      <div className="fixed top-2 right-2 z-[9999] bg-black text-white text-xs px-2 py-1 rounded print:hidden opacity-50 pointer-events-none">
        view: {view}
      </div>

      <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto bg-slate-50">
        <div className="p-8 print:p-0 print:bg-white">
          <div className="flex justify-between items-center mb-6 print:hidden max-w-[1000px] mx-auto">
             <h1 className="text-xl font-bold">Archive OS v22.0 <span className="text-sm font-normal text-slate-500">for {COMPANY_NAME}</span></h1>
             <button type="button" onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"><Icons.Printer /> 印刷</button>
          </div>

          {/* VIEW: INPUT */}
          {view === 'input' && (
            <div className="max-w-[1000px] mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-300 flex justify-between items-center">
                 <div className="flex gap-8">
                    <div><p className="text-xs text-slate-500 font-bold">プラン選択</p><p className="text-xl font-bold text-indigo-700 uppercase">{tier}</p></div>
                    <div><p className="text-xs text-slate-500 font-bold">係数 (C×Q×P)</p><p className="text-xl font-bold text-slate-800">{calc.factor.toFixed(2)}</p></div>
                 </div>
                 <div className="flex gap-2">
                    {['premium', 'standard', 'economy'].map(t => (
                      <button type="button" key={t} onClick={() => applyTierSettings(t)} className={`px-4 py-2 rounded text-xs font-bold uppercase border-2 transition ${tier === t ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                         Apply {t}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Card title="1. 基本情報・管理">
                  <div className="grid gap-4 text-sm">
                      <div><label className="block text-xs text-slate-500 font-bold">Job No</label><input value={data.jobNo} disabled className="w-full border p-2 rounded bg-slate-50 font-mono font-bold" /></div>
                      <div><label className="block text-xs text-slate-500 font-bold">顧客名</label><input value={data.customerName} onChange={(e)=>handleChange('customerName', e.target.value)} className="w-full border p-2 rounded" /></div>
                      <div><label className="block text-xs text-slate-500 font-bold">件名</label><input value={data.subject} onChange={(e)=>handleChange('subject', e.target.value)} className="w-full border p-2 rounded" /></div>
                      <div><label className="block text-xs text-slate-500 font-bold">品質責任者</label><input value={data.qualityManager} onChange={(e)=>handleChange('qualityManager', e.target.value)} className="w-full border p-2 rounded" /></div>
                      {/* 数量・金額入力（復元） */}
                      <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-2">
                        <div><label className="block text-xs text-slate-500 font-bold">数量 (Vol)</label><input type="number" value={data.volume} onChange={(e)=>handleChange('volume', e.target.value)} className="w-full border p-2 rounded text-right font-mono" /></div>
                        <div><label className="block text-xs text-slate-500 font-bold">単位</label><input value={data.volumeUnit} onChange={(e)=>handleChange('volumeUnit', e.target.value)} className="w-full border p-2 rounded" /></div>
                      </div>
                      <div><label className="block text-xs text-slate-500 font-bold">媒体実費 (Media Cost)</label><input type="number" value={data.mediaCost} onChange={(e)=>handleChange('mediaCost', e.target.value)} className="w-full border p-2 rounded text-right font-mono" /></div>
                  </div>
                </Card>
                <Card title="2. 技術・原本仕様">
                   <div className="grid gap-4 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                         <Field label="技術カテゴリ" type="select" name="category" val={data} set={(e)=>handleChange('category', e.target.value)} opts={Object.entries(PRICE_TABLE).map(([k,v])=>({v:k, l:v.name}))} />
                         <Field label="媒体" type="select" name="media" val={data} set={(e)=>handleChange('media', e.target.value)} opts={MEDIA_OPTS.map(v=>({v,l:v}))} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <Field label="解像度" type="select" name="resolution" val={data} set={(e)=>handleChange('resolution', e.target.value)} opts={RESOLUTIONS.map(v=>({v,l:v}))} />
                         <Field label="画像形式" type="select" name="colorSpace" val={data} set={(e)=>handleChange('colorSpace', e.target.value)} opts={COLOR_OPTS.map(v=>({v,l:v}))} />
                      </div>
                      <Field label="検査基準" type="select" name="inspectionLevel" val={data} set={(e)=>handleChange('inspectionLevel', e.target.value)} opts={INSPECTION_LEVELS.map(v=>({v,l:v}))} />
                      <div className="bg-slate-50 p-2 border rounded grid grid-cols-2 gap-2 text-xs">
                         <Checkbox name="fragility" label="脆弱資料" checked={data.fragility==='Brittle'} onChange={(e)=>handleChange('fragility', e.target.checked ? 'Brittle' : 'Good')} />
                         <Checkbox name="tempHumidLog" label="環境ログ" checked={data.tempHumidLog} onChange={(e)=>handleChange('tempHumidLog', e.target.checked)} />
                         <Checkbox name="dismantleAllowed" label="解体許可" checked={data.dismantleAllowed} onChange={(e)=>handleChange('dismantleAllowed', e.target.checked)} />
                         <Checkbox name="specStandard" label="公的規格準拠" checked={data.specStandard} onChange={(e)=>handleChange('specStandard', e.target.checked)} />
                         <Checkbox name="deltaE" label="ΔE保証" checked={data.deltaE} onChange={(e)=>handleChange('deltaE', e.target.checked)} disabled={data.colorSpace!=='AdobeRGB'} />
                      </div>
                   </div>
                </Card>
              </div>
            </div>
          )}

          {/* VIEW: PREVIEW (作業指示書) */}
          {view === 'preview' && (
            <div className={`${A4_DOC_LAYOUT} relative`}>
               <div className="flex justify-between items-start border-b border-black pb-4 mb-8">
                  <div>
                     <h2 className="text-2xl font-bold">Job Order</h2>
                     <p className="text-[10px] font-bold bg-black text-white inline-block px-3 py-1 mt-2">作業指示書: 内部生産・品質管理統括</p>
                  </div>
                  <div className="text-right text-xs">
                     <p className="text-lg border-b border-black py-1 font-mono">№ {data.jobNo}</p>
                     <p className="mt-2">Issued: {data.createdDate}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-10 mb-10 border-l-4 border-black pl-6">
                  <div className="space-y-4">
                     <p className="border-b pb-1"><span className="text-xs text-gray-500 block">Customer</span><span className="text-xl">{data.customerName || '________'} 様</span></p>
                     <p className="border-b pb-1"><span className="text-xs text-gray-500 block">System Policy</span><span className="text-lg font-bold uppercase">{tier} SYSTEM</span></p>
                  </div>
                  <div className="bg-gray-50 p-4 border border-black text-right">
                     <span className="text-xs text-gray-500 block mb-1">Deadline Goal</span>
                     <span className="text-2xl font-mono font-bold">{data.deadline || 'ASAP'}</span>
                     <div className="mt-4 flex justify-between items-center text-xs pt-2 border-t border-gray-300">
                        <span>Priority: {data.isExpress ? 'CRITICAL' : 'STANDARD'}</span>
                        <span>Type: {data.deadlineType}</span>
                     </div>
                  </div>
               </div>

               <div className="space-y-8">
                  <table className={TABLE_STYLE}>
                     <tbody>
                        <tr>
                           <th className={TH_STYLE}>1. 原本受入・保全</th>
                           <td className={TD_STYLE}>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                 <span>●媒体：{data.media}</span>
                                 <span>●脆弱性：{data.fragility}</span>
                                 <span>●解体判断：{data.dismantleAllowed ? '許可' : '不可（厳禁）'}</span>
                                 <span>●復元要求：{data.restorationRequired ? '必須' : 'なし'}</span>
                              </div>
                              <div className="mt-4 pt-2 border-t border-dotted border-black text-xs text-gray-700">
                                 <strong>【現場指示事項】</strong><br/>
                                 {data.redLot && "・レッドロット劣化有。粉塵対策および慎重なハンドリングを徹底せよ。"} <br/>
                                 {data.tempHumidLog && "・作業室の温湿度ログ（60分毎）を記録し、撮影日誌に添付すること。"}
                              </div>
                           </td>
                        </tr>
                        <tr>
                           <th className={TH_STYLE}>2. デジタル化撮影基準</th>
                           <td className={TD_STYLE}>
                              <div className="grid grid-cols-2 gap-y-2">
                                 <span>●機材：{data.scannerType}</span>
                                 <span>●解像度：<strong>{data.resolution}</strong></span>
                                 <span>●出力：{data.fileFormat}</span>
                                 <span>●色：{data.colorSpace}</span>
                              </div>
                              <div className="mt-4 pt-2 border-t border-dotted border-black text-xs text-gray-700">
                                 <strong>【品質条件】</strong><br/>
                                 {data.deltaE && "・平均色差ΔE < 6.5 実測証跡。"} <br/>
                                 {data.reflectionSuppression && "・反射抑制（偏光フィルター）を適用すること。"}
                              </div>
                           </td>
                        </tr>
                        <tr>
                           <th className={TH_STYLE}>3. 検査・納品指令</th>
                           <td className={TD_STYLE}>
                              <p className="text-sm font-bold border-b inline-block mb-2">●{data.inspectionLevel}</p>
                              {data.inspectionLevel.includes('二重') && <p className="text-xs text-red-600 border border-red-500 p-1 mt-1">※有資格者による独立した『全数再検査』を強制執行し、エラー率0.50%以下を証跡すること。</p>}
                              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                 <span>●命名：{data.namingRule}</span>
                                 <span>●納品媒体：{data.shippingType}</span>
                              </div>
                           </td>
                        </tr>
                     </tbody>
                  </table>

                  <div className="border border-black h-40 p-4 relative bg-gray-50">
                     <span className="absolute top-[-10px] left-4 bg-white px-2 text-xs font-bold">Field Management Notes</span>
                  </div>
               </div>

               <div className="absolute bottom-[20mm] right-[20mm] flex gap-8 text-xs">
                  {['Manager', 'Operator', 'Inspector'].map(t => (
                     <div key={t} className="flex flex-col items-center border border-gray-300 w-20 h-20 justify-end pb-2">
                        <span className="text-[9px] text-gray-400 mb-auto mt-1">{t}</span>
                        <span className="opacity-20 font-bold">印</span>
                     </div>
                  ))}
               </div>
            </div>
          )}

          {/* VIEW: QUOTATION (見積書) */}
          {view === 'quotation' && (
            <div className="space-y-10">
               {/* 1枚目: 御見積書 */}
               <div className={A4_DOC_LAYOUT}>
                  <div className="text-center mb-12 border-b-2 border-black pb-4 w-2/3 mx-auto">
                     <h1 className="text-3xl font-bold tracking-[0.5em]">御 見 積 書</h1>
                  </div>
                  <div className="flex justify-between items-start mb-16">
                     <div className="w-[60%]">
                        <h3 className="text-2xl border-b-2 border-black inline-block pr-10 mb-8 pb-1">{data.customerName || '________________'} 御中</h3>
                        <div className="text-sm leading-relaxed mb-6">
                           <p className="mb-2">件名：{data.subject}</p>
                           <p>拝啓 貴社益々ご清栄のこととお慶び申し上げます。<br/>下記の通り、謹んで御見積申し上げます。</p>
                        </div>
                        <div className="border-2 border-black p-4 text-center w-3/4">
                           <p className="text-xs mb-1">御見積金額 (税込)</p>
                           <p className="text-3xl font-bold">¥{calc.grandTotal.toLocaleString()}-</p>
                        </div>
                     </div>
                     <div className="text-right text-xs space-y-1">
                        <p className="text-base font-bold mb-4">No. {data.jobNo}</p>
                        <p>発行日：{data.createdDate}</p>
                        <div className="mt-4 pt-4 border-t border-gray-400">
                           <p className="text-sm font-bold">{COMPANY_NAME}</p>
                           <p>{COMPANY_INFO.address}</p>
                           <p>TEL: {COMPANY_INFO.tel}</p>
                           <p>担当：{data.salesManager}</p>
                        </div>
                        <div className="mt-8 flex justify-end"><div className="border border-red-500 text-red-500 w-16 h-16 flex items-center justify-center text-xs opacity-50 rounded-full transform -rotate-12">社印省略</div></div>
                     </div>
                  </div>
                  <table className={TABLE_STYLE}>
                     <thead><tr className="bg-gray-100 border-b border-black"><th className="p-2 border border-black w-[50%] text-left">摘要</th><th className="p-2 border border-black w-[10%]">数量</th><th className="p-2 border border-black w-[10%]">単位</th><th className="p-2 border border-black w-[15%]">単価</th><th className="p-2 border border-black w-[15%]">金額</th></tr></thead>
                     <tbody>
                        <tr><td className="p-2 border border-black">デジタル化業務委託 一式<br/><span className="text-[9pt] text-gray-500">※{data.resolution} / {data.colorSpace}</span></td><td className="p-2 border border-black text-center">{data.volume.toLocaleString()}</td><td className="p-2 border border-black text-center">{data.volumeUnit}</td><td className="p-2 border border-black text-right">¥{calc.unit.toLocaleString()}</td><td className="p-2 border border-black text-right">¥{calc.sub.toLocaleString()}</td></tr>
                        {Object.entries(calc.fixedCosts).map(([k,v]) => v > 0 && (
                           <tr key={k}><td className="p-2 border border-black text-[9pt]"> {k==='base'?'プロジェクト管理費':k==='shipping'?'セキュリティ輸送費':k==='options'?'付帯オプション費':'実費'} </td><td className="p-2 border border-black text-center">1</td><td className="p-2 border border-black text-center">式</td><td className="p-2 border border-black text-right">¥{v.toLocaleString()}</td><td className="p-2 border border-black text-right">¥{v.toLocaleString()}</td></tr>
                        ))}
                     </tbody>
                     <tfoot>
                        <tr><td colSpan={3} className="p-2 border border-black text-right">小計</td><td className="p-2 border border-black text-right">¥{calc.total.toLocaleString()}</td></tr>
                        <tr><td colSpan={3} className="p-2 border border-black text-right">消費税 (10%)</td><td className="p-2 border border-black text-right">¥{calc.tax.toLocaleString()}</td></tr>
                        <tr className="bg-gray-100 font-bold"><td colSpan={3} className="p-2 border border-black text-right">合計</td><td className="p-2 border border-black text-right">¥{calc.grandTotal.toLocaleString()}</td></tr>
                     </tfoot>
                  </table>
                  <div className="mt-8 text-xs">
                     <p className="font-bold border-b border-black inline-block mb-1">備考</p>
                     <ul className="list-disc pl-5 space-y-1">
                        <li>有効期限：発行日より30日間</li>
                        <li>支払条件：検収月翌月末銀行振込</li>
                        <li>納品場所：{data.shippingType}</li>
                     </ul>
                  </div>
               </div>
               
               {/* 2枚目: 内部資料 */}
               <div className={A4_DOC_LAYOUT}>
                  <div className="border-b-2 border-black pb-2 mb-10">
                     <h2 className="text-xl font-bold">【内部承認用】積算根拠・プラン差異説明書</h2>
                     <p className="text-xs text-gray-500 mt-1">Confidential / Internal Use Only</p>
                  </div>
                  <table className="w-full border-collapse border border-black text-[10pt] text-center">
                     <thead><tr className="bg-gray-100">
                        <th className="p-2 border border-black w-1/4">比較項目</th>
                        <th className="p-2 border border-black w-1/3 bg-gray-200 font-bold">PREMIUM (推奨)</th>
                        <th className="p-2 border border-black w-1/3">STANDARD (標準)</th>
                     </tr></thead>
                     <tbody>
                        <tr><td className="p-4 border border-black bg-gray-50 font-bold text-left">品質・色再現</td><td className="p-4 border border-black font-bold">400dpi / Adobe / ΔE&lt;6.5保証</td><td className="p-4 border border-black">400dpi / sRGB / 補正込</td></tr>
                        <tr><td className="p-4 border border-black bg-gray-50 font-bold text-left">検査プロセス</td><td className="p-4 border border-black font-bold">二重全数検査 (管理職再検)</td><td className="p-4 border border-black">作業者による全数検査</td></tr>
                     </tbody>
                  </table>
                  <div className="mt-10 p-6 border border-black bg-gray-50">
                     <p className="font-bold mb-4 border-b border-black inline-block">積算評価コメント</p>
                     <p className="text-sm leading-relaxed">原本脆弱性「{data.fragility}」および劣化リスク（赤変等）を鑑み、破損時の社会的損失リスクを極小化するため、非接触撮影・手めくり厳守、および公的機関の技術監査に耐えうる証跡完備(温湿度60分毎ログ、有資格者の二重検査)を加味し、係数を算定しました。</p>
                  </div>
               </div>
            </div>
          )}

          {/* VIEW: SPEC (仕様書) */}
          {view === 'spec' && (
            <div className={A4_DOC_LAYOUT}>
               <div className="text-center mt-10 mb-12">
                  <h1 className="text-3xl font-bold tracking-widest mb-4">業務実施仕様書</h1>
                  <p className="text-lg border-b border-black inline-block pb-1">件名：{data.subject}</p>
               </div>
               <div className="text-right text-xs mb-10">
                  <p>令和3年版 公的デジタルアーカイブ作成ガイドライン準拠</p>
                  <p>{COMPANY_NAME}</p>
               </div>
               <div className="text-[10.5pt] leading-loose text-justify px-4">
                  <div className="mb-8">
                     <h3 className="font-bold border-l-4 border-black pl-2 mb-4">第1条 総則</h3>
                     <p className="pl-4 mb-4">1.1 {specText.purpose}</p>
                     <p className="pl-4">1.2 受託者は、本業務の遂行において原資料の保全を最優先事項とし、紛失・破損等の事故防止に万全を期すこと。</p>
                  </div>
                  <div className="mb-8">
                     <h3 className="font-bold border-l-4 border-black pl-2 mb-4">第2条 環境維持及び原本保全基準</h3>
                     <div className="pl-4">
                        <p className="mb-2">●原本保全：{specText.preservation}</p>
                        <p>●温湿度管理：{specText.environment}</p>
                     </div>
                  </div>
                  <div className="mb-8">
                     <h3 className="font-bold border-l-4 border-black pl-2 mb-4">第3条 技術的品質基準</h3>
                     <div className="pl-4">
                        <p className="mb-2">3.1 {specText.tech_res}</p>
                        <p className="mb-2">3.2 {specText.tech_film}</p>
                        <p className="mb-2">3.3 {specText.tech_color}</p>
                        <p className="mb-2">3.4 {specText.tech_format}</p>
                        <p className="mb-2">3.5 メタデータは <strong>Unicode (UTF-8 BOMなし)</strong> とし、改行コードは <strong>{data.lineFeed}</strong> とする。</p>
                     </div>
                  </div>
                  <div className="mb-8">
                     <h3 className="font-bold border-l-4 border-black pl-2 mb-4">第4条 検査</h3>
                     <p className="pl-4">{specText.inspection}</p>
                  </div>
               </div>
            </div>
          )}

          {/* VIEW: QA (検査証明書) */}
          {view === 'qa' && (
             <div className={A4_DOC_LAYOUT}>
                <div className="text-center mb-10 border-b-2 border-black pb-4">
                   <h1 className="text-2xl font-bold tracking-widest">成果物検査証明書</h1>
                   <p className="text-xs uppercase tracking-widest mt-1 text-gray-500">Quality Assurance Audit Report</p>
                </div>
                <div className="flex justify-between text-sm mb-8 border-b border-gray-300 pb-4">
                   <div>
                      <p><strong>顧客名：</strong> {data.customerName || '________'} 御中</p>
                      <p><strong>案件名：</strong> {data.subject}</p>
                   </div>
                   <div className="text-right">
                      <p>検査日：____年__月__日</p>
                      <p>検査員：________________</p>
                      <p className="font-bold text-lg mt-2">判定：合格 / PASSED</p>
                   </div>
                </div>
                <p className="text-sm font-bold bg-gray-100 p-2 mb-2">1. 物理・外観検査</p>
                <table className={TABLE_STYLE}>
                   <thead><tr><th className={TH_STYLE}>検査項目</th><th className="border border-black p-2 font-bold w-1/2">判定基準</th><th className="border border-black p-2 w-1/6 text-center">判定</th></tr></thead>
                   <tbody>
                      <tr><td className={TD_STYLE}>原本損傷</td><td className={TD_STYLE}>新たな汚損、亀裂、破損箇所が一切ないこと</td><td className="border border-black p-2 text-center text-xs">良 ・ 否</td></tr>
                      <tr><td className={TD_STYLE}>ページ順序</td><td className={TD_STYLE}>落丁、乱丁、スキャン漏れ、重複がないこと</td><td className="border border-black p-2 text-center text-xs">良 ・ 否</td></tr>
                      <tr><td className={TD_STYLE}>異物混入</td><td className={TD_STYLE}>指、ゴミ、機材の写り込みがないこと</td><td className="border border-black p-2 text-center text-xs">良 ・ 否</td></tr>
                   </tbody>
                </table>
                <p className="text-sm font-bold bg-gray-100 p-2 mb-2 mt-6">2. 技術・品質検査 ({data.resolution} / {data.colorSpace})</p>
                <table className={TABLE_STYLE}>
                   <thead><tr><th className={TH_STYLE}>検査項目</th><th className="border border-black p-2 font-bold w-1/2">数値基準・閾値</th><th className="border border-black p-2 w-1/6 text-center">判定</th></tr></thead>
                   <tbody>
                      <tr><td className={TD_STYLE}>解像度・ピクセル</td><td className={TD_STYLE}>規定解像度に対し±1%以内の誤差であること</td><td className="border border-black p-2 text-center text-xs">良 ・ 否</td></tr>
                      {data.category !== 'E' && <tr><td className={TD_STYLE}>色再現性 (ΔE)</td><td className={TD_STYLE}>チャート色差平均が <strong>6.5以下</strong> であること</td><td className="border border-black p-2 text-center text-xs">良 ・ 否</td></tr>}
                      <tr><td className={TD_STYLE}>画像の傾き</td><td className={TD_STYLE}><strong>1.15度</strong>（勾配2%）未満であること</td><td className="border border-black p-2 text-center text-xs">良 ・ 否</td></tr>
                   </tbody>
                </table>
                <div className="border border-black h-24 p-2 mt-6 relative"><span className="absolute top-[-10px] left-2 bg-white px-1 text-xs font-bold">不適合事項・備考</span></div>
                <div className="mt-8 text-sm text-right pr-8">
                   <p>上記検査の結果、仕様書準拠の品質基準（エラー率0.50%以下）を満たしていることを証明します。</p>
                   <p className="mt-8 border-b border-black inline-block pb-1 min-w-[200px] text-center">品質管理責任者：{data.qualityManager}　㊞</p>
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};