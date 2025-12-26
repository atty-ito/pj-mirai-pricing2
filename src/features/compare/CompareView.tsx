import { useMemo } from "react";
import { Data, Tier, InspectionLevel, WorkItem } from "../../types/pricing";
import { computeCalc, CalcResult, computeUnitPrice, UnitPriceBreakdown } from "../../utils/calculations";
import { fmtJPY, sizeLabel, colorModeLabel, dpiLabel } from "../../utils/formatters";

type Props = { data: Data; };

// ------------------------------------------------------------------
// メタデータ定義
// ------------------------------------------------------------------

const PLAN_META: Record<Tier, { 
  label: string; 
  inspection: InspectionLevel; 
  theme: string; 
  bg: string;
  border: string;
  text: string;
  desc: string; 
  // レーダーチャート用スコア (1-5)
  stats: { quality: number; safety: number; workload: number; price: number };
}> = {
  economy: { 
    label: "Economy", 
    inspection: "簡易目視検査 (抜き取り)", 
    theme: "#10b981", // emerald-500
    bg: "bg-emerald-50", border: "border-emerald-500", text: "text-emerald-700",
    desc: "【ミニマム】検査は抜取のみ。機械処理中心でコストを極限まで抑制。再鑑査リスクは顧客側で負担。",
    stats: { quality: 2, safety: 2, workload: 1, price: 1 }
  },
  standard: { 
    label: "Standard", 
    inspection: "標準全数検査 (作業者のみ)", 
    theme: "#3b82f6", // blue-500
    bg: "bg-blue-50", border: "border-blue-500", text: "text-blue-700",
    desc: "【標準】全数検査を実施し、公文書として通用する品質を担保。バランスの取れた標準プラン。",
    stats: { quality: 3, safety: 4, workload: 3, price: 3 }
  },
  premium: { 
    label: "Premium", 
    inspection: "二重全数検査 (有資格者による再検)", 
    theme: "#f43f5e", // rose-500
    bg: "bg-rose-50", border: "border-rose-500", text: "text-rose-700",
    desc: "【ハイエンド】二重検査・環境ログ・特殊機材。アーカイブ専門業者のノウハウを全投入し、リスクをゼロ化。",
    stats: { quality: 5, safety: 5, workload: 5, price: 5 }
  },
};

// ------------------------------------------------------------------
// ヘルパー: コスト構造分析
// ------------------------------------------------------------------

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

// ------------------------------------------------------------------
// ビジュアライゼーション・コンポーネント
// ------------------------------------------------------------------

// 1. レーダーチャート (SVG)
const RadarChart = ({ stats, color }: { stats: { quality: number; safety: number; workload: number; price: number }, color: string }) => {
  const size = 100;
  const center = size / 2;
  const radius = 35; // 描画半径
  
  // 軸の定義: 上、右、下、左
  // 0: Quality, 1: Workload(右), 2: Price(下), 3: Safety(左)
  // 値を 0~5 で正規化
  const keys = ["quality", "workload", "price", "safety"] as const;
  
  const points = keys.map((k, i) => {
    const angle = (Math.PI / 2) * i - Math.PI / 2; // -90deg start
    const val = stats[k]; 
    const r = (val / 5) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="relative w-full h-32 flex justify-center items-center">
      <svg width="100%" height="100%" viewBox="0 0 100 100" className="overflow-visible">
        {/* Grid Circles */}
        {[1, 2, 3, 4, 5].map(i => (
          <circle key={i} cx={center} cy={center} r={(i / 5) * radius} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
        ))}
        {/* Axes */}
        <line x1={center} y1={center - radius} x2={center} y2={center + radius} stroke="#cbd5e1" strokeWidth="0.5" />
        <line x1={center - radius} y1={center} x2={center + radius} y2={center} stroke="#cbd5e1" strokeWidth="0.5" />
        
        {/* Labels */}
        <text x={center} y={center - radius - 5} textAnchor="middle" fontSize="6" fill="#64748b" fontWeight="bold">品質</text>
        <text x={center + radius + 8} y={center} textAnchor="middle" fontSize="6" fill="#64748b" fontWeight="bold">業務負荷</text>
        <text x={center} y={center + radius + 8} textAnchor="middle" fontSize="6" fill="#64748b" fontWeight="bold">価格</text>
        <text x={center - radius - 8} y={center} textAnchor="middle" fontSize="6" fill="#64748b" fontWeight="bold">安全性</text>

        {/* Data Polygon */}
        <polygon points={points} fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
        
        {/* Points */}
        {keys.map((k, i) => {
          const angle = (Math.PI / 2) * i - Math.PI / 2;
          const val = stats[k];
          const r = (val / 5) * radius;
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);
          return <circle key={k} cx={x} cy={y} r="2" fill={color} />;
        })}
      </svg>
    </div>
  );
};

