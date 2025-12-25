import { useState, useMemo, useEffect } from "react";
import { Data, ViewKey, WorkItem, MiscExpense } from "./types/pricing";
import { computeCalc } from "./utils/calculations";
import { suggestQuotationNo, suggestInspectionReportNo, uid } from "./utils/formatters";
import { DEFAULT_ISSUER } from "./constants/coefficients";

// レイアウト部品
import { Sidebar } from "./components/layout/Sidebar";
import { PrintStyles } from "./components/layout/PrintStyles";

// 機能別ビュー
import { InputView } from "./features/input/InputView";
import { EstimateView } from "./features/estimate/EstimateView";
import { InstructionView } from "./features/instruction/InstructionView";
import { CompareView } from "./features/compare/CompareView";
import { SpecView } from "./features/spec/SpecView";
import { InspectionView } from "./features/inspection/InspectionView";

export default function App() {
  // --- 1. 状態管理（State） ---
  const [data, setData] = useState<Data>(() => ({
    quotationNo: "",
    issuerOrg: DEFAULT_ISSUER.org,
    issuerDept: DEFAULT_ISSUER.hqDept,
    issuerRep: DEFAULT_ISSUER.rep,
    issuerAddress: DEFAULT_ISSUER.hqAddress,
    issuerTel: DEFAULT_ISSUER.tel,
    issuerFax: DEFAULT_ISSUER.fax,
    issuerOpsDept: DEFAULT_ISSUER.opsDept,
    issuerOpsAddress: DEFAULT_ISSUER.opsAddress,
    issuerContactPerson: DEFAULT_ISSUER.contactPerson,
    issuerContactEmail: DEFAULT_ISSUER.contactEmail,
    issuerBankName: DEFAULT_ISSUER.bankName,
    issuerBankBranch: DEFAULT_ISSUER.bankBranch,
    issuerBankType: DEFAULT_ISSUER.bankType,
    issuerBankAccount: DEFAULT_ISSUER.bankAccount,
    issuerBankAccountName: DEFAULT_ISSUER.bankAccountName,

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

    tier: "standard",
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

    workItems: [
      {
        id: uid("w"),
        title: "基本スキャニング業務",
        qty: 1000,
        unit: "頁",
        sizeClass: "A4以下",
        colorMode: "color",
        dpi: 400,
        formats: ["PDF/A"],
        ocr: false,
        metadataLevel: "basic",
        handling: "normal",
        notes: "",
      },
    ],
    miscExpenses: [],
    taxRate: 0.1,
    setupFeeNote: "案件要件の確認、納品フォルダ構成・命名規則の確定、作業環境設定等",
    managementFeeNote: "進行管理、品質管理、顧客窓口、納品前チェックに関わる役務",
  }));

  const [view, setView] = useState<ViewKey>("input");

  // --- 2. ライフサイクル・同期ロジック ---
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

  // --- 3. 計算実行（Memo化） ---
  const calc = useMemo(() => computeCalc(data), [data]);

  // --- 4. データ更新用のアクション ---
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
      miscExpenses: [
        ...p.miscExpenses,
        { id: uid("m"), label: "実費品目", qty: 1, unit: "式", amount: 0 },
      ],
    }));
  };

  const removeMiscExpense = (id: string) => {
    setData((p) => ({ ...p, miscExpenses: p.miscExpenses.filter((m) => m.id !== id) }));
  };

  const updateMiscExpense = (id: string, patch: Partial<MiscExpense>) => {
    setData((p) => ({ ...p, miscExpenses: p.miscExpenses.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  };

  // --- 5. レンダリング ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <PrintStyles />
      
      {/* サイドバー（ナビゲーション） */}
      <Sidebar view={view} setView={setView} data={data} />

      {/* メインコンテンツエリア */}
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl">
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
        </div>
      </main>
    </div>
  );
}