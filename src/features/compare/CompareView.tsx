import { useMemo, useState } from "react";
import { Data, Tier, InspectionLevel, WorkItem } from "../../types/pricing";
import { computeCalc, CalcResult, LineItem, computeUnitPrice, UnitPriceBreakdown } from "../../utils/calculations";
import { fmtJPY, inspectionLabel, sizeLabel, colorModeLabel, dpiLabel, formatLabel } from "../../utils/formatters";

type Props = {
  data: Data;
};

// 比較用のプラン設定
const PLAN_SPECS: Record<Tier, { inspection: InspectionLevel; label: string; desc: string; risk: string; color: string; bg: string; border: string }> = {
  economy: { 
    inspection: "簡易目視検査 (抜き取り)", 
    label: "エコノミー", 
    desc: "価格重視。工程を簡素化し、抜取検査でコストを抑制。",
    risk: "手戻り・納品後の微修正リスクを許容できる場合に推奨。",
    color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200"
  },
  standard: { 
    inspection: "標準全数検査 (作業者のみ)", 
    label: "スタンダード", 
    desc: "標準品質。基本工程と全数検査で品質を担保。",
    risk: "公文書として十分な品質。文字可読性や順序を保証する。",
    color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200"
  },
  premium: { 
    inspection: "二重全数検査 (有資格者による再検)", 
    label: "プレミアム", 
    desc: "品質最優先。二重検査と厳格な管理で完全性を追求。",
    risk: "重要文化財・機密文書向け。監査に耐えうる証跡を残す。",
    color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200"
  },
};

// コスト構造（分析用）
type CostStructure = {
  fixed: number;       // L1, L2, L5 (固定費)
  variableBase: number; // L3 Base * Qty
  variableAdders: number; // L3 (Size + Format) * Qty
  qualityCost: number; // L3 Factor増分 (UnitPrice - Base - Adders) * Qty
  misc: number;        // Misc
  total: number;
};

// 分析ロジック（CQPIK対応版）
function analyzeStructure(calc: CalcResult): CostStructure {
  let fixed = 0;
  let variableBase = 0;
  let variableAdders = 0;
  let qualityCost = 0;
  let misc = 0;

  for (const item of calc.lineItems) {
    if (item.kind === "misc") {
      misc += item.amount;
    } else if (item.kind === "fixed" || item.phase === "L1" || item.phase === "L2" || item.phase === "L5") {
      fixed += item.amount;
    } else if (item.phase === "L4") {
      // L4（OCRなどの付帯処理）は品質・仕様コストの一部とみなす
      variableAdders += item.amount;
    } else if (item.phase === "L3") {
      // L3項目の内訳分解
      const idStr = item.id.replace("L3-", ""); // ID抽出
      const bd = calc.unitBreakdowns[idStr];
      if (bd) {
        // Base分
        const baseAmt = bd.base * item.qty;
        // Adder分
        const adderAmt = (bd.sizeAdder + bd.formatAdder) * item.qty;
        // Quality(Factor)分 = 全体 - Base - Adder
        const qAmt = item.amount - baseAmt - adderAmt;

        variableBase += baseAmt;
        variableAdders += adderAmt;
        qualityCost += qAmt;
      } else {
        // 内訳不明な場合は全額Baseへ（異常系）
        variableBase += item.amount;
      }
    }
  }

  return { fixed, variableBase, variableAdders, qualityCost, misc, total: calc.subtotal };
}

// ------------------------------------------------------------------
// サブコンポーネント
// ------------------------------------------------------------------

function CostBar({ structure, maxTotal }: { structure: CostStructure; maxTotal: number }) {
  const getPct = (val: number) => (maxTotal > 0 ? (val / maxTotal) * 100 : 0);
  
  return (
    <div className="w-full">
      <div className="flex h-4 w-full rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200/50">
        <div style={{ width: `${getPct(structure.variableBase)}%` }} className="bg-blue-500" title="基礎変動費" />
        <div style={{ width: `${getPct(structure.variableAdders)}%` }} className="bg-cyan-400" title="仕様・付帯加算" />
        <div style={{ width: `${getPct(structure.qualityCost)}%` }} className="bg-rose-400" title="品質係数コスト" />
        <div style={{ width: `${getPct(structure.fixed)}%` }} className="bg-slate-500" title="固定費" />
        <div style={{ width: `${getPct(structure.misc)}%` }} className="bg-amber-400" title="実費" />
      </div>
    </div>
  );
}

