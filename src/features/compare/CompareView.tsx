import { useMemo } from "react";
import { Data, Tier, InspectionLevel, WorkItem } from "../../types/pricing";
import { computeCalc, CalcResult, computeUnitPrice, UnitPriceBreakdown } from "../../utils/calculations";
import { fmtJPY, sizeLabel, colorModeLabel, dpiLabel, formatLabel } from "../../utils/formatters";

type Props = {
  data: Data;
};

// ------------------------------------------------------------------
// 定義・ヘルパー
// ------------------------------------------------------------------

const PLAN_META: Record<Tier, { 
  label: string; 
  inspection: InspectionLevel;
  theme: "emerald" | "blue" | "rose"; 
  desc: string;
  riskLevel: number; // 1(低) - 5(高) ※低いほど安全
  qualityLevel: number; // 1(低) - 5(高)
}> = {
  economy: { 
    label: "エコノミー", 
    inspection: "簡易目視検査 (抜き取り)", 
    theme: "emerald",
    desc: "コスト最優先。検査は抜取のみとし、工程内での手戻りを許容する。",
    riskLevel: 4, 
    qualityLevel: 2 
  },
  standard: { 
    label: "スタンダード", 
    inspection: "標準全数検査 (作業者のみ)", 
    theme: "blue",
    desc: "標準品質。全数検査により公文書として十分な品質を担保する。",
    riskLevel: 2, 
    qualityLevel: 4 
  },
  premium: { 
    label: "プレミアム", 
    inspection: "二重全数検査 (有資格者による再検)", 
    theme: "rose",
    desc: "品質・管理最優先。二重検査と詳細ログにより監査耐性を保証。",
    riskLevel: 1, 
    qualityLevel: 5 
  },
};

type CostStructure = {
  fixed: number;
  base: number;
  adders: number;
  factorCost: number;
  misc: number;
  total: number;
};

function analyzeStructure(calc: CalcResult): CostStructure {
  let fixed = 0, base = 0, adders = 0, factorCost = 0, misc = 0;

  for (const li of calc.lineItems) {
    if (li.kind === "misc") misc += li.amount;
    else if (li.kind === "fixed" || ["L1", "L2", "L5"].includes(li.phase)) fixed += li.amount;
    else if (li.phase === "L4") adders += li.amount; // 付帯処理
    else if (li.phase === "L3") {
      // L3の内訳分解
      const id = li.id.replace("L3-", "");
      const bd = calc.unitBreakdowns[id];
      if (bd) {
        const b = bd.base * li.qty;
        const a = (bd.sizeAdder + bd.formatAdder) * li.qty;
        const f = li.amount - b - a; // 残りが係数コスト
        base += b;
        adders += a;
        factorCost += f;
      } else {
        base += li.amount;
      }
    }
  }
  return { fixed, base, adders, factorCost, misc, total: calc.subtotal };
}

// ------------------------------------------------------------------
// サブコンポーネント
// ------------------------------------------------------------------

// リスク・品質メーター
function LevelMeter({ level, type, theme }: { level: number, type: "Risk" | "Quality", theme: string }) {
  const max = 5;
  const isRisk = type === "Risk";
  const label = isRisk ? "リスク残存率" : "品質保証レベル";
  
  // Riskは低いほど良い(緑)、高いほど悪い(赤)
  // Qualityは高いほど良い(青/赤)、低いほど悪い(グレー)
  
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <div className="w-16 font-bold text-slate-500 text-right">{label}</div>
      <div className="flex gap-0.5">
        {[...Array(max)].map((_, i) => {
          const active = i < level;
          let bg = "bg-slate-200";
          if (active) {
            if (isRisk) bg = i < 2 ? "bg-emerald-400" : i < 3 ? "bg-yellow-400" : "bg-rose-500";
            else bg = theme === "rose" ? "bg-rose-500" : theme === "blue" ? "bg-blue-500" : "bg-emerald-500";
          }
          return <div key={i} className={`h-2 w-3 rounded-sm ${bg}`} />;
        })}
      </div>
    </div>
  );
}

