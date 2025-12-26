import { useMemo, useState } from "react";
import { Data, Tier, InspectionLevel, WorkItem } from "../../types/pricing";
import { computeCalc, CalcResult, computeUnitPrice, UnitPriceBreakdown } from "../../utils/calculations";
import { fmtJPY, sizeLabel, colorModeLabel, dpiLabel } from "../../utils/formatters";

type Props = { data: Data; };

const PLAN_META: Record<Tier, { label: string; inspection: InspectionLevel; theme: string; desc: string; riskLevel: number; qualityLevel: number }> = {
  economy: { 
    label: "エコノミー", inspection: "簡易目視検査 (抜き取り)", theme: "emerald",
    desc: "徹底的なコスト削減プラン。検査は抜取のみ、機材も標準的なものを使用し、リスクを許容します。", riskLevel: 4, qualityLevel: 2 
  },
  standard: { 
    label: "スタンダード", inspection: "標準全数検査 (作業者のみ)", theme: "blue",
    desc: "公文書館等で求められる標準的な品質。全数検査により一定の品質を担保します。", riskLevel: 2, qualityLevel: 4 
  },
  premium: { 
    label: "プレミアム", inspection: "二重全数検査 (有資格者による再検)", theme: "rose",
    desc: "アーカイブ専門業者として推奨する完全なプラン。二重検査、高精細、環境ログ等、全てのリスクを排除します。", riskLevel: 1, qualityLevel: 5 
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

// SVG Pie Chart Component
const SimplePie = ({ st }: { st: CostStructure }) => {
  const total = st.total;
  if (total === 0) return <div className="w-24 h-24 rounded-full bg-slate-100" />;
  
  // Slices: Fixed(Slate), Base(Blue), Quality(Rose), Adders(Cyan), Misc(Amber)
  const slices = [
    { val: st.fixed, color: "#64748b" }, // slate-500
    { val: st.variableBase, color: "#3b82f6" }, // blue-500
    { val: st.qualityCost, color: "#f43f5e" }, // rose-500
    { val: st.variableAdders, color: "#22d3ee" }, // cyan-400
    { val: st.misc, color: "#fbbf24" }, // amber-400
  ];

  let cumulativePercent = 0;
  
  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 32 32" className="transform -rotate-90">
        {slices.map((s, i) => {
          const percent = s.val / total;
          const dash = percent * 100;
          const offset = 100 - cumulativePercent;
          cumulativePercent += dash;
          if (percent === 0) return null;
          return (
            <circle
              key={i}
              r="16" cx="16" cy="16"
              fill="transparent"
              stroke={s.color}
              strokeWidth="32"
              strokeDasharray={`${dash} ${100 - dash}`}
              strokeDashoffset={offset} // Fix offset logic for SVG dasharray
              style={{ strokeDashoffset: 100 - (cumulativePercent - dash) }} // Correct visual stacking
            />
          );
        })}
        {/* Center hole for donut */}
        <circle r="8" cx="16" cy="16" fill="white" />
      </svg>
    </div>
  );
};

// SVG Vertical Bar Chart
const SimpleBarChart = ({ plans, max }: { plans: any[], max: number }) => {
  return (
    <div className="flex items-end justify-between h-32 w-full gap-4 px-4 pb-2 border-b border-slate-200">
      {plans.map(p => {
        const height = (p.calc.total / max) * 100;
        const color = p.tier === "premium" ? "bg-rose-500" : p.tier === "standard" ? "bg-blue-500" : "bg-emerald-500";
        return (
          <div key={p.tier} className="flex flex-col items-center justify-end w-1/3 h-full group relative">
            <div className="text-[10px] font-bold text-slate-600 mb-1">{fmtJPY(p.calc.total)}</div>
            <div style={{ height: `${height}%` }} className={`w-full rounded-t-md transition-all duration-500 ${color} opacity-80 group-hover:opacity-100`} />
            <div className="mt-2 text-xs font-bold text-slate-500">{p.meta.label.split(" ")[0]}</div>
          </div>
        );
      })}
    </div>
  );
};

export function CompareView({ data }: Props) {
  const plans = useMemo(() => (["economy", "standard", "premium"] as Tier[]).map(tier => {
    const meta = PLAN_META[tier];
    const simData: Data = { ...data, tier, inspectionLevel: meta.inspection };
    const calc = computeCalc(simData);
    const st = analyzeStructure(calc);
    return { tier, meta, calc, st };
  }), [data]);

  const maxTotal = Math.max(...plans.map(p => p.calc.total));

  return (
    <div className="space-y-8 pb-20 font-sans text-slate-800">
      
      {/* Row 1: KPI & Total Comparison */}
      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span>📊</span> 経営判断サマリ (Total Cost & Risks)</h2>
          <div className="grid grid-cols-3 gap-4">
            {plans.map(p => (
              <div key={p.tier} className="bg-slate-50 rounded p-3 border border-slate-200">
                <div className={`font-bold text-lg mb-1 ${p.tier==="premium"?"text-rose-700":p.tier==="standard"?"text-blue-700":"text-emerald-700"}`}>
                  {p.meta.label}
                </div>
                <div className="text-xs text-slate-500 mb-2">{p.meta.desc}</div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between"><span>Risk:</span> <span className="font-bold">{p.meta.riskLevel}/5</span></div>
                  <div className="flex justify-between"><span>Qual:</span> <span className="font-bold">{p.meta.qualityLevel}/5</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-4 flex flex-col justify-end">
          <SimpleBarChart plans={plans} max={maxTotal} />
        </div>
      </section>

      {/* Row 2: Cost Structure (Donuts) */}
      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><span>🍩</span> コスト構造分析 (Cost Breakdown)</h2>
          <div className="flex gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500"/>固定費</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"/>基礎</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"/>品質係数</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400"/>加算</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"/>実費</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {plans.map(p => (
            <div key={p.tier} className="flex flex-col items-center">
              <SimplePie st={p.st} />
              <div className="mt-3 text-center">
                <div className="font-bold text-sm">{p.meta.label}</div>
                <div className="text-xs text-slate-500 mt-1">Factor Cost: {fmtJPY(p.st.qualityCost)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Row 3: Detail Table */}
      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span>🔎</span> 変動費 (作業項目) 詳細比較</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-2 text-left">作業項目 / 仕様</th>
                <th className="p-2 w-16 text-right">数量</th>
                {plans.map(p => <th key={p.tier} className="p-2 w-72 text-left border-l border-slate-600">{p.meta.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.workItems.map(w => {
                const rows = plans.map(p => computeUnitPrice(p.tier, p.meta.inspection, w, data));
                return (
                  <tr key={w.id} className="hover:bg-slate-50">
                    <td className="p-3 align-top">
                      <div className="font-bold text-sm">{w.title}</div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {sizeLabel(w.sizeClass)} / {dpiLabel(w.resolution)} / {colorModeLabel(w.colorSpace)}
                      </div>
                    </td>
                    <td className="p-3 text-right align-top font-mono">{w.qty.toLocaleString()}</td>
                    {rows.map((bd, i) => {
                      const p = plans[i];
                      const bg = p.tier==="premium"?"bg-rose-50/50":p.tier==="standard"?"bg-blue-50/50":"bg-emerald-50/50";
                      return (
                        <td key={p.tier} className={`p-3 align-top border-l border-slate-200 ${bg}`}>
                          <div className="flex justify-between items-end mb-2 border-b border-slate-300 pb-1">
                            <span className="font-bold text-lg tabular-nums">{fmtJPY(bd.unitPrice)}</span>
                            <span className="text-[10px] text-slate-500">Base: {bd.base}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-mono mb-2">
                            <div>Factor: x{bd.factors.capped.toFixed(2)}</div>
                            <div>Adders: +{bd.adders}</div>
                          </div>
                          <ul className="list-disc list-inside text-[9px] text-slate-600 leading-tight">
                            {bd.factorDetails.length > 0 ? bd.factorDetails.map((r, idx) => (
                              <li key={idx} className="truncate" title={r}>{r}</li>
                            )) : <li className="text-slate-400">(標準)</li>}
                          </ul>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}