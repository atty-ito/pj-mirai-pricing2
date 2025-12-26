import { useMemo } from "react";
import { Data, Tier, InspectionLevel, WorkItem } from "../../types/pricing";
import { computeCalc, CalcResult, computeUnitPrice, UnitPriceBreakdown, LineItem } from "../../utils/calculations";
import { fmtJPY, sizeLabel, colorModeLabel, dpiLabel } from "../../utils/formatters";

type Props = { data: Data; };

const PLAN_META: Record<Tier, { label: string; inspection: InspectionLevel; theme: string; desc: string; riskLevel: number; qualityLevel: number }> = {
  economy: { 
    label: "エコノミー (最低限)", inspection: "簡易目視検査 (抜き取り)", theme: "emerald",
    desc: "徹底的なコスト削減プラン。検査は抜取のみ、機材も標準的なものを使用し、リスクを許容します。", riskLevel: 4, qualityLevel: 2 
  },
  standard: { 
    label: "スタンダード (標準)", inspection: "標準全数検査 (作業者のみ)", theme: "blue",
    desc: "公文書館等で求められる標準的な品質。全数検査により一定の品質を担保します。", riskLevel: 2, qualityLevel: 4 
  },
  premium: { 
    label: "プレミアム (理想形)", inspection: "二重全数検査 (有資格者による再検)", theme: "rose",
    desc: "アーカイブ専門業者として推奨する完全なプラン。二重検査、高精細、環境ログ等、全てのリスクを排除します。", riskLevel: 1, qualityLevel: 5 
  },
};

export function CompareView({ data }: Props) {
  const plans = useMemo(() => (["economy", "standard", "premium"] as Tier[]).map(tier => {
    const meta = PLAN_META[tier];
    // Premiumなら強制的に高品質設定で試算するロジックがCoreに入っているため、ここではTierを渡すだけでOK
    const simData: Data = { ...data, tier, inspectionLevel: meta.inspection };
    const calc = computeCalc(simData);
    return { tier, meta, calc };
  }), [data]);

  const [eco, std, pre] = plans;

  return (
    <div className="space-y-8 pb-20 font-sans text-slate-800">
      
      {/* 1. 経営ダッシュボード */}
      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span>📊</span> 3プラン比較サマリ</h2>
        <div className="grid grid-cols-3 gap-6">
          {plans.map(p => {
            const isBase = p.tier === "economy";
            const diff = p.calc.total - eco.calc.total;
            const border = p.tier === "premium" ? "border-rose-400 bg-rose-50/20" : p.tier === "standard" ? "border-blue-400 bg-blue-50/20" : "border-emerald-400 bg-emerald-50/20";
            return (
              <div key={p.tier} className={`border-t-4 ${border} p-4 rounded shadow-sm`}>
                <div className="font-bold text-lg mb-1">{p.meta.label}</div>
                <div className="text-3xl font-black text-slate-900 tracking-tight tabular-nums mb-2">{fmtJPY(p.calc.total)}</div>
                {!isBase && <div className="text-xs font-bold text-rose-600 mb-4">+{fmtJPY(diff)}</div>}
                <p className="mt-4 text-[10px] text-slate-500 leading-relaxed">{p.meta.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. 変動費 詳細比較 (作業項目) */}
      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span>🔎</span> 変動費 (作業項目) の詳細内訳</h2>
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
                          
                          {/* 係数内訳 (常時表示) */}
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-mono mb-2">
                            <div>Factor: x{bd.factors.capped.toFixed(2)}</div>
                            <div>Adders: +{bd.adders}</div>
                          </div>
                          
                          {/* 理由リスト (常時表示) */}
                          <ul className="list-disc list-inside text-[9px] text-slate-600 leading-tight">
                            {bd.factorDetails.length > 0 ? bd.factorDetails.map((r, idx) => (
                              <li key={idx} className="truncate" title={r}>{r}</li>
                            )) : <li className="text-slate-400">(標準仕様)</li>}
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

      {/* 3. 固定費・実費 詳細比較 */}
      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span>🔩</span> 固定費・実費 の詳細内訳</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="p-2 text-left">費目</th>
                <th className="p-2 w-16 text-right">数量</th>
                {plans.map(p => <th key={p.tier} className="p-2 w-32 text-right border-l border-slate-500">{p.meta.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Stdプランのアイテムをベースに全列挙 */}
              {std.calc.lineItems.filter(li => li.kind !== "work").map(li => {
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
              
              {/* Total Row */}
              <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-600">
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