// コスト構造バー
function CostStructureBar({ st, max }: { st: CostStructure; max: number }) {
  const pct = (v: number) => (max > 0 ? (v / max) * 100 : 0);
  return (
    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex ring-1 ring-slate-200">
      <div style={{ width: `${pct(st.base)}%` }} className="bg-slate-400" title={`基礎単価: ${fmtJPY(st.base)}`} />
      <div style={{ width: `${pct(st.adders)}%` }} className="bg-sky-400" title={`仕様加算: ${fmtJPY(st.adders)}`} />
      <div style={{ width: `${pct(st.factorCost)}%` }} className="bg-indigo-500" title={`係数コスト: ${fmtJPY(st.factorCost)}`} />
      <div style={{ width: `${pct(st.fixed)}%` }} className="bg-amber-400" title={`固定費: ${fmtJPY(st.fixed)}`} />
      <div style={{ width: `${pct(st.misc)}%` }} className="bg-slate-600" title={`実費: ${fmtJPY(st.misc)}`} />
    </div>
  );
}

// 係数バッジ
function FactorBadge({ label, val }: { label: string; val: number }) {
  const isHigh = val > 1.0;
  return (
    <span className={`inline-flex items-center px-1 rounded text-[9px] font-mono border ${isHigh ? "bg-white border-slate-300 text-slate-700 font-bold" : "bg-slate-50 border-slate-100 text-slate-400"}`}>
      {label}:{val.toFixed(2)}
    </span>
  );
}

// ------------------------------------------------------------------
// メインコンポーネント
// ------------------------------------------------------------------

