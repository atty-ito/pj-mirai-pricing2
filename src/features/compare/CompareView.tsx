import { useMemo, useState } from "react";
import { Data, Tier, InspectionLevel, WorkItem } from "../../types/pricing";
import { computeCalc, CalcResult, computeUnitPrice, UnitPriceBreakdown } from "../../utils/calculations";
import { fmtJPY, inspectionLabel, sizeLabel, colorModeLabel, dpiLabel, formatLabel } from "../../utils/formatters";
import { PROJECT_FIXED_FEES, TIER_BASE_PER_UNIT, INSPECTION_MULTIPLIER } from "../../constants/coefficients";

type Props = {
  data: Data;
};

// ------------------------------------------------------------------
// 定義・型
// ------------------------------------------------------------------

// プラン定義（経営判断用）
const PLAN_SPECS: Record<Tier, { inspection: InspectionLevel; label: string; desc: string; risk: string; color: string; bg: string; border: string }> = {
  economy: { 
    inspection: "sample", 
    label: "エコノミー", 
    desc: "価格重視。工程を簡素化し、抜取検査でコストを抑制。",
    risk: "手戻り・納品後の微修正リスクを許容できる場合に推奨。",
    color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200"
  },
  standard: { 
    inspection: "full", 
    label: "スタンダード", 
    desc: "標準品質。NDL準拠の工程と全数検査で品質を担保。",
    risk: "公文書として十分な品質。文字可読性や順序を保証する。",
    color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200"
  },
  premium: { 
    inspection: "double_full", 
    label: "プレミアム", 
    desc: "品質最優先。二重検査と厳格な管理で完全性を追求。",
    risk: "重要文化財・機密文書向け。監査に耐えうる証跡を残す。",
    color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200"
  },
};

// コスト構造（分析用）
type CostStructure = {
  fixed: number;            // 案件固定費
  variableBase: number;     // 基礎単価分
  variableSpecs: number;    // 仕様加算分
  inspectionCost: number;   // 検査コスト
  misc: number;             // 実費
  total: number;
};

// 分析ロジック
function analyzeStructure(calc: CalcResult, tier: Tier, data: Data): CostStructure {
  const fixed = PROJECT_FIXED_FEES[tier].setup + PROJECT_FIXED_FEES[tier].management;
  let variableBase = 0;
  let variableSpecs = 0;
  let inspectionCost = 0;

  for (const w of data.workItems) {
    const bd = calc.unitBreakdowns[w.id];
    if (!bd) continue;
    const qty = w.qty;
    variableBase += bd.base * qty;
    variableSpecs += (bd.subtotal - bd.base) * qty;
    inspectionCost += (bd.finalUnitPrice - bd.subtotal) * qty;
  }

  const misc = calc.lineItems
    .filter(x => x.kind === "misc" || x.kind === "addon")
    .reduce((a, b) => a + b.amount, 0);

  return { fixed, variableBase, variableSpecs, inspectionCost, misc, total: calc.subtotal };
}

// ------------------------------------------------------------------
// サブコンポーネント
// ------------------------------------------------------------------

// 1. 積み上げ棒グラフ（コスト構造）
function CostBar({ structure, maxTotal }: { structure: CostStructure; maxTotal: number }) {
  const getPct = (val: number) => (maxTotal > 0 ? (val / maxTotal) * 100 : 0);
  
  return (
    <div className="w-full">
      <div className="flex h-4 w-full rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200/50">
        <div style={{ width: `${getPct(structure.variableBase)}%` }} className="bg-blue-500" title="基礎変動費" />
        <div style={{ width: `${getPct(structure.variableSpecs)}%` }} className="bg-cyan-400" title="仕様加算" />
        <div style={{ width: `${getPct(structure.inspectionCost)}%` }} className="bg-rose-400" title="検査品質コスト" />
        <div style={{ width: `${getPct(structure.fixed)}%` }} className="bg-slate-500" title="固定費" />
        <div style={{ width: `${getPct(structure.misc)}%` }} className="bg-amber-400" title="実費" />
      </div>
    </div>
  );
}

