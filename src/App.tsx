import { useState, useMemo, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { Data, ViewKey, WorkItem, MiscExpense } from "./types/pricing";
import { computeCalc } from "./utils/calculations";
import { suggestQuotationNo, suggestInspectionReportNo, uid } from "./utils/formatters";
import { ISSUER, SYSTEM_NAME } from "./constants/coefficients";

import { Sidebar } from "./components/layout/Sidebar";
import { PrintStyles } from "./components/layout/PrintStyles";
import { InputView } from "./features/input/InputView";
import { EstimateView } from "./features/estimate/EstimateView";
import { InstructionView } from "./features/instruction/InstructionView";
import { CompareView } from "./features/compare/CompareView";
import { SpecView } from "./features/spec/SpecView";
import { InspectionView } from "./features/inspection/InspectionView";

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

  const [data, setData] = useState<Data>(() => ({
    quotationNo: "",
    issuerOrg: ISSUER.org,
    issuerDept: ISSUER.hqDept,
    issuerRep: ISSUER.rep,
    issuerAddress: ISSUER.hqAddress,
    issuerTel: ISSUER.tel,
    issuerFax: ISSUER.fax,
    issuerOpsDept: ISSUER.opsDept,
    issuerOpsAddress: ISSUER.opsAddress,
    issuerContactPerson: ISSUER.contactPerson,
    issuerContactEmail: ISSUER.contactEmail,
    issuerBankName: ISSUER.bankName,
    issuerBankBranch: ISSUER.bankBranch,
    issuerBankType: ISSUER.bankType,
    issuerBankAccount: ISSUER.bankAccount,
    issuerBankAccountName: ISSUER.bankAccountName,

    inspectionReportNo: "",
    inspectionIssueDate: new Date().toISOString().slice(0, 10),
    inspectionDate: "",
    inspectionOverall: "pass",
    inspectionDefectCount: 0,
    inspectionReworkCount: 0,
    inspectionCheckedCount: 0,
    inspectionInspector: "",
    inspectionApprover: "",
    inspectionRemarks: "",

    clientName: "株式会社○○",
    projectName: "資料デジタル化業務",
    contactName: "ご担当者 ○○ 様",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    notes: "",

    tier: "economy",

    includeQuotation: true,
    includePriceRationalePage: true,
    includeFixedCostRationalePage: true,
    includeParameterTables: true,
    includeInternalCalc: true,
    includeSpecDoc: true,
    includeInstructionDoc: true,
    includeInspectionDoc: true,

    specProfile: "standard",
    gunmaAllInspection: true,
    gunmaMediaRequirements: true,
    gunmaMetadataMandatory: true,

    inspectionLevel: "sample",

    includeFumigation: false,
    includePacking: false,
    includePickupDelivery: false,
    includeOnsite: false,
    includeEncryption: false,

    showUnitPriceBreakdown: true,
    includeInternalPlanDiffPage: true,
    includeInternalPlanComparePage: true,

    // 初期データ（業務項目）
    workItems: [
      {
        id: uid("w"),
        title: "簿冊（保存用TIFF＋閲覧PDF）",
        qty: 1200,
        unit: "頁",
        sizeClass: "A4以下",
        colorMode: "color",
        dpi: 400,
        formats: ["TIFF", "PDF/A"],
        ocr: false,
        metadataLevel: "basic",
        handling: "normal",
        notes: "保存用（TIFF非圧縮想定）＋閲覧用（PDF/A）。ICCプロファイル埋込・チェックサム等は仕様書で規定。",
      },
      {
        id: uid("w"),
        title: "大型図面（A2）",
        qty: 120,
        unit: "点",
        sizeClass: "A2",
        colorMode: "color",
        dpi: 400,
        formats: ["TIFF", "PDF"],
        ocr: false,
        metadataLevel: "basic",
        handling: "fragile",
        notes: "折り・破損リスクを前提に、取扱い加算が入る想定。",
      },
      {
        id: uid("w"),
        title: "写真・図版（高精細）",
        qty: 300,
        unit: "点",
        sizeClass: "A4以下",
        colorMode: "color",
        dpi: 600,
        formats: ["TIFF", "JPEG"],
        ocr: false,
        metadataLevel: "basic",
        handling: "normal",
        notes: "色管理・解像度要件を厳格化した想定（ICC／傾き・色味の補正はプレミアムに寄る）。",
      },
      {
        id: uid("w"),
        title: "閲覧用PDF（OCRあり）",
        qty: 800,
        unit: "頁",
        sizeClass: "A4以下",
        colorMode: "gray",
        dpi: 300,
        formats: ["PDF"],
        ocr: true,
        metadataLevel: "basic",
        handling: "normal",
        notes: "検索性の確保（OCR）を付す想定。原本の状態により精度は変動。",
      },
    ],

    // 初期データ（実費）
    miscExpenses: [
      { id: uid("m"), label: "外付けHDD（実費）", qty: 1, unit: "式", unitPrice: 0, amount: 0, notes: "" },
      { id: uid("m"), label: "保存箱（実費）", qty: 1, unit: "式", unitPrice: 0, amount: 0, notes: "" },
      { id: uid("m"), label: "中性紙封筒・ラベル等（実費）", qty: 1, unit: "式", unitPrice: 0, amount: 0, notes: "" },
    ],

    taxRate: 0.1,

    setupFeeNote:
      "案件要件の確認、納品フォルダ構成・命名規則の確定、帳票テンプレートの初期化、作業環境・セキュリティ設定（媒体・暗号化方針等）",
    managementFeeNote:
      "進行管理（工程管理・品質基準の適用・顧客窓口）、品質管理（検査計画・是正指示・再作業管理）、納品前チェック・記録の取りまとめ",
  }));

  const [view, setView] = useState<ViewKey>("input");

  useEffect(() => {
    setData((prev) => {
      const nextQuotationNo = prev.quotationNo || suggestQuotationNo(prev.issueDate);
      const inspIssue = prev.inspectionIssueDate || prev.issueDate;
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
  }, [data.issueDate, data.inspectionIssueDate]);

  const calc = useMemo(() => computeCalc(data), [data]);

  // --- データ操作ハンドラ ---
  const addWorkItem = () => {
    setData((p) => ({
      ...p,
      workItems: [
        ...p.workItems,
        {
          id: uid("w"),
          title: "（追加項目）",
          qty: 0,
          unit: "頁",
          sizeClass: "A4以下",
          colorMode: "mono",
          dpi: 300,
          formats: ["PDF"],
          ocr: false,
          metadataLevel: "none",
          handling: "normal",
          notes: "",
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
    setData((p) => ({
      ...p,
      miscExpenses: [...p.miscExpenses, { id: uid("m"), label: "特殊工程（自由入力）", qty: 1, unit: "式", unitPrice: 0, amount: 0, notes: "" }],
    }));
  };

  const removeMiscExpense = (id: string) => {
    setData((p) => ({ ...p, miscExpenses: p.miscExpenses.filter((m) => m.id !== id) }));
  };

  const updateMiscExpense = (id: string, patch: Partial<MiscExpense>) => {
    setData((p) => ({ ...p, miscExpenses: p.miscExpenses.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  };

  // --- 保存・読込ハンドラ ---
  
  // 1. JSONエクスポート
  const handleSaveData = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // ファイル名生成: KHQ_顧客名_日付.json
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const safeClientName = (data.clientName || "案件データ").replace(/[\\/:*?"<>|]/g, "_");
    const fileName = `KHQ_${safeClientName}_${dateStr}.json`;

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 2. JSONインポート（ファイル選択トリガー）
  const handleClickLoad = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // 同じファイルを再度選べるようにリセット
      fileInputRef.current.click();
    }
  };

  // 3. JSONインポート（実処理）
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const loadedData = JSON.parse(text);
        
        // 簡易バリデーション：必須プロパティの存在確認
        if (!loadedData || typeof loadedData !== "object" || !Array.isArray(loadedData.workItems)) {
          alert("エラー：無効なデータ形式です。");
          return;
        }

        // データの適用
        setData(loadedData as Data);
        alert("データを読み込みました。");
      } catch (err) {
        console.error(err);
        alert("エラー：ファイルの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
  };

  // 認証チェック
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
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75a.75.75 0 0 1-.75-.75V15m.75 0H15" />
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
              <div className="px-3 py-1 bg-slate-100 rounded-full font-mono text-slate-600 border border-slate-200">Ver 24.10</div>
              
              {/* 保存ボタン */}
              <button
                type="button"
                onClick={handleSaveData}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-emerald-500 hover:shadow-lg active:translate-y-0.5"
                title="現在のデータをJSONファイルとして保存"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                </svg>
                保存
              </button>

              {/* 読込ボタン */}
              <button
                type="button"
                onClick={handleClickLoad}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-indigo-500 hover:shadow-lg active:translate-y-0.5"
                title="JSONファイルを読み込んでデータを復元"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03l2.955-3.129v8.614Z" />
                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                </svg>
                読込
              </button>
              
              {/* ファイル選択用（非表示） */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".json,application/json"
              />

              {/* 印刷ボタン */}
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 hover:shadow-lg active:translate-y-0.5"
                onClick={() => window.print()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75V3.5h3.5c.966 0 1.75.784 1.75 1.75v9.5A1.75 1.75 0 0 1 18.5 16.5H15v2.75c0 .966-.784 1.75-1.75 1.75h-6.5A1.75 1.75 0 0 1 5 19.25V16.5H1.5A1.75 1.75 0 0 1-.25 14.75v-9.5C-.25 4.284.534 3.5 1.5 3.5h3.5V2.75Zm1.5 1.5v-.75a.25.25 0 0 1 .25-.25h6.5a.25.25 0 0 1 .25.25v.75H6.5Zm-5 2h17v7.25a.25.25 0 0 1-.25.25H15v-2.25a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v2.25H1.5a.25.25 0 0 1-.25-.25V6.25ZM6.5 16.5V19.25a.25.25 0 0 0 .25.25h6.5a.25.25 0 0 0 .25-.25V16.5H6.5Z" clipRule="evenodd" />
                </svg>
                印刷 / PDF保存
              </button>
            </div>
            <div className="font-medium text-slate-400">現在表示中: {
              view === "input" ? "入力画面" : 
              view === "instruction" ? "指示書" : 
              view === "estimate" ? "見積もり" : 
              view === "compare" ? "プラン比較" : 
              view === "spec" ? "仕様書" : "検査表"
            }</div>
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
            {view === "compare" && <CompareView data={data} />}
            {view === "spec" && <SpecView data={data} />}
            {view === "inspection" && <InspectionView data={data} setData={setData} />}
          </main>
        </div>
      </div>
    </div>
  );
}