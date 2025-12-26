import { useMemo, useState } from "react";
import { Data, Tier, InspectionLevel, WorkItem } from "../../types/pricing";
import { computeCalc, CalcResult, computeUnitPrice, UnitPriceBreakdown, LineItem } from "../../utils/calculations";
import { fmtJPY, sizeLabel, colorModeLabel, dpiLabel, formatLabel } from "../../utils/formatters";

type Props = { data: Data; };

const PLAN_META: Record<Tier, { label: string; inspection: InspectionLevel; theme: string; desc: string; riskLevel: number; qualityLevel: number }> = {
  economy: { 
    label: "エコノミー", inspection: "簡易目視検査 (抜き取り)", theme: "emerald",
    desc: "コスト最優先。検査は抜取のみとし、工程内手戻りを許容。", riskLevel: 4, qualityLevel: 2 
  },
  standard: { 
    label: "スタンダード", inspection: "標準全数検査 (作業者のみ)", theme: "blue",
    desc: "標準品質。全数検査により公文書として十分な品質を担保。", riskLevel: 2, qualityLevel: 4 
  },
  premium: { 
    label: "プレミアム", inspection: "二重全数検査 (有資格者による再検)", theme: "rose",
    desc: "品質・管理最優先。二重検査と詳細ログにより監査耐性を保証。", riskLevel: 1, qualityLevel: 5 
  },
};

type CostStructure = {
  fixed: number; variableBase: number; variableAdders: number; qualityCost: number; misc: number; total: number;
};

function analyzeStructure(calc: CalcResult): CostStructure {
  let fixed = 0, variableBase = 0, variableAdders = 0, qualityCost = 0, misc = 0;
  for (const item of calc.lineItems) {
    if (item.kind === "misc") { misc += item.amount; }
    else if (item.kind === "fixed" || ["L1", "L2", "L5"].includes(item.phase)) { fixed += item.amount; }
    else if (item.phase === "L4") { variableAdders += item.amount; }
    else if (item.phase === "L3") {
      const idStr = item.id.replace("L3-", "");
      const bd = calc.unitBreakdowns[idStr];
      if (bd) {
        const baseAmt = bd.base * item.qty;
        const adderAmt = bd.adders * item.qty;
        const qAmt = item.amount - baseAmt - adderAmt;
        variableBase += baseAmt; variableAdders += adderAmt; qualityCost += qAmt;
      } else { variableBase += item.amount; }
    }
  }
  return { fixed, variableBase, variableAdders, qualityCost, misc, total: calc.subtotal };
}

function CostBar({ structure, maxTotal }: { structure: CostStructure; maxTotal: number }) {
  const getPct = (val: number) => (maxTotal > 0 ? (val / maxTotal) * 100 : 0);
  return (
    <div className="w-full">
      <div className="flex h-6 w-full rounded-md overflow-hidden bg-slate-100 ring-1 ring-slate-200/50">
        <div style={{ width: `${getPct(structure.variableBase)}%` }} className="bg-blue-500" title={`基礎変動費: ${fmtJPY(structure.variableBase)}`} />
        <div style={{ width: `${getPct(structure.variableAdders)}%` }} className="bg-cyan-400" title={`仕様・付帯加算: ${fmtJPY(structure.variableAdders)}`} />
        <div style={{ width: `${getPct(structure.qualityCost)}%` }} className="bg-rose-400" title={`品質係数コスト: ${fmtJPY(structure.qualityCost)}`} />
        <div style={{ width: `${getPct(structure.fixed)}%` }} className="bg-slate-500" title={`固定費: ${fmtJPY(structure.fixed)}`} />
        <div style={{ width: `${getPct(structure.misc)}%` }} className="bg-amber-400" title={`実費: ${fmtJPY(structure.misc)}`} />
      </div>
    </div>
  );
}