// 2. 詳細内訳テーブル（展開用）
function DetailBreakdownTable({ item, plans }: { item: WorkItem; plans: any[] }) {
  // 各プランの単価内訳を取得
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
              <th className="p-2 w-32">費目 (コード)</th>
              <th className="p-2">内容</th>
              {breakdowns.map(b => (
                <th key={b.tier} className="p-2 text-right w-24 font-bold text-slate-700">{b.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* L0 基礎単価 */}
            <tr className="bg-blue-50/10">
              <td className="p-2 font-mono text-slate-500">L0 基礎単価</td>
              <td className="p-2 text-slate-600">プランごとの基本工程費</td>
              {breakdowns.map(b => (
                <td key={b.tier} className="p-2 text-right font-bold text-blue-700">{fmtJPY(b.bd.base)}</td>
              ))}
            </tr>
            {/* 仕様加算 (共通) */}
            <tr>
              <td className="p-2 font-mono text-slate-500">L1 サイズ</td>
              <td className="p-2 text-slate-600">{sizeLabel(item.sizeClass)}</td>
              {breakdowns.map(b => <td key={b.tier} className="p-2 text-right text-slate-500">{fmtJPY(b.bd.size)}</td>)}
            </tr>
            <tr>
              <td className="p-2 font-mono text-slate-500">L2〜L7 仕様</td>
              <td className="p-2 text-slate-600">色・DPI・OCR・メタデータ等</td>
              {breakdowns.map(b => (
                <td key={b.tier} className="p-2 text-right text-slate-500">
                  {fmtJPY(b.bd.color + b.bd.dpi + b.bd.formats + b.bd.ocr + b.bd.metadata + b.bd.handling)}
                </td>
              ))}
            </tr>
            {/* 小計 */}
            <tr className="bg-slate-50 font-bold border-t border-slate-200">
              <td className="p-2 text-slate-700">小計 (検査前)</td>
              <td className="p-2 text-slate-400 text-[10px]">基礎 + 仕様加算</td>
              {breakdowns.map(b => <td key={b.tier} className="p-2 text-right">{fmtJPY(b.bd.subtotal)}</td>)}
            </tr>
            {/* 検査係数 */}
            <tr className="bg-rose-50/20">
              <td className="p-2 font-mono text-rose-600">M1 検査係数</td>
              <td className="p-2 text-slate-600">品質保証コスト（倍率）</td>
              {breakdowns.map(b => (
                <td key={b.tier} className="p-2 text-right font-bold text-rose-600">x{b.bd.inspectionMultiplier.toFixed(2)}</td>
              ))}
            </tr>
            {/* 最終単価 */}
            <tr className="bg-slate-800 text-white font-bold border-t-2 border-slate-300">
              <td className="p-2">最終単価</td>
              <td className="p-2 text-slate-300 text-[10px]">小計 × 係数 (端数処理)</td>
              {breakdowns.map(b => <td key={b.tier} className="p-2 text-right text-sm">{fmtJPY(b.bd.finalUnitPrice)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[10px] text-slate-500 text-right">
        ※エコノミーと比較して、スタンダードは「基礎単価」と「検査」の両方が強化され、プレミアムはさらに「二重検査」のコストが乗ります。
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// メインコンポーネント
// ------------------------------------------------------------------

export function CompareView({ data }: Props) {
  // 3プラン計算
  const plans = useMemo(() => {
    return (["economy", "standard", "premium"] as Tier[]).map((tier) => {
      const spec = PLAN_SPECS[tier];
      const simData: Data = { ...data, tier, inspectionLevel: spec.inspection };
      const calc = computeCalc(simData);
      const structure = analyzeStructure(calc, tier, simData);
      return { tier, spec, calc, structure };
    });
  }, [data]);

  const [eco, std, pre] = plans;
  const maxStructTotal = Math.max(eco.structure.total, std.structure.total, pre.structure.total);

  // 展開状態の管理
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
                  <span className="text-xs font-mono text-slate-400">{inspectionLabel(p.spec.inspection).split("（")[0]}</span>
                </div>

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
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Characteristics</div>
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
            <h2 className="text-lg font-bold text-slate-900">2. コスト構造の分解（Whyの可視化）</h2>
            <p className="text-xs text-slate-500 mt-1">見積金額（税抜）を構成する4つの要素に分解。なぜ価格差が生まれるのかを構造的に示します。</p>
          </div>
          {/* 凡例 */}
          <div className="flex gap-4 text-[10px] text-slate-600">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-500 rounded-sm"/>基礎工程(L0)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-cyan-400 rounded-sm"/>仕様加算(L1~)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-rose-400 rounded-sm"/>品質・検査(M1)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-500 rounded-sm"/>固定費</div>
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
                <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-mono px-1">
                  <span>0</span>
                  <span>{fmtJPY(p.structure.total)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 bg-slate-50 rounded p-3 text-xs text-slate-600 border border-slate-100 flex gap-4">
          <div className="flex-1">
            <strong>📘 基礎工程とは:</strong> プランごとに定義された標準作業（スキャン、補正、ファイル作成）。エコノミーとスタンダードの差の主因です。
          </div>
          <div className="flex-1">
            <strong>📕 品質・検査とは:</strong> 検査レベル（係数）によるコスト増分。プレミアムで大幅に増えるのは「二重検査」の人件費です。
          </div>
        </div>
      </section>

      {/* 3. 作業明細比較（現場用） */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-1">3. 作業対象別の明細比較（現場・詳細用）</h2>
        <p className="text-xs text-slate-500 mb-4">行をクリックすると、単価の積算ロジック詳細（L0〜L7, M1）が展開されます。</p>

        <div className="overflow-x-auto border rounded-lg border-slate-200">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4 font-semibold">作業項目</th>
                <th className="py-3 px-2 text-right w-24">数量</th>
                <th className="py-3 px-2 text-right w-32 bg-emerald-50 text-emerald-800 border-l border-emerald-100">Eco 総額</th>
                <th className="py-3 px-2 text-right w-32 bg-blue-50 text-blue-800 border-l border-blue-100">Std 総額</th>
                <th className="py-3 px-2 text-right w-32 bg-rose-50 text-rose-800 border-l border-rose-100">Pre 総額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.workItems.map((w) => {
                const isOpen = expandedRows.has(w.id);
                // 各プランの行計算
                const rowPlans = plans.map(p => {
                  const bd = computeUnitPrice(p.tier, p.spec.inspection, w);
                  return { ...p, bd, amount: bd.finalUnitPrice * w.qty };
                });

                return (
                  <>
                    <tr 
                      key={w.id} 
                      onClick={() => toggleRow(w.id)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${isOpen ? "bg-slate-50" : ""}`}
                    >
                      <td className="py-3 px-4 text-center text-slate-400">
                        {isOpen ? "▼" : "▶"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{w.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {sizeLabel(w.sizeClass)} / {colorModeLabel(w.colorMode)} / {dpiLabel(w.dpi)}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right tabular-nums text-slate-700">
                        {w.qty.toLocaleString()}<span className="text-[10px] ml-0.5 text-slate-400">{w.unit}</span>
                      </td>
                      <td className="py-3 px-2 text-right tabular-nums font-medium text-emerald-700 border-l border-slate-100 bg-emerald-50/30">
                        {fmtJPY(rowPlans[0].amount)}
                      </td>
                      <td className="py-3 px-2 text-right tabular-nums font-bold text-blue-700 border-l border-slate-100 bg-blue-50/30">
                        {fmtJPY(rowPlans[1].amount)}
                      </td>
                      <td className="py-3 px-2 text-right tabular-nums font-medium text-rose-700 border-l border-slate-100 bg-rose-50/30">
                        {fmtJPY(rowPlans[2].amount)}
                      </td>
                    </tr>
                    
                    {/* 詳細展開エリア */}
                    {isOpen && (
                      <tr>
                        <td colSpan={6} className="px-4 pb-4 bg-slate-50 border-b border-slate-200">
                          <DetailBreakdownTable item={w} plans={rowPlans} />
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