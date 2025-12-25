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
        notes: "保存用（TIFF非圧縮想定）＋閲覧用（PDF/A）。",
      }
    ],
    miscExpenses: [],
    taxRate: 0.1,
    setupFeeNote: "案件要件の確認、納品フォルダ構成・命名規則の確定、帳票テンプレートの初期化等",
    managementFeeNote: "進行管理、品質管理、顧客窓口、納品前チェックに関わる役務",
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <PrintStyles />
      <Sidebar view={view} setView={setView} data={data} />
      <main className="flex-1 p-6 overflow-auto">
        {view === "input" && <InputView data={data} setData={setData} calc={calc} addWorkItem={addWorkItem} removeWorkItem={removeWorkItem} updateWorkItem={updateWorkItem} addMiscExpense={addMiscExpense} removeMiscExpense={removeMiscExpense} updateMiscExpense={updateMiscExpense} />}
        {view === "estimate" && <EstimateView data={data} calc={calc} />}
        {view === "instruction" && <InstructionView data={data} calc={calc} />}
        {view === "compare" && <CompareView data={data} />}
        {view === "spec" && <SpecView data={data} />}
        {view === "inspection" && <InspectionView data={data} setData={setData} />}
      </main>
    </div>
  );
}