export function CompareView({ data }: Props) {
  const plans = useMemo(() => {
    return (["economy", "standard", "premium"] as Tier[]).map((tier) => {
      const meta = PLAN_META[tier];
      // 比較用に強制設定して計算
      const simData: Data = { ...data, tier, inspectionLevel: meta.inspection };
      const calc = computeCalc(simData);
      const st = analyzeStructure(calc);
      return { tier, meta, calc, st };
    });
  }, [data]);

  const [eco, std, pre] = plans;
  const maxTotal = Math.max(eco.calc.total, std.calc.total, pre.calc.total);
  const maxStTotal = Math.max(eco.st.total, std.st.total, pre.st.total);

  return (
    <div className="space-y-8 pb-20 font-sans text-slate-800">
      
      {/* 1. 経営サマリ (Dashboard) */}
      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">プラン別 総合評価サマリ</h2>
            <p className="text-xs text-slate-500">コスト・品質・リスクのトレードオフ分析（内部検討用）</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isBase = p.tier === "economy";
            const diff = p.calc.total - eco.calc.total;
            const diffPct = eco.calc.total > 0 ? (diff / eco.calc.total) * 100 : 0;
            const borderColor = p.tier === "premium" ? "border-rose-300" : p.tier === "standard" ? "border-blue-300" : "border-emerald-300";
            
            return (
              <div key={p.tier} className={`relative p-5 rounded-xl border-2 bg-white shadow-sm hover:shadow-md transition-shadow ${borderColor}`}>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className={`text-lg font-black tracking-tight ${p.meta.theme === "rose" ? "text-rose-700" : p.meta.theme === "blue" ? "text-blue-700" : "text-emerald-700"}`}>
                      {p.meta.label}
                    </h3>
                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">{p.meta.inspection.split(" ")[0]}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter">
                      {fmtJPY(p.calc.total)}
                    </div>
                    {!isBase && (
                      <div className="text-xs font-bold text-rose-600">
                        +{fmtJPY(diff)} ({diffPct.toFixed(0)}%)
                      </div>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <LevelMeter level={p.meta.riskLevel} type="Risk" theme={p.meta.theme} />
                  <LevelMeter level={p.meta.qualityLevel} type="Quality" theme={p.meta.theme} />
                </div>

                {/* Cost Structure Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Cost Structure</span>
                    <span>固定費率: {((p.st.fixed / p.st.total) * 100).toFixed(0)}%</span>
                  </div>
                  <CostStructureBar st={p.st} max={maxStTotal} />
                </div>

                <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {p.meta.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. 明細比較テーブル (Detail Breakdown) */}
      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>🔎</span> 明細別コスト構造・係数分析
          </h2>
          <div className="text-xs text-slate-500 flex gap-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-400 rounded-full"/> 基礎</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-sky-400 rounded-full"/> 仕様</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500 rounded-full"/> 係数(Quality)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-3 w-64 rounded-tl-lg">作業項目 / プラン</th>
                <th className="p-3 w-20 text-right">数量</th>
                <th className="p-3 w-24 text-right">単価</th>
                <th className="p-3 w-32 text-right">金額</th>
                <th className="p-3">単価構造 (Base + Adder + Factor) & 係数内訳 (C/Q/P/I/K)</th>
                <th className="p-3 w-16 text-center rounded-tr-lg">上限</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 border-x border-b border-slate-200">
              {data.workItems.map((w) => {
                // 行ごとの3プラン計算
                const rows = plans.map(p => {
                  const bd = computeUnitPrice(p.tier, p.meta.inspection, w, data);
                  return { p, bd, amount: bd.finalUnitPrice * w.qty };
                });
                
                // グラフ用の最大単価
                const maxPrice = Math.max(...rows.map(r => r.bd.finalUnitPrice));

                return (
                  <tr key={w.id} className="group hover:bg-slate-50 transition-colors">
                    {/* 作業項目名 (RowSpan的に表示するため、最初のプラン行でセル結合風に見せる工夫もできるが、今回はグリッドレイアウトで制御) */}
                    <td colSpan={6} className="p-0">
                      <div className="border-t border-slate-200">
                        {/* 項目ヘッダー行 */}
                        <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800 flex justify-between items-center">
                          <span>{w.title}</span>
                          <span className="text-[10px] font-normal text-slate-500">
                            {sizeLabel(w.sizeClass)} / {dpiLabel(w.resolution)} / {colorModeLabel(w.colorSpace)} / {w.fileFormats.join(",")}
                          </span>
                        </div>
                        
                        {/* プランごとの詳細行 */}
                        {rows.map((r, idx) => {
                          const { p, bd, amount } = r;
                          // 構成比
                          const pctBase = (bd.base / maxPrice) * 100;
                          const pctAdder = ((bd.sizeAdder + bd.formatAdder) / maxPrice) * 100;
                          const pctFactor = ((bd.unitPrice - bd.base - bd.sizeAdder - bd.formatAdder) / maxPrice) * 100;
                          
                          // 背景色
                          const rowBg = p.tier === "premium" ? "bg-rose-50/30" : p.tier === "standard" ? "bg-blue-50/30" : "bg-emerald-50/30";
                          const labelColor = p.tier === "premium" ? "text-rose-700" : p.tier === "standard" ? "text-blue-700" : "text-emerald-700";

                          return (
                            <div key={p.tier} className={`flex items-center border-b border-slate-100 last:border-0 ${rowBg} py-2`}>
                              {/* プラン名 */}
                              <div className={`w-64 px-3 font-bold ${labelColor} flex items-center gap-2`}>
                                <div className={`w-2 h-2 rounded-full ${p.tier === "premium" ? "bg-rose-500" : p.tier === "standard" ? "bg-blue-500" : "bg-emerald-500"}`} />
                                {p.meta.label}
                              </div>
                              
                              {/* 数量 */}
                              <div className="w-20 px-3 text-right text-slate-500 tabular-nums">
                                {idx === 0 ? w.qty.toLocaleString() : "〃"}
                              </div>

                              {/* 単価 */}
                              <div className="w-24 px-3 text-right font-bold tabular-nums">
                                {fmtJPY(bd.unitPrice)}
                              </div>

                              {/* 金額 */}
                              <div className="w-32 px-3 text-right font-bold tabular-nums text-slate-800">
                                {fmtJPY(amount)}
                              </div>

                              {/* グラフ & 係数詳細 */}
                              <div className="flex-1 px-3">
                                {/* Bar */}
                                <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden flex mb-1.5">
                                  <div style={{ width: `${pctBase}%` }} className="bg-slate-400" />
                                  <div style={{ width: `${pctAdder}%` }} className="bg-sky-400" />
                                  <div style={{ width: `${pctFactor}%` }} className="bg-indigo-500" />
                                </div>
                                {/* Factors */}
                                <div className="flex gap-1.5 opacity-80">
                                  <FactorBadge label="C" val={bd.factors.c} />
                                  <FactorBadge label="Q" val={bd.factors.q} />
                                  <FactorBadge label="P" val={bd.factors.p} />
                                  <FactorBadge label="I" val={bd.factors.i} />
                                  <FactorBadge label="K" val={bd.factors.k} />
                                  <span className="text-[9px] text-slate-400 ml-1">
                                    Raw:{bd.factors.raw.toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {/* シーリング警告 */}
                              <div className="w-16 px-3 text-center">
                                {bd.factors.raw > bd.factors.capped && (
                                  <span className="text-[10px] font-bold text-white bg-rose-500 px-1.5 py-0.5 rounded" title={`上限適用: Raw ${bd.factors.raw.toFixed(2)} -> Cap ${bd.factors.capped}`}>
                                    CAP
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 text-right">
          ※ 係数記号: C(Condition/原本), Q(Quality/品質), P(Process/工程), I(Interaction/複合), K(K_load/繁忙)
        </div>
      </section>
    </div>
  );
}