// 2. スタックバーチャート (横向き)
const StackedBar = ({ st, maxTotal }: { st: CostStructure; maxTotal: number }) => {
  const getPct = (val: number) => (maxTotal > 0 ? (val / maxTotal) * 100 : 0);
  return (
    <div className="w-full">
      <div className="flex h-4 w-full rounded overflow-hidden bg-slate-100 ring-1 ring-slate-200">
        <div style={{ width: `${getPct(st.variableBase)}%` }} className="bg-blue-500" title="基礎コスト" />
        <div style={{ width: `${getPct(st.qualityCost)}%` }} className="bg-rose-500" title="品質・リスク対応コスト" />
        <div style={{ width: `${getPct(st.variableAdders)}%` }} className="bg-cyan-400" title="仕様加算" />
        <div style={{ width: `${getPct(st.fixed)}%` }} className="bg-slate-500" title="固定費" />
        <div style={{ width: `${getPct(st.misc)}%` }} className="bg-amber-400" title="実費" />
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// メインコンポーネント
// ------------------------------------------------------------------

export function CompareView({ data }: Props) {
  const plans = useMemo(() => (["economy", "standard", "premium"] as Tier[]).map(tier => {
    const meta = PLAN_META[tier];
    const simData: Data = { ...data, tier, inspectionLevel: meta.inspection };
    const calc = computeCalc(simData);
    const st = analyzeStructure(calc);
    return { tier, meta, calc, st };
  }), [data]);

  const [eco, std, pre] = plans;
  const maxTotal = Math.max(eco.calc.total, std.calc.total, pre.calc.total);

  return (
    <div className="space-y-12 pb-20 font-sans text-slate-800">
      
      {/* 1. 戦略的プラン比較ボード (Strategic Dashboard) */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="text-2xl">📊</span> プラン別 総合評価・構成比
          </h2>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded border border-slate-200">
            Internal Use Only
          </span>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {plans.map(p => {
            const isBase = p.tier === "economy";
            const diff = p.calc.total - eco.calc.total;
            return (
              <div key={p.tier} className={`flex flex-col h-full bg-white rounded-xl shadow-sm border-t-4 ${p.meta.border} p-5 relative overflow-hidden group hover:shadow-md transition-shadow`}>
                
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className={`text-xl font-black ${p.meta.text}`}>{p.meta.label}</h3>
                    <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Project Cost</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">
                      {fmtJPY(p.calc.total)}
                    </div>
                    {!isBase && <div className="text-xs font-bold text-rose-500">+{fmtJPY(diff)}</div>}
                  </div>
                </div>

                {/* Radar Chart: 業務負荷と品質の可視化 */}
                <div className="mb-4 -mx-4">
                  <RadarChart stats={p.meta.stats} color={p.meta.theme} />
                </div>

                {/* Cost Stack Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Cost Structure</span>
                    <span>Factor Cost: {fmtJPY(p.st.qualityCost)}</span>
                  </div>
                  <StackedBar st={p.st} maxTotal={maxTotal} />
                </div>

                {/* Description */}
                <div className={`mt-auto p-3 rounded-lg text-xs leading-relaxed border ${p.meta.bg} ${p.meta.border} border-opacity-30`}>
                  <span className="font-bold block mb-1">特徴:</span>
                  {p.meta.desc}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. オプション・係数 GAP分析 (Gap Analysis Matrix) */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-end mb-6 border-b border-slate-100 pb-2">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>🔎</span> プラン間 オプション差異分析 (Gap Analysis)
          </h2>
          <div className="text-xs text-slate-500">
            ※ 各プランで適用される仕様・係数の違いを明示
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-3 w-64 rounded-tl-lg">比較項目 / 対象作業</th>
                <th className="p-3 w-20 text-center">単位</th>
                {plans.map(p => (
                  <th key={p.tier} className={`p-3 w-48 border-l border-slate-600 ${p.tier==="premium"?"bg-rose-900":""}`}>
                    {p.meta.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.workItems.map(w => {
                // 各プランの計算結果を取得
                const rows = plans.map(p => computeUnitPrice(p.tier, p.meta.inspection, w, data));
                
                return (
                  <>
                    {/* Item Header */}
                    <tr className="bg-slate-50 font-bold text-slate-700">
                      <td className="p-2 border-l-4 border-slate-400" colSpan={5}>
                        {w.title} <span className="font-normal text-slate-500 ml-2">({sizeLabel(w.sizeClass)} / {colorModeLabel(w.colorSpace)})</span>
                      </td>
                    </tr>

                    {/* GAP: Resolution & Quality */}
                    <tr className="hover:bg-yellow-50">
                      <td className="p-2 pl-6 text-slate-600">① 画質・解像度 (Q係数)</td>
                      <td className="p-2 text-center text-slate-400">-</td>
                      {rows.map((r, i) => {
                        const isHigh = r.factors.q > 1.2;
                        return (
                          <td key={i} className="p-2 border-l border-slate-100">
                            {isHigh ? (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                                <span className="text-lg">◎</span> 高精細 (x{r.factors.q.toFixed(2)})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <span className="text-lg">○</span> 標準
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* GAP: Inspection */}
                    <tr className="hover:bg-yellow-50">
                      <td className="p-2 pl-6 text-slate-600">② 検査・品質保証 (リスク)</td>
                      <td className="p-2 text-center text-slate-400">-</td>
                      {plans.map((p, i) => {
                        const isPre = p.tier === "premium";
                        const isStd = p.tier === "standard";
                        return (
                          <td key={i} className="p-2 border-l border-slate-100">
                            {isPre ? (
                              <span className="text-rose-600 font-bold">二重全数検査 (監査対応)</span>
                            ) : isStd ? (
                              <span className="text-blue-600">全数検査 (標準)</span>
                            ) : (
                              <span className="text-slate-400">抜取検査 (リスク有)</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* GAP: Handling */}
                    <tr className="hover:bg-yellow-50">
                      <td className="p-2 pl-6 text-slate-600">③ 原本保全 (C係数)</td>
                      <td className="p-2 text-center text-slate-400">-</td>
                      {rows.map((r, i) => {
                        const isCare = r.factors.c > 1.0;
                        return (
                          <td key={i} className="p-2 border-l border-slate-100">
                            {isCare ? (
                              <span className="text-rose-600 font-bold">厳格/脆弱対応 (x{r.factors.c.toFixed(2)})</span>
                            ) : (
                              <span className="text-slate-500">標準対応</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Price Result */}
                    <tr className="bg-slate-100 font-bold border-t border-slate-300">
                      <td className="p-2 pl-6 text-slate-800">⇒ 算出単価</td>
                      <td className="p-2 text-center text-slate-500">/ {w.unit}</td>
                      {rows.map((r, i) => (
                        <td key={i} className="p-2 border-l border-white text-lg tabular-nums">
                          {fmtJPY(r.finalUnitPrice)}
                        </td>
                      ))}
                    </tr>
                    
                    {/* Spacer */}
                    <tr><td colSpan={5} className="h-4"></td></tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. コスト凡例 */}
      <div className="flex justify-end gap-6 text-[10px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500 rounded-sm"/> 基礎コスト (Base)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-rose-500 rounded-sm"/> 品質・リスク対応コスト (High Value)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-cyan-400 rounded-sm"/> 仕様加算 (Adders)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-slate-500 rounded-sm"/> 固定費 (Fixed)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-400 rounded-sm"/> 実費 (Misc)</div>
      </div>

    </div>
  );
}