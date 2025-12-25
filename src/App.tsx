import { useState, useMemo, useEffect } from "react";
import { Data, ViewKey, WorkItem, MiscExpense } from "./types/pricing";
import { computeCalc } from "./utils/calculations";
import { suggestQuotationNo, suggestInspectionReportNo, uid } from "./utils/formatters";
import { ISSUER } from "./constants/coefficients";

import { Sidebar } from "./components/layout/Sidebar";
import { PrintStyles } from "./components/layout/PrintStyles";
import { InputView } from "./features/input/InputView";
import { EstimateView } from "./features/estimate/EstimateView";
import { InstructionView } from "./features/instruction/InstructionView";
import { CompareView } from "./features/compare/CompareView";
import { SpecView } from "./features/spec/SpecView";
import { InspectionView } from "./features/inspection/InspectionView";

// ---- アプリ表示名（固定） ----
const SYSTEM_NAME = "KHQ見積もり統合システム";

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
    // 初期業務アイテムを完全復元
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
    // 備品実費等の初期データ復元
    miscExpenses: [
      { id: uid("m"), label: "外付けHDD（実費）", qty: 1, unit: "式", unitPrice: 0, amount: 0, notes: "" },
      { id: uid("m"), label: "保存箱（実費）", qty: 1, unit: "式", unitPrice: 0, amount: 0, notes: "" },
      { id: uid("m"), label: "中性紙封筒・ラベル等（実費）", qty: 1, unit: "式", unitPrice: 0, amount: 0, notes: "" },
    ],
    taxRate: 0.1,
    setupFeeNote: "案件要件の確認、納品フォルダ構成・命名規則の確定、帳票テンプレートの初期化、作業環境・セキュリティ設定（媒体・暗号化方針等）",
    managementFeeNote: "進行管理（工程管理・品質基準の適用・顧客窓口）、品質管理（検査計画・是正指示・再作業管理）、納品前チェック・記録の取りまとめ",
  }));

  const [view, setView] = useState<ViewKey>("input");

  useEffect(() => {
    setData(prev => {
      const nextQ = prev.quotationNo || suggestQuotationNo(prev.issueDate);
      const nextI = prev.inspectionReportNo || suggestInspectionReportNo(prev.inspectionIssueDate || prev.issueDate);
      if (nextQ === prev.quotationNo && nextI === prev.inspectionReportNo) return prev;
      return { ...prev, quotationNo: nextQ, inspectionReportNo: nextI };
    });
  }, [data.issueDate, data.inspectionIssueDate]);

  const calc = useMemo(() => computeCalc(data), [data]);

  const addWorkItem = () => setData(p => ({ ...p, workItems: [...p.workItems, { id: uid("w"), title: "（追加項目）", qty: 0, unit: "頁", sizeClass: "A4以下", colorMode: "mono", dpi: 300, formats: ["PDF"], ocr: false, metadataLevel: "none", handling: "normal", notes: "" }] }));
  const removeWorkItem = (id: string) => setData(p => ({ ...p, workItems: p.workItems.filter(w => w.id !== id) }));
  const updateWorkItem = (id: string, patch: Partial<WorkItem>) => setData(p => ({ ...p, workItems: p.workItems.map(w => w.id === id ? { ...w, ...patch } : w) }));
  const addMiscExpense = () => setData(p => ({ ...p, miscExpenses: [...p.miscExpenses, { id: uid("m"), label: "実費品目", qty: 1, unit: "式", amount: 0 }] }));
  const removeMiscExpense = (id: string) => setData(p => ({ ...p, miscExpenses: p.miscExpenses.filter(m => m.id !== id) }));
  const updateMiscExpense = (id: string, patch: Partial<MiscExpense>) => setData(p => ({ ...p, miscExpenses: p.miscExpenses.map(m => m.id === id ? { ...m, ...patch } : m) }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PrintStyles />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 flex items-start justify-between gap-4 no-print">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{SYSTEM_NAME}</h1>
            <p className="mt-1 text-sm text-slate-600">
              左のタブで、入力・指示書・見積・仕様・検査を切り替えます。計算ロジックは入力タブの条件に追随します。
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <Sidebar view={view} setView={setView} data={data} />
          <main className="flex-1 p-0 overflow-visible">
            {view === "input" && <InputView data={data} setData={setData} calc={calc} addWorkItem={addWorkItem} removeWorkItem={removeWorkItem} updateWorkItem={updateWorkItem} addMiscExpense={addMiscExpense} removeMiscExpense={removeMiscExpense} updateMiscExpense={updateMiscExpense} />}
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