// 係数内訳詳細テーブル
function DetailBreakdownTable({ item, plans }: { item: WorkItem; plans: any[] }) {
  const breakdowns = plans.map(p => ({
    tier: p.tier, label: p.meta.label,
    bd: computeUnitPrice(p.tier, p.meta.inspection, item) as UnitPriceBreakdown
  }));

  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2 text-xs">
      <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
        <span className="text-lg">🔍</span> 単価積算ロジックの詳細
      </h4>
      <div className="grid grid-cols-3 gap-4">
        {breakdowns.map(b => (
          <div key={b.tier} className="bg-white border rounded p-3 shadow-sm">
            <div className={`font-bold border-b pb-1 mb-2 ${b.tier === "premium" ? "text-rose-700" : b.tier === "standard" ? "text-blue-700" : "text-emerald-700"}`}>
              {b.label}
            </div>
            <div className="space-y-1 font-mono text-[10px]">
              <div className="flex justify-between"><span>Base:</span><span>{fmtJPY(b.bd.base)}</span></div>
              <div className="flex justify-between"><span>Adders:</span><span>+{fmtJPY(b.bd.adders)}</span></div>
              <div className="flex justify-between font-bold bg-slate-100 px-1 rounded">
                <span>Factor:</span><span>x{b.bd.factors.capped.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t mt-1">
                <div className="font-sans font-bold text-slate-500 mb-1">適用係数根拠:</div>
                <ul className="list-disc list-inside text-[9px] text-slate-700">
                  {b.bd.factorDetails.length > 0 ? b.bd.factorDetails.map((r, i) => <li key={i}>{r}</li>) : <li>(標準)</li>}
                </ul>
              </div>
              <div className="pt-2 border-t mt-1 flex justify-between font-bold text-sm">
                <span>単価:</span><span>{fmtJPY(b.bd.unitPrice)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompareView({ data }: Props) {
  const plans = useMemo(() => (["economy", "standard", "premium"] as Tier[]).map(tier => {
    const meta = PLAN_META[tier];
    const simData: Data = { ...data, tier, inspectionLevel: meta.inspection };
    const calc = computeCalc(simData);
    const st = analyzeStructure(calc);
    return { tier, meta, calc, st };
  }), [data]);

  const [eco, std, pre] = plans;
  const maxStructTotal = Math.max(eco.st.total, std.st.total, pre.st.total);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedRows(next);
  };

  // 全アイテム（固定費含む）のリストを作成（ユニークなIDリスト）
  // 比較のため、標準プランのアイテムをベースにするが、プランによってアイテム有無が変わる可能性（あまりないが）も考慮
  // ここではシンプルに workItems と、固定費カテゴリで分類して表示する
  
  return (
    <div className="space-y-10 pb-20 font-sans text-slate-800">
      
      {/* 1. 経営ダッシュボード (維持) */}
      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📊</span> 経営判断用サマリ
        </h2>
        <div className="grid grid-cols-3 gap-6">
          {plans.map(p => {
            const isBase = p.tier === "economy";
            const diff = p.calc.total - eco.calc.total;
            const border = p.tier === "premium" ? "border-rose-400" : p.tier === "standard" ? "border-blue-400" : "border-emerald-400";
            return (
              <div key={p.tier} className={`border-t-4 ${border} bg-white p-4 rounded shadow-sm`}>
                <div className="font-bold text-lg mb-1">{p.meta.label}</div>
                <div className="text-3xl font-black text-slate-900 tracking-tight tabular-nums mb-2">{fmtJPY(p.calc.total)}</div>
                {!isBase && <div className="text-xs font-bold text-rose-600 mb-4">+{fmtJPY(diff)}</div>}
                
                <div className="mb-2">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Cost Structure</span>
                  </div>
                  <CostBar structure={p.st} maxTotal={maxStructTotal} />
                </div>
                <p className="mt-4 text-[10px] text-slate-500 leading-relaxed">{p.meta.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. 全明細 比較テーブル */}
      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span>🔎</span> 全費目 詳細比較</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-2 text-left">費目 / 作業項目</th>
                <th className="p-2 w-16 text-right">数量</th>
                {plans.map(p => <th key={p.tier} className="p-2 w-48 text-right border-l border-slate-600">{p.meta.label} 金額</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* L1, L2, L5, Misc (固定系) */}
              <tr className="bg-slate-100 font-bold"><td colSpan={5} className="p-2">▼ 固定費・実費</td></tr>
              {std.calc.lineItems.filter(li => li.kind !== "work").map(li => {
                 // 各プランから同IDのアイテムを探す（なければ0）
                 const costs = plans.map(p => {
                    const found = p.calc.lineItems.find(x => x.id === li.id);
                    return found ? found.amount : 0;
                 });
                 return (
                   <tr key={li.id} className="hover:bg-slate-50">
                     <td className="p-2 pl-4">{li.name}</td>
                     <td className="p-2 text-right">{li.qty.toLocaleString()}</td>
                     {costs.map((c, i) => <td key={i} className="p-2 text-right border-l border-slate-200 tabular-nums">{fmtJPY(c)}</td>)}
                   </tr>
                 );
              })}

              {/* L3 (変動費) */}
              <tr className="bg-slate-100 font-bold"><td colSpan={5} className="p-2">▼ 変動費 (作業項目)</td></tr>
              {data.workItems.map(w => {
                 const isOpen = expandedRows.has(w.id);
                 const rows = plans.map(p => {
                    const line = p.calc.lineItems.find(li => li.id === `L3-${w.id}`);
                    return line ? { unit: line.unitPrice, amount: line.amount } : { unit: 0, amount: 0 };
                 });

                 return (
                  <>
                   <tr key={w.id} onClick={() => toggleRow(w.id)} className="cursor-pointer hover:bg-yellow-50 transition-colors">
                     <td className="p-2 pl-4 font-bold flex items-center gap-2">
                       <span className="text-slate-400">{isOpen ? "▼" : "▶"}</span> {w.title}
                     </td>
                     <td className="p-2 text-right">{w.qty.toLocaleString()}</td>
                     {rows.map((r, i) => (
                       <td key={i} className="p-2 text-right border-l border-slate-200 tabular-nums">
                         {fmtJPY(r.amount)} <span className="text-[10px] text-slate-400">(@{fmtJPY(r.unit)})</span>
                       </td>
                     ))}
                   </tr>
                   {isOpen && (
                     <tr>
                       <td colSpan={5} className="px-4 pb-4 bg-slate-50 border-b border-slate-200">
                         <DetailBreakdownTable item={w} plans={plans} />
                       </td>
                     </tr>
                   )}
                  </>
                 );
              })}

              {/* Total */}
              <tr className="bg-slate-900 text-white font-bold">
                <td className="p-3">合計 (税抜)</td>
                <td className="p-3"></td>
                {plans.map(p => <td key={p.tier} className="p-3 text-right border-l border-slate-700 text-lg">{fmtJPY(p.calc.subtotal)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}