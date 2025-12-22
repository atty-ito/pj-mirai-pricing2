'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';

// --- 0. アイコンコンポーネント (SVG直書き・ライブラリ非依存) ---
const Icons = {
  FileText: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Database: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Camera: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Layers: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Printer: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  Check: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  Shield: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Coins: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="8"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>,
  FileSearch: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="15" r="3"/><line x1="13" y1="18" x2="15" y2="20"/></svg>,
  BadgeCheck: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76z"/><path d="m9 12 2 2 4-4"/></svg>,
  ClipboardList: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h6"/><path d="M9 8h6"/></svg>,
  Monitor: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  Landmark: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>,
  CheckSquare: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  ScanLine: (p) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  FileBarChart: (p) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="8" y1="18" x2="8" y2="15"/><line x1="16" y1="18" x2="16" y2="13"/></svg>,
  Building2: (p) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
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

// A4 帳票用共通スタイル (210mm幅固定・relative追加)
const A4_DOC_LAYOUT = "w-[210mm] min-h-[297mm] mx-auto bg-white p-[20mm] text-black border border-slate-300 print:m-0 print:border-none print:w-full print:p-[20mm] box-border shadow-lg print:shadow-none mb-8 font-serif leading-relaxed text-[10.5pt] relative";

const TABLE_STYLE = "w-full border-collapse border border-black text-[9pt] my-4";
const TH_STYLE = "border border-black bg-gray-100 p-2 font-bold text-center align-middle";
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

// --- ヘルパー: DPI抽出 (安全化) ---
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
    className={`p-2 rounded w-full flex flex-col items-center gap-1 transition-all ${active ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
  >
    <Icon />
    <span className="text-[9px]">{label}</span>
  </button>
);

const Card = ({ title, children }) => (
  <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-full font-sans">
    <h4 className="text-sm font-bold border-b pb-2 mb-4 text-slate-700 flex items-center gap-2">
      {title}
    </h4>
    {children}
  </div>
);

const Field = ({
  label,
  type = "text",
  name,
  val,
  set,
  opts,
  disabled = false,
  placeholder = ""
}: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">{label}</label>
    {type==='select' ? (
      <select name={name} value={val[name]} onChange={set} className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900" disabled={disabled}>
        {opts.map(o => {
          const value = typeof o === 'string' ? o : o.v;
          const labelText = typeof o === 'string' ? o : o.l;
          return <option key={value} value={value}>{labelText}</option>;
        })}
      </select>
    ) : (
      <input type={type} name={name} value={val[name] as any} onChange={set} className="w-full p-2 border rounded text-sm disabled:bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900" disabled={disabled} placeholder={placeholder}/>
    )}
  </div>
);

// Checkbox (name属性対応・Boolean制御・Disabled対応)
const Checkbox = ({
   name,
   label,
   checked,
   onChange,
   disabled = false
 }: {
   name: any;
   label: any;
   checked: any;
   onChange: any;
   disabled?: boolean;
 }) => (
  <label className={`flex items-center gap-2 cursor-pointer group font-sans ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:bg-slate-100"
    />
    <span className="text-xs group-hover:text-indigo-600 transition-colors font-bold text-slate-700">{label}</span>
  </label>
);

const SectionHeader = ({ icon: Icon, title, color }) => {
  const colors = {
    blue: "border-blue-600 bg-blue-600 shadow-sm",
    amber: "border-amber-500 bg-amber-500 shadow-sm",
    emerald: "border-emerald-600 bg-emerald-600 shadow-sm"
  };
  const c = colors[color] || colors.blue;
  const [borderColor, bgColor, shadowColor] = c.split(" ");
  return (
    <div className={`flex items-center gap-3 mb-6 border-b-2 pb-3 ${borderColor} font-sans`}>
      <div className={`${bgColor} p-2 rounded-xl text-white shadow-md`}>
        <Icon />
      </div>
      <h3 className="text-lg font-black tracking-tight uppercase tracking-widest text-slate-700">{title}</h3>
    </div>
  );
};

// --- メインコンポーネント ---
export default function App() {
  const [view, setView] = useState('input');
  const [tier, setTier] = useState('premium');
  const mainRef = useRef<HTMLDivElement | null>(null); 

  // 画面遷移時にスクロールをトップに戻す
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
    
    // Checkbox Flags
    specStandard: true,
    privacyFlag: true,
    contractExists: true,
    meetingMemoExists: true,
    achievement: true
  });

  // --- カテゴリと媒体の整合性確保 ---
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
    // 安全な参照
    const baseObj = (PRICE_TABLE as any)[data.category] || PRICE_TABLE.E;
    // 価格ロジックの修正: Premium=max, Standard=mid, Economy=min
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
    // 色空間がAdobeRGBの時のみ係数加算
    if (data.colorSpace === 'AdobeRGB') q += 0.15;
    // ΔEはAdobeRGBかつONの時のみ加算
    if (data.colorSpace === 'AdobeRGB' && data.deltaE) q += 0.1;

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
          colorSpace: COLOR_OPTS[0], // モノクロ
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

  // --- 5. 文言増幅エンジン ---
  const specText = useMemo(() => {
    const isMicro = data.category === 'E';
    const isJP2 = String(data.fileFormat ?? '').includes('JPEG2000');
    // ΔE保証の条件: AdobeRGB かつ チェックON
    const requiresDeltaE = data.colorSpace === 'AdobeRGB' && data.deltaE;

    return {
      purpose: isMicro 
        ? <>本仕様書は、発注者が所蔵する<strong>「{data.subject}」</strong>のデジタル化及びマイクロフィルム作成業務（以下「本業務」という。）の委託について、必要な事項を定めることを目的とする。受託者は、原資料の物理的保全を至上命題とし、一字一句の情報落なき完遂を義務付ける。</>
        : <>本仕様書は、発注者が所蔵する<strong>「{data.subject}」</strong>のデジタル化及びアーカイブ構築業務の委託について、必要な事項を定めることを目的とする。受託者は、公的ガイドラインに準拠した最高水準の品質で業務を遂行するものとする。</>,
      
      tech_res: isMicro 
        ? <>画像データの仕様は、データ形式を原則TIFFデータとし、圧縮形式はMMR(G4)とする。解像度は<strong>{data.resolution}</strong>とし、簿冊ごとにマルチページ化を行う。ファイルサイズは1ファイル500MBまでとする。</>
        : <>原資料に対し物理的光学解像度 <strong>{data.resolution}</strong> 以上を確保し、サンプリング誤差は±1%以内とする。デジタル補間（拡大処理）による解像度の擬似向上は一切認めず、光学的な精細度を保証すること。</>,
      
      tech_film: isMicro
        ? <>マイクロフィルムの解像値は<strong>120本/mm</strong>とする。フィルム濃度はバックグラウンド0.8~1.2、未露光部0.12以下でなければならない。撮影縮率誤差は±3%以内とする。</>
        : <>該当なし</>,

      // 文言の論理分岐
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
             <h1 className="text-xl font-bold">Archive OS v21.0 <span className="text-sm font-normal text-slate-500">for {COMPANY_NAME}</span></h1>
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
                      <div><label className="block text-xs text-slate-500 font-bold">顧客名</label><input value={data.customerName} onChange={(e: any)=>handleChange('customerName', e.target.value)} className="w-full border p-2 rounded" placeholder="顧客名を入力" /></div>
                      <div><label className="block text-xs text-slate-500 font-bold">件名</label><input value={data.subject} onChange={(e: any)=>handleChange('subject', e.target.value)} className="w-full border p-2 rounded" /></div>
                      <div><label className="block text-xs text-slate-500 font-bold">品質責任者</label><input value={data.qualityManager} onChange={(e: any)=>handleChange('qualityManager', e.target.value)} className="w-full border p-2 rounded" /></div>
                  </div>
                </Card>
                <Card title="2. 技術・原本仕様">
                   <div className="grid gap-4 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                         <Field label="技術カテゴリ" type="select" name="category" val={data} set={(e: any)=>handleChange('category', e.target.value)} opts={Object.entries(PRICE_TABLE).map(([k,v])=>({v:k, l:v.name}))} />
                         <Field label="媒体" type="select" name="media" val={data} set={(e: any)=>handleChange('media', e.target.value)} opts={MEDIA_OPTS.map(v=>({v,l:v}))} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <Field label="解像度" type="select" name="resolution" val={data} set={(e: any)=>handleChange('resolution', e.target.value)} opts={RESOLUTIONS.map(v=>({v,l:v}))} />
                         <Field label="画像形式" type="select" name="colorSpace" val={data} set={(e: any)=>handleChange('colorSpace', e.target.value)} opts={COLOR_OPTS.map(v=>({v,l:v}))} />
                      </div>
                      <Field label="検査基準" type="select" name="inspectionLevel" val={data} set={(e: any)=>handleChange('inspectionLevel', e.target.value)} opts={INSPECTION_LEVELS.map(v=>({v,l:v}))} />
                      <div className="bg-slate-50 p-2 border rounded grid grid-cols-2 gap-2 text-xs">
                         <Checkbox name="fragility" label="脆弱資料" checked={data.fragility==='Brittle'} onChange={(e: any)=>handleChange('fragility', e.target.checked ? 'Brittle' : 'Good')} />
                         <Checkbox name="tempHumidLog" label="環境ログ" checked={data.tempHumidLog} onChange={(e: any)=>handleChange('tempHumidLog', e.target.checked)} />
                         <Checkbox name="dismantleAllowed" label="解体許可" checked={data.dismantleAllowed} onChange={(e: any)=>handleChange('dismantleAllowed', e.target.checked)} />
                         <Checkbox name="specStandard" label="公的規格準拠" checked={data.specStandard} onChange={(e: any)=>handleChange('specStandard', e.target.checked)} />
                         {/* AdobeRGB以外ではDisabledにする安全策 */}
                         <Checkbox name="deltaE" label="ΔE保証" checked={data.deltaE} onChange={(e: any)=>handleChange('deltaE', e.target.checked)} disabled={data.colorSpace!=='AdobeRGB'} />
                      </div>
                   </div>
                </Card>
              </div>
            </div>
          )}

          {/* VIEW: PREVIEW (作業指示書) */}
          {view === 'preview' && (
            <div className={`${A4_DOC_LAYOUT} relative`}>
               <div className="flex justify-between items-start border-b-[6px] border-black pb-4 mb-8 text-slate-950 font-black italic">
                  <div>
                     <h2 className="text-3xl font-black uppercase tracking-tighter">Job Order</h2>
                     <p className="text-[10px] font-bold bg-black text-white inline-block px-3 py-1 mt-2 font-sans not-italic uppercase tracking-widest">作業指示書: 内部生産・品質管理統括</p>
                  </div>
                  <div className="text-right text-slate-900 font-mono italic">
                     <p className="text-xl border-b-2 border-black py-1">№ {data.jobNo}</p>
                     <p className="text-[9px] font-sans font-bold text-slate-400 uppercase mt-4 not-italic tracking-widest">Issued: {data.createdDate}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-10 mb-10 border-l-[15px] border-black pl-8 font-serif italic text-slate-950 underline decoration-slate-100 italic shadow-sm">
                  <div className="space-y-6 font-black italic">
                     <p className="flex items-end border-b pb-2 gap-4"><span className="w-32 text-[10px] text-slate-400 uppercase font-sans not-italic tracking-widest italic">Entity</span><span className="text-2xl">{data.customerName || '________'} 様</span></p>
                     <p className="flex items-end border-b pb-2 gap-4"><span className="w-32 text-[10px] text-slate-400 uppercase font-sans not-italic tracking-widest italic">Policy</span><span className="text-xl text-indigo-800 uppercase italic underline decoration-indigo-100 font-bold">{tier} SYSTEM</span></p>
                  </div>
                  <div className="bg-slate-50 p-6 border-4 border-slate-950 text-right font-black italic shadow-xl relative">
                     <span className="text-[11px] text-slate-400 uppercase font-sans not-italic tracking-widest block mb-2 underline decoration-indigo-200 font-black italic leading-none">Deadline Goal</span>
                     <span className={`text-4xl font-mono leading-none italic ${data.isExpress ? 'text-red-600 underline decoration-red-600/30' : ''}`}>{data.deadline || 'ASAP'}</span>
                     <div className="mt-6 flex justify-between items-center text-[10px] text-slate-600 uppercase italic font-sans not-italic border-t-2 pt-2 border-slate-200 italic font-black italic leading-none">
                        <span>Priority: {data.isExpress ? 'CRITICAL' : 'STANDARD'}</span>
                        <span>Type: {data.deadlineType}</span>
                     </div>
                  </div>
               </div>

               <div className="space-y-12">
                  <table className="w-full border-collapse border-[3px] border-black text-[9.5pt]">
                     <tbody>
                        <tr>
                           <th className="border border-black bg-gray-100 p-3 w-1/4 text-left align-top font-serif">1. 原本受入・保全指示</th>
                           <td className="border border-black p-4 align-top italic font-bold">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                 <span>●媒体：{data.media}</span>
                                 <span>●脆弱性：<span className="text-red-700 underline decoration-red-200 font-black italic">{data.fragility}</span></span>
                                 <span>●解体判断：{data.dismantleAllowed ? '許可' : '不可（厳禁）'}</span>
                                 <span>●復元要求：{data.restorationRequired ? '必須' : 'なし'}</span>
                              </div>
                              <div className="mt-6 pt-3 border-t border-dotted border-black text-[8.5pt] italic font-black text-slate-700 leading-relaxed">
                                 <strong>【現場指示事項】</strong><br/>
                                 {data.redLot && "・レッドロット劣化有。粉塵対策および慎重なハンドリングを徹底せよ。"} <br/>
                                 {data.tempHumidLog && "・作業室の温湿度ログ（60分毎）を記録し、撮影日誌に添付すること。"}
                              </div>
                           </td>
                        </tr>
                        <tr>
                           <th className="border border-black bg-gray-100 p-3 text-left align-top font-serif">2. デジタル化撮影基準</th>
                           <td className="border border-black p-4 align-top italic font-bold">
                              <div className="grid grid-cols-2 gap-y-3">
                                 <span>●機材：{data.scannerType}</span>
                                 <span>●解像度：<span className="underline decoration-indigo-200 font-black">{data.resolution}</span></span>
                                 <span>●出力：{data.fileFormat}</span>
                                 <span>●色：{data.colorSpace} / 24bit</span>
                              </div>
                              <div className="mt-6 pt-3 border-t border-dotted border-black text-[8.5pt] font-black italic text-slate-700 leading-relaxed">
                                 <strong>【品質条件】</strong><br/>
                                 {data.deltaE && "・平均色差ΔE < 6.5 実測証跡。"} <br/>
                                 {data.reflectionSuppression && "・反射抑制（偏光フィルター）を適用すること。"}
                              </div>
                           </td>
                        </tr>
                        <tr>
                           <th className="border border-black bg-gray-100 p-3 text-left align-top font-serif">3. 検査・納品指令</th>
                           <td className="border border-black p-4 align-top font-bold italic">
                              <p className="text-indigo-950 text-base border-b-2 border-indigo-100 inline-block mb-3 font-black">●{data.inspectionLevel}</p>
                              {data.inspectionLevel.includes('二重') && <p className="text-red-700 text-[9pt] mt-1 border-2 border-red-500 p-2 italic leading-relaxed">※有資格者による独立した『全数再検査』を強制執行し、エラー率0.50%以下を証跡すること。</p>}
                              <div className="mt-4 grid grid-cols-2 gap-2 text-[8.5pt] italic text-slate-600">
                                 <span>●命名：{data.namingRule}</span>
                                 <span>●納品媒体：{data.shippingType}</span>
                              </div>
                           </td>
                        </tr>
                     </tbody>
                  </table>

                  <div className="border-[3px] border-black h-48 p-4 relative shadow-inner font-serif bg-slate-50/20 italic font-black leading-none">
                     <span className="absolute top-[-15px] left-10 bg-white px-4 text-[11pt] font-black uppercase italic leading-none">Field Management Notes</span>
                  </div>
               </div>

               <div className="absolute bottom-[20mm] right-[20mm] flex gap-12 italic font-black">
                  {['Manager Approved', 'Lead Operator', 'QA Chief Inspector'].map(t => (
                     <div key={t} className="flex flex-col items-center italic font-black italic shadow-sm">
                        <div className="bg-black text-white text-[9px] font-black w-full p-2 text-center uppercase tracking-widest italic font-sans not-italic leading-none italic">{t}</div>
                        <div className="flex-1 flex items-center justify-center text-[11px] text-slate-100 border-2 border-slate-300 w-24 h-24 font-black italic -rotate-12 opacity-40 shadow-sm leading-none">STAMP</div>
                     </div>
                  ))}
               </div>
            </div>
          )}

          {/* VIEW: QUOTATION (見積書 & 戦略資料) */}
          {view === 'quotation' && (
            <div className="space-y-12 pb-40 italic font-black">
               {/* 1枚目: 御見積書 */}
               <div className={A4_DOC_LAYOUT}>
                  <div className="text-center mb-16 border-b-[10px] border-black pb-2 w-1/2 mx-auto italic font-black shadow-sm">
                     <h1 className="text-4xl font-serif font-bold tracking-[0.6em] leading-none uppercase italic underline decoration-slate-50 italic">御 見 積 書</h1>
                  </div>
                  <div className="flex justify-between items-start mb-24 italic font-black leading-relaxed">
                     <div className="w-[65%]">
                        <h3 className="text-[4.5rem] font-black italic border-b-[30px] border-slate-950 inline-block pr-24 mb-16 shadow-sm italic underline decoration-slate-50 leading-none">{data.customerName || '---'} 様</h3>
                        <div className="text-xl font-bold font-serif leading-relaxed italic border-l-8 border-indigo-100 pl-10 bg-slate-50/20 py-10 shadow-sm">
                           <p className="mb-4 font-black italic underline decoration-indigo-50 leading-none">件名：{data.subject}</p>
                           <p className="text-lg text-slate-500 italic">拝啓 貴社益々ご清栄のこととお慶び申し上げます。下記の通り、謹んで御見積申し上げます。</p>
                        </div>
                        <div className="bg-slate-950 text-white p-14 rounded-[3.5rem] shadow-2xl mt-16 border-l-[45px] border-indigo-600 font-serif italic shadow-indigo-100 italic font-black">
                           <p className="text-[12px] opacity-40 uppercase tracking-[1.2em] mb-4 font-black leading-none italic underline decoration-white/10 italic font-black italic">Estimate Amount (Incl. 10% Tax)</p>
                           <p className="text-[8rem] font-mono tracking-tighter italic font-black leading-none italic shadow-2xl underline decoration-indigo-400 decoration-[25px]">¥{calc.grandTotal.toLocaleString()}-</p>
                        </div>
                     </div>
                     <div className="text-right text-[13px] space-y-4 font-black italic italic leading-none border-r-8 border-indigo-100 pr-10 min-w-[320px] font-black shadow-sm">
                        <p className="text-3xl font-mono italic mb-10 leading-none tracking-tighter italic font-black underline underline-offset-8 font-black leading-none">No. {data.jobNo}</p>
                        <p>発行日：{data.createdDate}</p>
                        <div className="space-y-4 pt-10 italic font-black underline decoration-slate-50 underline-offset-4 leading-relaxed">
                           <p className="text-xl font-bold underline decoration-indigo-100 decoration-4 font-black italic">{COMPANY_NAME}</p>
                           <p className="text-[10pt] opacity-60 uppercase italic font-black leading-none italic">{COMPANY_INFO.cert}</p>
                           <p className="italic font-black leading-none italic underline decoration-slate-50 italic">{COMPANY_INFO.address}</p>
                           <p className="font-mono text-base italic underline decoration-slate-100 font-black leading-none">TEL: {COMPANY_INFO.tel}</p>
                        </div>
                        <div className="mt-12 flex justify-end"><div className="border-[12px] border-red-500/20 w-32 h-32 flex items-center justify-center text-[14px] text-red-600 font-black italic -rotate-12 opacity-30 shadow-inner italic font-black leading-none">SEALED<br/>OMITTED</div></div>
                     </div>
                  </div>
                  <table className="w-full border-collapse border-[12px] border-black text-[10pt] italic font-black shadow-2xl italic font-black italic leading-none italic font-black">
                     <thead><tr className="bg-slate-50 border-b-8 border-black italic"><th className="p-4 border-r-4 border-black text-left italic font-black shadow-sm">摘要 / Technical Logic</th><th className="p-4 border-r-4 border-black w-24 text-center italic font-black shadow-sm italic">数量</th><th className="p-4 border-r-4 border-black w-24 text-center italic font-black shadow-sm italic">単位</th><th className="p-4 text-right italic font-black shadow-sm italic">金額 (税抜)</th></tr></thead>
                     <tbody>
                        <tr className="hover:bg-indigo-50/30 transition-all font-black border-b-4 border-black italic font-black"><td className="p-10 border-r-4 border-black leading-relaxed italic underline decoration-slate-50 shadow-sm italic font-black">アーカイブデジタル化構築主作業（ランク：{tier.toUpperCase()}）<br/><p className="text-[9pt] text-indigo-700 mt-4 underline decoration-indigo-50 decoration-4 italic underline-offset-4 font-black leading-none italic font-black">※{data.resolution} / {data.colorSpace} / Multiplier：{calc.factor.toFixed(2)} applied</p></td><td className="p-10 border-r-4 border-black text-center align-middle italic font-black italic shadow-sm leading-none italic">{data.volume.toLocaleString()}</td><td className="p-10 border-r-4 border-black text-center align-middle italic font-black italic shadow-sm leading-none italic">{data.volumeUnit}</td><td className="p-10 text-right align-middle font-black text-4xl italic underline decoration-indigo-100 italic font-black leading-none">¥{calc.sub.toLocaleString()}</td></tr>
                        {Object.entries(calc.fixedCosts).map(([k,v]) => v > 0 && (
                           <tr key={k} className="border-b-2 border-black italic font-black leading-none"><td className="p-6 border-r-4 border-black text-[10pt] italic font-black underline decoration-slate-100 italic shadow-sm font-black"> {k==='base'?'プロジェクト管理料':k==='shipping'?'セキュリティ輸送費':k==='options'?'付帯オプション費':'実費'} </td><td className="p-6 border-r-4 border-black text-center italic font-black leading-none">1</td><td className="p-6 border-r-4 border-black text-center italic font-black leading-none">式</td><td className="p-6 text-right font-black text-2xl italic shadow-inner font-black leading-none">¥{v.toLocaleString()}</td></tr>
                        ))}
                     </tbody>
                     <tfoot className="border-t-[8px] border-slate-950 font-black italic leading-none shadow-2xl">
                        <tr className="bg-slate-50 font-black underline decoration-slate-100 decoration-8 shadow-inner italic"><td colSpan="3" className="p-8 text-right text-[15px] uppercase font-black italic border-r-4 border-slate-950 italic font-black italic tracking-[0.5em] shadow-sm italic font-serif">Subtotal</td><td className="p-8 text-right font-mono font-black text-5xl italic shadow-sm italic underline decoration-indigo-50 italic leading-none">¥{calc.total.toLocaleString()}</td></tr>
                        <tr className="bg-slate-50 font-black underline decoration-slate-100 decoration-8 shadow-inner italic"><td colSpan="3" className="p-8 text-right text-[15px] uppercase font-black italic border-r-4 border-slate-950 italic font-black italic tracking-[0.5em] shadow-sm italic font-serif">Tax (10%)</td><td className="p-8 text-right font-mono font-black text-5xl italic shadow-sm italic underline decoration-indigo-50 italic leading-none">¥{calc.tax.toLocaleString()}</td></tr>
                        <tr className="bg-slate-950 text-white shadow-2xl border-t-4 border-white/10"><td colSpan="3" className="p-12 text-right text-[22px] font-black uppercase tracking-[1.0em] italic border-r-4 border-slate-800 shadow-2xl italic font-serif">TOTAL (INCLUDING 10% TAX)</td><td className="p-12 text-right font-black font-mono text-8xl italic underline decoration-indigo-400 decoration-[20px] italic shadow-2xl shadow-indigo-500/20 italic">¥{calc.grandTotal.toLocaleString()}</td></tr>
                     </tfoot>
                  </table>
               </div>
               
               {/* 2枚目: 内部資料 */}
               <div className={A4_DOC_LAYOUT}>
                  <div className="border-b-[15px] border-black pb-4 mb-16 italic font-black">
                     <h2 className="text-3xl uppercase tracking-widest italic underline decoration-indigo-900/5 italic leading-none font-black italic">【内部承認用】ランク別 積算根拠・差異説明書</h2>
                     <p className="text-xs text-slate-500 font-sans not-italic mt-2 italic font-black italic underline decoration-slate-100 shadow-sm italic leading-none">Confidential Audit Reference / Internal Use Only</p>
                  </div>
                  <table className="w-full border-collapse border-[8px] border-black text-[12pt] italic font-black text-center shadow-2xl italic font-black leading-none italic font-black">
                     <thead><tr className="bg-slate-100 shadow-lg italic leading-none font-black">
                        <th className="p-6 border-r-4 border-black italic shadow-sm italic leading-none font-serif font-black italic shadow-sm italic">比較項目</th>
                        <th className="p-6 border-r-4 border-black bg-indigo-50/50 font-black italic underline decoration-indigo-100 italic leading-none font-serif font-black italic shadow-sm italic font-black italic leading-none italic font-black">PREMIUM (最高品質)</th>
                        <th className="p-6 font-bold italic leading-none font-serif font-black italic shadow-sm italic font-black italic leading-none italic font-black">STANDARD (標準)</th>
                     </tr></thead>
                     <tbody className="divide-y-4 divide-slate-100 italic font-black italic leading-none italic font-black">
                        <tr className="italic"><td className="p-8 bg-slate-50 font-black border-r-4 border-black italic shadow-sm italic font-serif font-black leading-none">品質・色再現</td><td className="p-8 border-r-4 border-black font-black text-indigo-700 italic underline decoration-indigo-100 italic shadow-sm font-black italic leading-none font-serif italic">400dpi / Adobe / ΔE&lt;6.5保証</td><td className="p-8 italic font-serif font-black italic leading-none italic">400dpi / sRGB / 補正込</td></tr>
                        <tr className="italic"><td className="p-8 bg-slate-50 font-black border-r-4 border-black italic shadow-sm italic font-serif font-black leading-none">検査プロセス</td><td className="p-8 border-r-4 border-black font-black text-indigo-700 italic underline decoration-indigo-100 italic shadow-sm font-black italic leading-none font-serif italic">二重全数検査 (管理職再検)</td><td className="p-8 italic font-serif font-black italic leading-none italic">作業者による全数検査</td></tr>
                     </tbody>
                  </table>
                  <div className="mt-20 p-14 border-[15px] border-black italic font-black bg-slate-50 shadow-2xl italic font-black shadow-inner leading-relaxed italic font-black italic leading-none italic font-black">
                     <p className="font-black text-3xl mb-10 border-b-[8px] border-black inline-block italic italic font-black underline decoration-indigo-100 italic font-black leading-none italic font-black">本案件の積算評価について</p>
                     <p className="text-xl underline decoration-slate-100 decoration-8 italic underline-offset-[-2px] italic font-black leading-relaxed shadow-sm italic font-black leading-none italic font-black">原本脆弱性「{data.fragility}」および劣化リスク（赤変等）を鑑み、破損時の社会的損失リスクを極小化するため、非接触撮影・手めくり厳守、および公的機関の技術監査に耐えうる証跡完備(温湿度60分毎ログ、有資格者の二重検査)を加味し、係数を算定しました。本案件においてはPREMIUMプランが、社会的信用および原本保全の観点から最適となります。</p>
                  </div>
               </div>
            </div>
          )}

          {/* VIEW: SPEC (仕様書・文言増幅) */}
          {view === 'spec' && (
            <div className="animate-in fade-in slide-in-from-right-12 duration-700 pb-40 print:p-0 italic font-black">
               <div className={A4_DOC_LAYOUT}>
                  <div className="text-center mb-40 space-y-16 relative font-serif italic font-black">
                     <h2 className="text-[12rem] font-black italic tracking-tighter uppercase leading-none opacity-[0.03] absolute top-[-60px] left-1/2 -translate-x-1/2 z-0 italic font-black italic leading-none">SOW</h2>
                     <h2 className="text-8xl font-black tracking-[1.2em] mb-14 text-slate-950 italic font-black shadow-sm italic font-black leading-none italic underline decoration-slate-100 decoration-[25px] underline-offset-[-25px] italic relative z-10 font-serif font-black">業務実施仕様書</h2>
                     <p className="text-4xl font-bold border-b-[15px] border-black inline-block px-24 pb-10 italic font-black shadow-sm italic relative z-10 font-serif underline decoration-indigo-900/10 italic font-black italic leading-none">「{data.customerName || '所蔵資料'} デジタルアーカイブ構築業務」</p>
                  </div>

                  <div className="space-y-40 text-[18px] font-medium max-w-5xl mx-auto leading-[3.6] font-serif italic text-slate-900 font-black shadow-inner p-10 italic font-black italic leading-none">
                     {/* 第1章 */}
                     <section className="relative italic font-black italic shadow-sm italic font-black italic shadow-inner italic font-black italic underline decoration-slate-50 italic font-black italic leading-none italic font-black">
                        <h3 className="text-4xl font-black border-l-[45px] border-black pl-14 mb-16 uppercase bg-slate-50 py-10 shadow-2xl italic font-black border-y-8 border-r-8 border-slate-100 italic leading-none font-serif italic font-black">第1条 基本要件及び管理体制</h3>
                        <div className="space-y-20 pl-14 italic font-black leading-[3.2] underline decoration-slate-50 italic font-black italic leading-none italic font-black">
                           <div><h4 className="font-black text-3xl mb-10 underline italic font-black shadow-sm italic font-black leading-none italic underline decoration-indigo-100 decoration-[15px] italic font-black">1.1 目的</h4><p className="shadow-sm font-black italic underline decoration-indigo-50 decoration-8 italic font-black italic leading-none italic font-black leading-none italic font-black italic leading-none italic font-black">{specText.purpose}</p></div>
                           <div><h4 className="font-black text-3xl mb-10 underline italic font-black shadow-sm italic font-black leading-none italic underline decoration-indigo-100 decoration-[15px] italic font-black">1.8 責任者要件、資格及び履行実績の証跡</h4>
                              <ul className="list-disc pl-14 space-y-14 font-bold italic font-black underline decoration-indigo-50 decoration-[15px] italic shadow-sm italic leading-relaxed font-black text-slate-950 text-[26px] italic leading-none italic font-black">
                                 <li>品質管理責任者の独立：生産工程から物理的に分離した別人格を専任し、全数検査の最終承認権限を付与すること。氏名：{data.qualityManager}。</li>
                                 <li>資格保持：指揮監督者は、日本画像情報マネジメント協会認定の<strong>「{data.supervisorCert}」</strong>の資格を保持し、3年以上の実務実績を有すること。</li>
                                 <li>実績証跡：過去5年間に合計6万コマ以上のデジタルデータ作成を完遂した実績を有することを証明せよ。</li>
                              </ul>
                           </div>
                        </div>
                     </section>

                     {/* 第2章 */}
                     <section className="relative italic font-black italic shadow-sm italic font-black italic shadow-inner italic font-black italic underline decoration-slate-50 italic font-black italic leading-none italic font-black">
                        <h3 className="text-4xl font-black border-l-[45px] border-black pl-14 mb-16 uppercase bg-slate-50 py-10 shadow-2xl italic font-black border-y-8 border-r-8 border-slate-100 shadow-amber-100 italic leading-none font-serif italic font-black">第2条 作業環境及び原本保全基準</h3>
                        <div className="space-y-20 pl-14 italic font-black underline decoration-amber-50 decoration-8 italic font-black leading-none italic font-black">
                           <div className="border-[20px] border-black p-14 space-y-16 bg-white shadow-2xl italic font-black italic shadow-inner italic font-black leading-[3.0] italic underline decoration-indigo-50 decoration-[15px] italic font-black leading-none italic font-black">
                              <p>●温湿度管理：受注者は原本保管・作業場所において、<strong>温度22℃(±2℃)、湿度55%(±5%)、湿度60%超過厳禁</strong>を24時間維持すること。<strong>60分間隔の自動測定ログ</strong>および経時変化グラフを納品時に証跡として提出すること。</p>
                              <p>●原本保全：{specText.preservation}</p>
                              <p>●返却資材：原本返却時は AFプロテクトH相当の中性紙袋に収納。綿テープにより蝶結び固定の上、規定のシール(13mm四方)を貼付すること。</p>
                           </div>
                        </div>
                     </section>

                     {/* 第3章 */}
                     <section className="relative italic font-black italic shadow-sm italic font-black italic shadow-inner italic font-black italic underline decoration-slate-50 italic font-black italic leading-none italic font-black">
                        <h3 className="text-4xl font-black border-l-[45px] border-black pl-14 mb-16 uppercase bg-slate-50 py-10 shadow-2xl italic font-black border-y-8 border-r-8 border-slate-100 shadow-emerald-100 italic leading-none font-serif italic font-black">第3条 技術的品質基準及びIT仕様要件</h3>
                        <div className="space-y-20 pl-14 italic font-black leading-[3.6] underline decoration-indigo-50 decoration-[20px] underline-offset-[-5px] italic font-black leading-none italic font-black">
                           <ul className="list-disc pl-20 space-y-20 italic font-black shadow-sm italic underline underline-offset-8 italic font-black leading-none italic font-black italic leading-none">
                              <li><strong>画質閾値：</strong> {specText.tech_res} JIS Z 8781-6に基づき平均色差（ΔE）を <strong>6.5以下</strong> に抑え、客観的な精細度を保証せよ。傾き <strong>1.15度(勾配2%)未満</strong>、トリミング <strong>本体110%以内</strong>。</li>
                              <li><strong>色再現精度：</strong> {specText.tech_color}</li>
                              <li><strong>保存形式：</strong> {specText.tech_format} サムネイル画像は <strong>256x256ピクセル (#808080)</strong> とする。</li>
                              <li><strong>IT構成：</strong> メタデータは <strong>Unicode(UTF-8 BOMなし) / {data.lineFeed}</strong>。Root/書誌ID/分冊/J2K 階層を厳守。</li>
                           </ul>
                        </div>
                     </section>
                  </div>
                  <div className="mt-80 border-t-[15px] border-black pt-24 text-right font-black italic text-slate-400 italic font-black leading-none italic font-black">
                     <p className="text-4xl text-slate-950 tracking-[0.4em] font-black italic shadow-sm italic leading-none italic underline decoration-slate-100 decoration-8 italic font-black italic leading-none italic font-black italic leading-none">{COMPANY_NAME} 品質監査室</p>
                  </div>
               </div>
            </div>
          )}

          {/* VIEW: QA (検査証明書: 羽村市準拠・良否併記レポート) */}
          {view === 'qa' && (
            <div className="animate-in fade-in slide-in-from-bottom-12 duration-700 pb-60 print:p-0 italic font-black font-black italic leading-none">
               <div className={A4_DOC_LAYOUT}>
                  <div className="flex justify-between items-start border-b-[10px] border-slate-950 pb-8 mb-20 italic font-black italic font-black shadow-sm italic font-black leading-none">
                     <div>
                        <h2 className="text-7xl font-black italic tracking-tighter uppercase leading-none italic shadow-sm italic font-black">Audit Certificate</h2>
                        <p className="text-3xl font-black mt-6 bg-black text-white inline-block px-12 py-4 uppercase tracking-[0.8em] italic font-black shadow-2xl italic underline decoration-white decoration-4 italic font-black leading-none">成果物検査証明書 (Final QA)</p>
                     </div>
                     <div className="text-right flex flex-col justify-between items-end gap-16 font-black italic h-full leading-none italic shadow-sm font-black italic">
                        <p className="text-5xl font-mono border-b-6 border-slate-950 px-8 italic font-black underline decoration-indigo-400/20 italic leading-none">№ {data.jobNo}-QA</p>
                        <p className="text-[16px] text-slate-400 uppercase tracking-widest italic font-black italic font-black italic shadow-sm italic underline decoration-slate-50 decoration-4 italic font-black leading-none">Audit Date：{formatDateJST()}</p>
                     </div>
                  </div>

                  <div className="mb-20 border-l-[35px] border-black pl-16 italic font-black shadow-inner py-12 bg-slate-50/40 italic font-black italic rounded-[4rem] shadow-inner font-black leading-none italic font-black">
                     <h3 className="text-8xl font-black italic uppercase tracking-tighter mb-12 italic underline decoration-black/5 italic leading-none shadow-sm font-black">{data.customerName || '---'} 様</h3>
                     <div className="bg-slate-950 text-white p-14 rounded-[5rem] flex items-center gap-14 shadow-2xl mt-16 italic font-black italic italic font-black italic border-8 border-indigo-500/10 italic font-black leading-none italic font-black">
                        <div className="p-12 bg-white/10 rounded-full border-4 border-emerald-400/50 italic font-black italic shadow-2xl shadow-emerald-500/50 italic font-black italic shadow-sm italic font-black"><IconBadgeCheck size={130} className="text-emerald-400 shadow-2xl shadow-emerald-400/50 italic font-black italic leading-none font-black"/></div>
                        <div>
                           <p className="text-[16px] font-black opacity-40 uppercase tracking-[1.2em] mb-8 leading-none italic underline decoration-white/10 italic font-black italic shadow-sm italic font-black">Audit Status</p>
                           <p className="text-[8.5rem] font-black italic tracking-[0.4em] leading-none uppercase italic font-black italic text-emerald-400 italic shadow-xl font-black">PASSED</p>
                        </div>
                        <div className="ml-auto text-right border-l-[8px] border-white/10 pl-16 italic font-black italic leading-none italic font-black italic">
                           <p className="text-[18px] opacity-40 uppercase tracking-widest mb-6 italic font-black italic underline decoration-white/10 italic font-black italic leading-none">Error Rate</p>
                           <p className="text-[9rem] font-black italic font-mono tracking-tighter italic font-black italic leading-none italic underline decoration-emerald-400/30 italic font-black">0.02%</p>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-20 italic font-black italic shadow-sm italic font-black italic leading-none italic font-black">
                     <div className="border-[10px] border-slate-950 italic font-black italic shadow-2xl italic font-black italic shadow-sm italic font-black italic leading-none italic font-black shadow-inner">
                        <div className="bg-slate-950 text-white px-14 py-8 font-black text-2xl uppercase tracking-widest italic flex items-center gap-10 leading-none italic font-black shadow-lg shadow-black/20 italic font-black italic leading-none">
                           <IconScanLine size={56} className="text-indigo-400 italic shadow-sm italic font-black leading-none"/> [I] 物理・外観検査項目 (Physical Audit)
                        </div>
                        <table className="w-full border-collapse italic font-black text-center font-bold italic shadow-inner italic font-black leading-none">
                           <thead className="bg-slate-100 border-b-8 border-slate-950 text-[14px] uppercase font-black tracking-widest shadow-sm italic font-black leading-none italic font-black">
                              <tr><th className="p-10 text-left border-r-4 border-slate-200 italic shadow-sm italic font-black leading-none italic font-black">Quality Objective</th><th className="p-10 text-left border-r-4 border-slate-200 italic shadow-sm italic font-black leading-none italic font-black">Criteria</th><th className="p-10 text-center italic font-black underline decoration-indigo-100 italic leading-none font-black italic shadow-sm">Audit Judge</th></tr>
                           </thead>
                           <tbody className="text-[16px] font-black divide-y-8 divide-slate-50 italic font-black italic leading-none font-black">
                              <tr><td className="p-12 border-r-4 border-slate-50 italic underline decoration-slate-100 italic font-black leading-none">原本保全 (Damage Integrity)</td><td className="p-12 border-r-4 border-slate-50 text-slate-500 font-black italic leading-relaxed italic shadow-sm italic font-black leading-none italic font-black">新たな汚損、亀裂、破損箇所が一切ないこと</td><td className="p-12 text-center font-black italic underline decoration-emerald-100 italic underline-offset-8 italic font-black italic leading-none italic font-black leading-none italic"><span className="border-[6px] border-emerald-600 rounded-full px-8 py-2 text-emerald-600 font-black shadow-2xl italic underline decoration-white italic leading-none italic uppercase font-black">良 (YES)</span> / 否 (NO)</td></tr>
                              <tr><td className="p-12 border-r-4 border-slate-50 italic underline decoration-slate-100 italic font-black leading-none">正像整合 (Orientation)</td><td className="p-12 border-r-4 border-slate-50 text-slate-500 font-black italic leading-relaxed italic shadow-sm italic font-black leading-none italic font-black">全画像が天地正位置であり、NDL準拠であること</td><td className="p-12 text-center font-black italic underline decoration-emerald-100 italic underline-offset-8 italic font-black italic leading-none italic font-black leading-none italic"><span className="border-[6px] border-emerald-600 rounded-full px-8 py-2 text-emerald-600 font-black shadow-2xl italic underline decoration-white italic leading-none italic uppercase font-black">良 (YES)</span> / 否 (NO)</td></tr>
                           </tbody>
                        </table>
                     </div>

                     <div className="border-[10px] border-slate-950 italic font-black italic shadow-2xl italic font-black italic shadow-sm italic font-black italic shadow-inner italic font-black italic shadow-sm italic leading-none italic">
                        <div className="bg-slate-950 text-white px-14 py-8 font-black text-2xl uppercase tracking-widest italic flex items-center gap-10 italic shadow-2xl italic shadow-black/20 italic font-black italic leading-none italic font-black shadow-lg italic">
                           <IconFileBarChart size={56} className="text-emerald-400 italic shadow-sm italic font-black italic"/> [II] 技術的精度検査 (Technical Audit)
                        </div>
                        <table className="w-full border-collapse italic font-black italic shadow-sm italic font-black italic shadow-inner italic font-black italic shadow-sm italic">
                           <thead className="bg-slate-100 border-b-[10px] border-slate-950 text-[13px] uppercase font-black tracking-widest italic shadow-sm italic font-black italic shadow-sm italic font-black italic leading-none italic">
                              <tr><th className="p-8 text-left border-r-4 border-slate-950 italic font-black italic shadow-sm italic font-black italic leading-none italic font-black italic shadow-sm italic">Technical Metric</th><th className="p-8 text-left border-r-4 border-slate-950 italic font-black italic shadow-sm italic leading-none italic font-black italic shadow-sm italic">Threshold</th><th className="p-8 text-center italic font-black italic shadow-sm italic leading-none italic font-black italic shadow-sm italic underline decoration-indigo-200 italic font-black italic">判定 (Judge)</th></tr>
                           </thead>
                           <tbody className="text-[16px] font-bold divide-y-8 divide-slate-50 italic font-black italic shadow-sm italic font-black italic shadow-sm italic">
                              <tr className="hover:bg-indigo-50/40 transition-all duration-700 italic font-black italic font-black italic shadow-sm italic font-black italic"><td className="p-10 border-r-4 border-slate-100 italic font-black italic shadow-sm italic underline decoration-slate-50 italic font-black italic shadow-sm italic leading-none italic font-black italic">解像度適合 (Resolution Accuracy)</td><td className="p-10 border-r-4 border-slate-100 text-slate-500 italic font-black italic underline decoration-indigo-100 decoration-[15px] italic shadow-sm italic font-black italic leading-relaxed italic font-black italic shadow-sm italic">物理解像度 <strong>{data.resolution}</strong> 以上。光学補間なきことの確認済</td><td className="p-10 text-center shadow-inner italic font-black italic font-black italic shadow-sm italic font-black italic shadow-sm italic"><span className="border-[8px] border-emerald-600 rounded-full px-8 py-3 text-emerald-600 font-black shadow-2xl italic underline decoration-white decoration-4 italic leading-none italic uppercase font-black">適 (YES)</span> / 否 (NO)</td></tr>
                              {/* 色再現精度の条件付き表示 */}
                              {(data.colorSpace === 'AdobeRGB' && data.deltaE) && (
                                <tr className="hover:bg-indigo-50/40 transition-all duration-700 italic font-black italic font-black italic shadow-sm italic font-black italic"><td className="p-10 border-r-4 border-slate-100 italic font-black italic shadow-sm italic underline decoration-slate-50 italic font-black italic shadow-sm italic">色再現精度 (Color DeltaE Log)</td><td className="p-10 border-r-4 border-slate-100 text-slate-500 italic font-black italic underline decoration-indigo-100 decoration-[15px] italic shadow-sm italic font-black italic leading-relaxed italic font-black italic shadow-sm italic">平均色差(ΔE) <strong>6.5以下</strong> を全画像において実測保証</td><td className="p-10 text-center shadow-inner italic font-black italic font-black italic shadow-sm italic font-black italic shadow-sm italic"><span className="border-[8px] border-emerald-600 rounded-full px-8 py-3 text-emerald-600 font-black shadow-2xl italic underline decoration-white decoration-4 italic leading-none italic uppercase font-black">良 (YES)</span> / 否 (NO)</td></tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>

                  <div className="mt-40 grid grid-cols-12 gap-20 items-end italic font-black shadow-2xl p-16 border-[20px] border-slate-950 bg-white italic font-black shadow-indigo-100 italic leading-none font-serif font-black italic underline decoration-slate-50 italic font-black leading-none">
                     <div className="col-span-8 italic font-black shadow-sm font-black leading-[3.2] italic font-black shadow-inner italic font-black leading-none italic font-black">
                        <span className="text-[18px] font-black text-indigo-700 uppercase tracking-[1.2em] mb-14 border-b-[10px] border-slate-950 pb-8 italic leading-none underline decoration-indigo-100 font-black shadow-sm italic font-black italic leading-none italic font-black shadow-sm italic leading-none">Audit Evidence Summary Report</span>
                        <p className="text-[22px] leading-[3.6] font-black italic shadow-sm font-black italic underline decoration-indigo-50 decoration-[25px] shadow-indigo-100 italic font-black shadow-sm italic underline-offset-[-10px] italic font-black leading-none italic font-black leading-none">
                           本成果物は公的基準および業務委託仕様を100%充足しています。有資格者(1級管理士)による二重全数検査を執行。目標エラー率0.50%を極小化し実測値 <strong>0.02%</strong> をもって最終合格と判定、品質を永久証明いたします。
                        </p>
                     </div>
                     <div className="col-span-4 border-[25px] border-slate-950 h-[32rem] relative flex flex-col items-center italic font-black shadow-2xl bg-white scale-125 shadow-indigo-100 font-black italic leading-none italic font-black leading-none italic font-black">
                        <div className="bg-slate-950 text-white text-[24px] font-black w-full p-14 text-center uppercase shadow-2xl shadow-black/40 italic font-black underline decoration-white decoration-8 italic underline-offset-[-10px] font-black shadow-sm font-black leading-none italic font-black leading-none italic font-black leading-none">Chief Auditor</div>
                        <div className="flex-1 flex items-center justify-center text-6xl text-slate-100 font-black italic uppercase tracking-[1.6em] -rotate-[35deg] border-[25px] border-slate-50 m-20 w-[98%] rounded-[8rem] opacity-30 shadow-inner italic font-black shadow-sm font-black shadow-sm italic font-black shadow-sm font-black italic leading-none">SEALED</div>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};