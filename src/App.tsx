import { useState, useMemo, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { Data, WorkItem, Tier, ViewKey } from "./types/pricing";
import { computeCalc } from "./utils/calculations";
import { suggestQuotationNo, suggestInspectionReportNo, uid } from "./utils/formatters";
import { ISSUER, SYSTEM_NAME, APP_VERSION } from "./constants/coefficients";

import { Sidebar } from "./components/layout/Sidebar";
import { PrintStyles } from "./components/layout/PrintStyles";
import { InputView } from "./features/input/InputView";
import { EstimateView } from "./features/estimate/EstimateView";
import { InstructionView } from "./features/instruction/InstructionView";
import { InspectionView } from "./features/inspection/InspectionView";
import { SpecView } from "./features/spec/SpecView";
import { CompareView } from "./features/compare/CompareView";

// ---- ログイン画面 ----
function LoginView({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pw === "1234") {
      onLogin();
    } else {
      setErr("パスワードが違います");
      setPw("");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0f172a] to-[#1e1b4b]" />
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl p-8 overflow-hidden">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight drop-shadow-md">{SYSTEM_NAME}</h1>
            <p className="text-xs text-slate-300 mt-2 font-medium">Authorized Personnel Only</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="password"
              className="w-full bg-slate-900/80 text-white placeholder-slate-500 px-4 py-3 rounded-xl border border-white/10 outline-none text-center tracking-widest font-mono text-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="PASSCODE"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setErr(""); }}
              autoFocus
            />
            {err && <div className="text-center text-rose-300 text-xs font-bold">{err}</div>}
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-900 font-bold rounded-xl shadow-lg transition-all active:scale-[0.98]"
            >
              ACCESS SYSTEM
            </button>
          </form>
          <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-400">Secured by KHQ Architecture {APP_VERSION}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- メインアプリケーション ----
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem("khq_auth") === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem("khq_auth", "true");
    setIsAuthenticated(true);
  };

  const [data, setData] = useState<Data>(() => ({
    // L1: 基本情報 (国立研究開発法人○○機構)
    jobNo: "230831001",
    createdDate: "2023-08-31",
    subject: "令和5年度 ○○報告スキャン・電子化・長期保存用資材への格納業務",
    customerName: "国立研究開発法人○○機構",
    customerType: "官公庁・自治体",
    jurisdiction: "資料管理担当",
    contactName: "ご担当者 ○○",
    contactTel: "03-0000-0000",
    qualityManager: "高橋 幸一",
    salesManager: "一木",
    supervisorCert: "文書情報管理士1級",
    
    deadline: "2024-03-31",
    deadlineType: "目標納期",
    isExpress: false,
    expressLevel: "通常",
    contractExists: true,
    meetingMemoExists: true,
    
    specStandard: true,
    specProvidedByClient: true,
    specProfile: "standard",
    privacyFlag: false,
    
    notes: "※実際の作業数量に合わせてご請求させていただきます。作業内容は別紙仕様書に従います。",

    // L2: 運用・輸送
    workLocation: "社内（高セキュリティ施設）",
    strictCheckIn: true,
    checkInListProvided: true,
    transportDistanceKm: 20,
    transportTrips: 1,
    shippingType: "セキュリティ専用便",
    fumigation: true, // 見積項目にあるためON
    tempHumidLog: false,
    neutralPaperBag: "",
    interleaving: false,
    unbinding: "紐外し", // 前処理にあるため
    rebind: false,
    preprocessMemo: "劣化史料取り扱い費を含む。製本を解いて1点ずつの史料に解体。",

    // L4: 画像処理・検査
    inspectionLevel: "標準全数検査 (作業者のみ)",
    deltaE: false,
    reflectionSuppression: false,
    deskew: true,
    trimming: "あり",
    binaryConversion: false,
    binaryThreshold: "固定128",
    ocr: false, // PDFでは言及なし
    ocrProofread: false,
    namingRule: "連番のみ", // 管理数字(001~460)
    folderStructure: "タブ(インデックス)単位",
    indexType: "なし",
    lineFeed: "LF",

    // L5: 納品
    deliveryMedia: [], // MiscでHDD計上
    mediaCount: 1,
    labelPrint: true,
    longTermStorageMonths: 0,
    dataDeletionProof: true,
    disposal: "返却のみ",
    deliveryMemo: "",

    // 係数パラメータ
    tier: "standard",
    kLoadPct: 0,
    factorCap: 2.2,
    capExceptionApproved: false,

    // 互換性維持
    quotationNo: "",
    issuerOrg: ISSUER.org,
    
    // UI制御
    includeQuotation: true,
    includePriceRationalePage: true,
    includeSpecDoc: true,
    includeInstructionDoc: true,
    includeInspectionDoc: true,

    // 検査結果用
    inspectionReportNo: "",
    inspectionIssueDate: "",
    inspectionDate: "",
    inspectionOverall: "pass",
    inspectionDefectCount: 0,
    inspectionReworkCount: 0,
    inspectionCheckedCount: 0,
    inspectionInspector: "",
    inspectionApprover: "",
    inspectionRemarks: "",

    // 作業項目 (Scan)
    workItems: [
      {
        id: uid("w"),
        service: "C", // 手置きスキャン (A3, 劣化)
        title: "史料(A3サイズ)のスキャニング",
        qty: 12000,
        unit: "カット",
        sizeClass: "A3",
        resolution: "400dpi",
        colorSpace: "sRGB",
        fileFormats: ["TIFF", "PDF"],
        fileFormatsFree: "",
        notes: "原寸解像度400dpi フルカラー、劣化史料取り扱い費を含む",
        fragile: true,
        dismantleAllowed: true,
        restorationRequired: false,
        requiresNonContact: false,
      },
    ],
    // 実費・特殊工程 (見積PDFの明細)
    miscExpenses: [
      {
        id: uid("m"),
        label: "史料の燻蒸(合倉)",
        qty: 1,
        unit: "式",
        unitPrice: 60000,
        amount: 60000,
        note: "殺虫・殺菌処理",
        calcType: "manual"
      },
      {
        id: uid("m"),
        label: "前処理 (クリーニング・解体)",
        qty: 19,
        unit: "簿冊",
        unitPrice: 4600,
        amount: 87400,
        note: "史料のクリーニング、製本解体",
        calcType: "manual"
      },
      {
        id: uid("m"),
        label: "PDF作成 (マルチ加工・ファイル名付与)",
        qty: 460,
        unit: "件",
        unitPrice: 90,
        amount: 41400,
        note: "タブ単位マルチPDF、管理番号付与",
        calcType: "manual"
      },
      {
        id: uid("m"),
        label: "目次作成 (閲覧用PDF作り込み)",
        qty: 1,
        unit: "式",
        unitPrice: 60000,
        amount: 60000,
        note: "閲覧用データ整備",
        calcType: "manual"
      },
      {
        id: uid("m"),
        label: "保存用資材収納 (封筒・保存箱)",
        qty: 1,
        unit: "式",
        unitPrice: 335500,
        amount: 335500,
        note: "タブ単位封入、ナンバリング、保存箱仕立て",
        calcType: "manual"
      },
      {
        id: uid("m"),
        label: "納品用HDD",
        qty: 1,
        unit: "台",
        unitPrice: 15000,
        amount: 15000,
        note: "TIFF・PDFデータを格納",
        calcType: "expense"
      }
    ], 
  }));

  const [view, setView] = useState<ViewKey>("input");

  const calc = useMemo(() => computeCalc(data), [data]);

  useEffect(() => {
    setData((prev) => {
      const nextQuotationNo = prev.quotationNo || suggestQuotationNo(prev.createdDate);
      const inspIssue = prev.inspectionIssueDate || prev.createdDate;
      const nextInspectionNo = prev.inspectionReportNo || suggestInspectionReportNo(inspIssue);

      if (nextQuotationNo === prev.quotationNo && nextInspectionNo === prev.inspectionReportNo) {
        return prev;
      }
      return {
        ...prev,
        quotationNo: nextQuotationNo,
        inspectionReportNo: nextInspectionNo,
      };
    });
  }, [data.createdDate, data.inspectionIssueDate]);

  const addWorkItem = () => {
    setData((p) => ({
      ...p,
      workItems: [
        ...p.workItems,
        {
          id: uid("w"),
          service: "C",
          title: "（新規）作業項目",
          qty: 0,
          unit: "枚",
          sizeClass: "A4以下",
          resolution: "300dpi",
          colorSpace: "sRGB",
          fileFormats: ["PDF"],
          fileFormatsFree: "",
          notes: "",
          fragile: false,
          dismantleAllowed: true,
          restorationRequired: false,
          requiresNonContact: false,
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
    setData(p => ({
      ...p,
      miscExpenses: [
        ...p.miscExpenses,
        { id: uid("m"), label: "", qty: 1, unit: "式", unitPrice: 0, amount: 0, calcType: "manual", note: "" }
      ]
    }));
  }; 
  const removeMiscExpense = (id: string) => {
    setData(p => ({ ...p, miscExpenses: p.miscExpenses.filter(m => m.id !== id) }));
  };
  const updateMiscExpense = (id: string, patch: any) => {
    setData(p => ({ 
      ...p, 
      miscExpenses: p.miscExpenses.map(m => m.id === id ? { ...m, ...patch } : m) 
    }));
  };

  const handleSaveData = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const safeClientName = (data.customerName || "案件データ").replace(/[\\/:*?"<>|]/g, "_");
    const fileName = `KHQ_${safeClientName}_${dateStr}.json`;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClickLoad = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const loadedData = JSON.parse(text);
        if (!loadedData || typeof loadedData !== "object") {
          alert("エラー：無効なデータ形式です。");
          return;
        }
        setData(loadedData as Data);
        alert("データを読み込みました。");
      } catch (err) {
        console.error(err);
        alert("エラー：ファイルの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
  };

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PrintStyles />
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="mb-8 flex items-end justify-between gap-4 no-print border-b border-slate-200 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-lg shadow-indigo-200">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 drop-shadow-sm">{SYSTEM_NAME}</h1>
              <p className="text-sm font-medium text-slate-500">
                見積計算・仕様策定・検査管理プラットフォーム
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div className="flex items-center justify-end gap-3 mb-1">
              <div className="px-3 py-1 bg-slate-100 rounded-full font-mono text-slate-600 border border-slate-200">{APP_VERSION}</div>
              <button onClick={handleSaveData} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-emerald-500">
                保存
              </button>
              <button onClick={handleClickLoad} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-indigo-500">
                読込
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json,application/json" />
              <button className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-slate-800" onClick={() => window.print()}>
                印刷
              </button>
            </div>
            <div className="font-medium text-slate-400">View: {view}</div>
          </div>
        </div>

        <div className="flex gap-6">
          <Sidebar view={view} setView={setView} data={data} />
          <main className="min-w-0 flex-1">
            {view === "input" && (
              <InputView
                data={data} setData={setData} calc={calc}
                addWorkItem={addWorkItem} removeWorkItem={removeWorkItem} updateWorkItem={updateWorkItem}
                addMiscExpense={addMiscExpense} removeMiscExpense={removeMiscExpense} updateMiscExpense={updateMiscExpense}
              />
            )}
            {view === "estimate" && <EstimateView data={data} calc={calc} />}
            {view === "instruction" && <InstructionView data={data} calc={calc} />}
            {view === "inspection" && <InspectionView data={data} setData={setData} />}
            {view === "spec" && <SpecView data={data} />}
            {view === "compare" && <CompareView data={data} />}
          </main>
        </div>
      </div>
    </div>
  );
}