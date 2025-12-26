import { useState, useMemo, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { Data, WorkItem, Tier, ViewKey } from "./types/pricing";
import { computeCalc } from "./utils/calculations";
import { suggestQuotationNo, suggestInspectionReportNo, uid } from "./utils/formatters";
import { ISSUER, SYSTEM_NAME } from "./constants/coefficients";

import { Sidebar } from "./components/layout/Sidebar";
import { PrintStyles } from "./components/layout/PrintStyles";
import { InputView } from "./features/input/InputView";
import { EstimateView } from "./features/estimate/EstimateView";
import { InstructionView } from "./features/instruction/InstructionView";
import { InspectionView } from "./features/inspection/InspectionView";
import { SpecView } from "./features/spec/SpecView";
import { CompareView } from "./features/compare/CompareView";

// ---- グラフィカルなログイン画面 ----
function LoginView({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [isFocus, setIsFocus] = useState(false);

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
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl p-8 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-md">{SYSTEM_NAME}</h1>
            <p className="text-xs text-slate-300 mt-2 font-medium">Authorized Personnel Only</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl blur transition-opacity duration-300 ${isFocus ? 'opacity-100' : 'opacity-0'}`} />
              <div className="relative bg-slate-900/80 rounded-xl p-1 border border-white/10">
                <input
                  type="password"
                  className="w-full bg-transparent text-white placeholder-slate-500 px-4 py-3 outline-none text-center tracking-widest font-mono text-lg"
                  placeholder="PASSCODE"
                  value={pw}
                  onChange={(e) => { setPw(e.target.value); setErr(""); }}
                  onFocus={() => setIsFocus(true)}
                  onBlur={() => setIsFocus(false)}
                  autoFocus
                />
              </div>
            </div>

            {err && (
              <div className="text-center text-rose-300 text-xs font-bold animate-shake">
                ⚠️ {err}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-900 font-bold rounded-xl shadow-lg shadow-black/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              <span>ACCESS SYSTEM</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 transition-transform group-hover:translate-x-1">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-400">
              Secured by KHQ Architecture v24.10
            </p>
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

  // セッションストレージでログイン状態を維持
  useEffect(() => {
    if (sessionStorage.getItem("khq_auth") === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem("khq_auth", "true");
    setIsAuthenticated(true);
  };

  // 初期データセット
  const [data, setData] = useState<Data>(() => ({
    // L1: 基本情報
    jobNo: "25-001024",
    createdDate: new Date().toISOString().slice(0, 10),
    subject: "令和5年度 所蔵資料デジタル化業務委託",
    customerName: "○○組合長",
    customerType: "官公庁・自治体",
    jurisdiction: "総務課 契約担当",
    contactName: "○○ ○○",
    contactTel: "00-0000-0000",
    qualityManager: "高橋 幸一",
    salesManager: "一木",
    supervisorCert: "文書情報管理士1級",
    
    deadline: "2026-03-31",
    deadlineType: "絶対納期",
    isExpress: false,
    expressLevel: "通常",
    contractExists: true,
    meetingMemoExists: true,
    specStandard: true,
    privacyFlag: true,

    // L2: 運用・輸送
    workLocation: "社内（高セキュリティ施設）",
    strictCheckIn: true,
    checkInListProvided: true,
    transportDistanceKm: 30,
    transportTrips: 2,
    shippingType: "セキュリティ専用便",
    fumigation: true,
    tempHumidLog: true,
    neutralPaperBag: "AFプロテクトH相当",
    interleaving: false,
    unbinding: "なし",
    rebind: false,
    preprocessMemo: "受領時に劣化・汚損の有無を確認し、必要な場合は協議の上で補修を行う。",

    // L4: 画像処理・検査
    inspectionLevel: "標準全数検査 (作業者のみ)",
    deltaE: false,
    reflectionSuppression: false,
    deskew: true,
    trimming: "あり (110%)",
    binaryConversion: false,
    binaryThreshold: "固定128",
    ocr: false,
    ocrProofread: false,
    namingRule: "連番のみ",
    folderStructure: "Root / 書誌ID / 分冊",
    indexType: "索引データ（Excel）",
    lineFeed: "LF",

    // L5: 納品
    deliveryMedia: ["HDD/SSD", "DVD-R"],
    mediaCount: 1,
    labelPrint: true,
    longTermStorageMonths: 0,
    dataDeletionProof: true,
    disposal: "なし",
    deliveryMemo: "納品媒体の暗号化は要望に応じて対応する。",

    // 係数パラメータ
    tier: "standard",
    kLoadPct: 0,
    factorCap: 2.2,
    capExceptionApproved: false,

    // 互換性維持フィールド
    quotationNo: "",
    issuerOrg: ISSUER.org,
    
    // UI制御
    includeQuotation: true,
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

    workItems: [
      {
        id: uid("w"),
        service: "C",
        title: "資料の電子化（見開きA3以内）",
        qty: 65100,
        unit: "枚",
        sizeClass: "A3",
        resolution: "400dpi",
        colorSpace: "モノクローム (TIFF/MMR)",
        fileFormats: ["TIFF", "PDF"],
        notes: "原寸、落丁・乱丁防止、見開き保持。",
        fragile: true,
        dismantleAllowed: true,
        restorationRequired: true,
        requiresNonContact: true,
      },
      {
        id: uid("w"),
        service: "D",
        title: "図面の電子化（A2）",
        qty: 5,
        unit: "枚",
        sizeClass: "A2",
        resolution: "400dpi",
        colorSpace: "sRGB",
        fileFormats: ["TIFF", "JPG"],
        notes: "折り目・反りの補正、全体図と細部の判読性確保。",
        fragile: false,
        dismantleAllowed: true,
        restorationRequired: false,
        requiresNonContact: false,
      },
    ],
    miscExpenses: [], // 自由入力欄
  }));

  const [view, setView] = useState<ViewKey>("input");

  // 見積計算（常時実行）
  const calc = useMemo(() => computeCalc(data), [data]);

  // ID採番の監視
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

  // --- データ操作ハンドラ ---
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

  const addMiscExpense = () => {}; 
  const removeMiscExpense = (id: string) => {};
  const updateMiscExpense = (id: string, patch: any) => {};

  // --- 保存・読込ハンドラ ---
  const handleSaveData = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    
    // 修正: clientName -> customerName
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
              <span className="text-xl font-black">OS</span>
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
              <div className="px-3 py-1 bg-slate-100 rounded-full font-mono text-slate-600 border border-slate-200">Ver 24.10</div>
              <button
                type="button"
                onClick={handleSaveData}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-emerald-500"
              >
                保存
              </button>
              <button
                type="button"
                onClick={handleClickLoad}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-indigo-500"
              >
                読込
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json,application/json" />
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-slate-800"
                onClick={() => window.print()}
              >
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
                data={data}
                setData={setData}
                calc={calc}
                addWorkItem={addWorkItem}
                removeWorkItem={removeWorkItem}
                updateWorkItem={updateWorkItem}
                addMiscExpense={addMiscExpense}
                removeMiscExpense={removeMiscExpense}
                updateMiscExpense={updateMiscExpense}
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