// 詳細内訳テーブル（展開用）
function DetailBreakdownTable({ item, plans }: { item: WorkItem; plans: any[] }) {
  const breakdowns = plans.map(p => ({
    tier: p.tier,
    label: p.spec.label,
    bd: computeUnitPrice(p.tier, p.spec.inspection, item) as UnitPriceBreakdown
  }));

  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2 text-xs">
      <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
        <span className="text-lg">🔍</span> 単価積算ロジックの詳細比較
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse bg-white rounded shadow-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
              <th className="p-2 w-32">費目</th>
              <th className="p-2">内容</th>
              {breakdowns.map(b => (
                <th key={b.tier} className="p-2 text-right w-24 font-bold text-slate-700">{b.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="bg-blue-50/10">
              <td className="p-2 font-mono text-slate-500">Base</td>
              <td className="p-2 text-slate-600">基礎単価</td>
              {breakdowns.map(b => <td key={b.tier} className="p-2 text-right font-bold text-blue-700">{fmtJPY(b.bd.base)}</td>)}
            </tr>
            <tr>
              <td className="p-2 font-mono text-slate-500">Adders</td>
              <td className="p-2 text-slate-600">サイズ・形式加算</td>
              {breakdowns.map(b => <td key={b.tier} className="p-2 text-right text-slate-500">{fmtJPY(b.bd.sizeAdder + b.bd.formatAdder)}</td>)}
            </tr>
            <tr className="bg-rose-50/20">
              <td className="p-2 font-mono text-rose-600">Factor</td>
              <td className="p-2 text-slate-600">適用係数 (CQPIK)</td>
              {breakdowns.map(b => (
                <td key={b.tier} className="p-2 text-right font-bold text-rose-600">x{b.bd.factors.capped.toFixed(2)}</td>
              ))}
            </tr>
            <tr className="bg-slate-800 text-white font-bold border-t-2 border-slate-300">
              <td className="p-2">Total</td>
              <td className="p-2 text-slate-300 text-[10px]">最終単価</td>
              {breakdowns.map(b => <td key={b.tier} className="p-2 text-right text-sm">{fmtJPY(b.bd.unitPrice)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// メインコンポーネント
// ------------------------------------------------------------------

export function CompareView({ data }: Props) {
  const plans = useMemo(() => {
    return (["economy", "standard", "premium"] as Tier[]).map((tier) => {
      const spec = PLAN_SPECS[tier];
      const simData: Data = { ...data, tier, inspectionLevel: spec.inspection };
      const calc = computeCalc(simData);
      const structure = analyzeStructure(calc);
      return { tier, spec, calc, structure };
    });
  }, [data]);

  const [eco, std, pre] = plans;
  const maxStructTotal = Math.max(eco.structure.total, std.structure.total, pre.structure.total);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedRows(next);
  };

  return (
    <div className="space-y-10 pb-20 font-sans text-slate-800">
      
      {/* 1. 経営判断用サマリ */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-slate-900">1. 総合比較サマリ（経営判断用）</h2>
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded border border-yellow-200">
            社外秘
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isBase = p.tier === "economy";
            const diff = p.calc.total - eco.calc.total;
            return (
              <div key={p.tier} className={`rounded-xl border-2 p-5 bg-white shadow-sm relative overflow-hidden ${p.spec.border}`}>
                <div className={`absolute top-0 left-0 w-full h-1 ${p.tier === 'premium' ? 'bg-rose-500' : p.tier === 'standard' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className={`text-lg font-bold ${p.spec.color}`}>{p.spec.label}</h3>
                </div>
                <div className="text-xs text-slate-500 font-bold mb-2">{p.spec.inspection}</div>

                <div className="mb-4">
                  <div className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                    {fmtJPY(p.calc.total)}
                  </div>
                  <div className="text-xs font-bold mt-1 flex justify-between">
                    <span className="text-slate-400">{isBase ? "基準プラン" : `${fmtJPY(diff)} 増`}</span>
                    <span className="text-slate-500">(税込)</span>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Risk & Scope</div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">{p.spec.risk}</p>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</div>
                    <p className="text-xs text-slate-500 leading-relaxed">{p.spec.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. コスト構造分析 */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex justify-between items-end mb-6 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">2. コスト構造の分解（CQPIK要因分析）</h2>
            <p className="text-xs text-slate-500 mt-1">
              見積金額（税抜）を「固定費」「基礎」「仕様加算」「品質係数コスト」に分解。
            </p>
          </div>
          <div className="flex gap-4 text-[10px] text-slate-600">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-500 rounded-sm"/>基礎工程(Base)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-cyan-400 rounded-sm"/>仕様加算(Adder)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-rose-400 rounded-sm"/>品質係数(Factor)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-500 rounded-sm"/>固定費(Fixed)</div>
          </div>
        </div>

        <div className="space-y-6">
          {plans.map((p) => (
            <div key={p.tier} className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-2 text-right">
                <div className={`font-bold text-sm ${p.spec.color}`}>{p.spec.label}</div>
                <div className="text-[10px] text-slate-400">Total: {fmtJPY(p.structure.total)}</div>
              </div>
              <div className="col-span-10">
                <CostBar structure={p.structure} maxTotal={maxStructTotal} />
                <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-mono px-1">
                  <span>Factor Cost: {fmtJPY(p.structure.qualityCost)}</span>
                  <span>Fixed: {fmtJPY(p.structure.fixed)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. 詳細明細比較 */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">3. 作業項目別 明細比較（L3）</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-300">
                <th className="py-2 px-4 w-10"></th>
                <th className="py-2 px-3">作業項目</th>
                <th className="py-2 px-2 text-right">数量</th>
                <th className="py-2 px-2 text-right bg-emerald-50 text-emerald-800 border-l border-white">Eco 単価</th>
                <th className="py-2 px-2 text-right bg-blue-50 text-blue-800 border-l border-white">Std 単価</th>
                <th className="py-2 px-2 text-right bg-rose-50 text-rose-800 border-l border-white">Pre 単価</th>
                <th className="py-2 px-2 text-right bg-emerald-50 text-emerald-800 border-l border-white">Eco 総額</th>
                <th className="py-2 px-2 text-right bg-blue-50 text-blue-800 border-l border-white">Std 総額</th>
                <th className="py-2 px-2 text-right bg-rose-50 text-rose-800 border-l border-white">Pre 総額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.workItems.map((w) => {
                const isOpen = expandedRows.has(w.id);
                const rows = plans.map(p => {
                  const bd = computeUnitPrice(p.tier, p.spec.inspection, w);
                  return { unitPrice: bd.finalUnitPrice, amount: bd.finalUnitPrice * w.qty };
                });

                return (
                  <>
                    <tr 
                      key={w.id} 
                      onClick={() => toggleRow(w.id)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${isOpen ? "bg-slate-50" : ""}`}
                    >
                      <td className="py-2 px-4 text-center text-slate-400">{isOpen ? "▼" : "▶"}</td>
                      <td className="py-2 px-3 align-top">
                        <div className="font-bold text-slate-800">{w.title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {sizeLabel(w.sizeClass)} / {colorModeLabel(w.colorMode)} / {dpiLabel(w.resolution)}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-slate-600 align-top">
                        {w.qty.toLocaleString()}<span className="text-[10px] ml-0.5">{w.unit}</span>
                      </td>
                      
                      {/* 単価 */}
                      <td className="py-2 px-2 text-right tabular-nums border-l border-slate-100 bg-emerald-50/10 align-top">{fmtJPY(rows[0].unitPrice)}</td>
                      <td className="py-2 px-2 text-right tabular-nums border-l border-slate-100 bg-blue-50/10 font-bold align-top">{fmtJPY(rows[1].unitPrice)}</td>
                      <td className="py-2 px-2 text-right tabular-nums border-l border-slate-100 bg-rose-50/10 align-top">{fmtJPY(rows[2].unitPrice)}</td>

                      {/* 金額 */}
                      <td className="py-2 px-2 text-right tabular-nums border-l border-slate-100 text-slate-500 align-top">{fmtJPY(rows[0].amount)}</td>
                      <td className="py-2 px-2 text-right tabular-nums border-l border-slate-100 text-slate-900 font-bold align-top">{fmtJPY(rows[1].amount)}</td>
                      <td className="py-2 px-2 text-right tabular-nums border-l border-slate-100 text-slate-500 align-top">{fmtJPY(rows[2].amount)}</td>
                    </tr>
                    
                    {/* 詳細展開エリア */}
                    {isOpen && (
                      <tr>
                        <td colSpan={9} className="px-4 pb-4 bg-slate-50 border-b border-slate-200">
                          <DetailBreakdownTable item={w} plans={plans} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}