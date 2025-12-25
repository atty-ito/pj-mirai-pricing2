import { useState, useMemo, useEffect } from "react";
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

export default function App() {
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

    // 初期データを完全復元（4つの業務項目）
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

    // 初期データを完全復元（3つの実費項目）
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