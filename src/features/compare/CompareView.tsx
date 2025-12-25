import { useMemo } from "react";
import { Data, Tier, InspectionLevel } from "../../types/pricing";
import { computeCalc, CalcResult, UnitPriceBreakdown, computeUnitPrice } from "../../utils/calculations";
import { fmtJPY, inspectionLabel, tierLabel } from "../../utils/formatters";
import { PROJECT_FIXED_FEES } from "../../constants/coefficients";

type Props = {
  data: Data;
};

// コスト構造の内訳型
type CostStructure = {
  fixed: number; // 案件固定費
  variableBase: number; // 変動費（基礎単価分）
  variableSpecs: number; // 変動費（仕様加算分：サイズ・色など）
  inspectionOverhead: number; // 検査による増分（係数コスト）
  misc: number; // 実費・付帯
  total: number;
};

// 内訳を計算する関数
function analyzeCostStructure(calc: CalcResult, tier: Tier, data: Data): CostStructure {
  let fixed = 0;
  let variableBase = 0;
  let variableSpecs = 0;
  let inspectionOverhead = 0;
  let misc = 0;

  // 固定費
  fixed = PROJECT_FIXED_FEES[tier].setup + PROJECT_FIXED_FEES[tier].management;

  // 実費・付帯
  misc = calc.lineItems
    .filter(x => x.kind === "misc" || x.kind === "addon")
    .reduce((a, b) => a + b.amount, 0);

  // 変動費の分解
  for (const w of data.workItems) {
    const bd = calc.unitBreakdowns[w.id];
    if (!bd) continue;
    
    const qty = w.qty;
    // 基礎単価分
    const baseCost = bd.base * qty;
    // 仕様加算分（小計 - 基礎）
    const specCost = (bd.subtotal - bd.base) * qty;
    // 検査コスト（最終単価 - 小計） ※端数処理の影響含む
    const inspCost = (bd.finalUnitPrice - bd.subtotal) * qty;

    variableBase += baseCost;
    variableSpecs += specCost;
    inspectionOverhead += inspCost;
  }

  return {
    fixed,
    variableBase,
    variableSpecs,
    inspectionOverhead,
    misc,
    total: calc.subtotal // 税抜で比較
  };
}

/**
 * 積み上げバーグラフコンポーネント（CSS Grid使用）
 */
function StackedBar({ structure, maxTotal }: { structure: CostStructure; maxTotal: number }) {
  const getWidth = (val: number) => `${(val / maxTotal) * 100}%`;
  
  return (
    <div className="h-8 w-full flex rounded-lg overflow-hidden bg-slate-100 ring-1 ring-slate-200 mt-2">
      {structure.variableBase > 0 && (
        <div style={{ width: getWidth(structure.variableBase) }} className="bg-blue-500 hover:bg-blue-600 transition-colors relative group">
          <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-bold opacity-0 group-hover:opacity-100">基礎</div>
        </div>
      )}
      {structure.variableSpecs > 0 && (
        <div style={{ width: getWidth(structure.variableSpecs) }} className="bg-cyan-400 hover:bg-cyan-500 transition-colors relative group">
          <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-bold opacity-0 group-hover:opacity-100">仕様</div>
        </div>
      )}
      {structure.inspectionOverhead > 0 && (
        <div style={{ width: getWidth(structure.inspectionOverhead) }} className="bg-rose-400 hover:bg-rose-500 transition-colors relative group">
          <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-bold opacity-0 group-hover:opacity-100">検査</div>
        </div>
      )}
      {structure.fixed > 0 && (
        <div style={{ width: getWidth(structure.fixed) }} className="bg-slate-500 hover:bg-slate-600 transition-colors relative group">
          <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-bold opacity-0 group-hover:opacity-100">固定</div>
        </div>
      )}
      {structure.misc > 0 && (
        <div style={{ width: getWidth(structure.misc) }} className="bg-amber-400 hover:bg-amber-500 transition-colors relative group">
          <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-bold opacity-0 group-hover:opacity-100">実費</div>
        </div>
      )}
    </div>
  );
}

export function CompareView({ data }: Props) {
  const PRESET_INSPECTION: Record<Tier, InspectionLevel> = {
    economy: "sample",
    standard: "full",
    premium: "double_full",
  };

  const plans = useMemo(() => {
    return (["economy", "standard", "premium"] as Tier[]).map(tier => {
      const calc = computeCalc({ ...data, tier, inspectionLevel: PRESET_INSPECTION[tier] });
      const structure = analyzeCostStructure(calc, tier, data);
      return {
        tier,
        label: tierLabel(tier),
        inspection: PRESET_INSPECTION[tier],
        calc,
        structure
      };
    });
  }, [data]);

  const economyTotal = plans[0].calc.total; // 税込
  const maxStructureTotal = Math.max(...plans.map(p => p.structure.total)); // グラフ正規化用（税抜）

  return (
    <div className="space-y-6">
      {/* ヘッダー＆凡例 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800 border border-yellow-200 mb-2">
              社外秘・内部検討用
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">プラン別コスト構造分析</h2>
            <p className="text-sm text-slate-500 mt-1">プラン変更によるコスト増減要因（ドライバー）の可視化</p>
          </div>
          
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs">
            <div className="font-bold text-slate-700 mb-2">グラフ凡例（コスト構成要素）</div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div>変動費(基礎)</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-cyan-400 rounded-sm"></div>変動費(仕様加算)</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-rose-400 rounded-sm"></div>検査コスト増分</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-500 rounded-sm"></div>固定費(管理・ST)</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-400 rounded-sm"></div>実費・付帯</div>
            </div>
          </div>
        </div>

        {/* 3プラン比較カード */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((p) => {
            const diff = p.calc.total - economyTotal;
            const diffPercent = economyTotal > 0 ? (diff / economyTotal) * 100 : 0;
            const isBase = p.tier === "economy";
            const borderColor = p.tier === "premium" ? "border-rose-200" : p.tier === "standard" ? "border-blue-200" : "border-green-200";
            const bgColor = p.tier === "premium" ? "bg-rose-50/30" : p.tier === "standard" ? "bg-blue-50/30" : "bg-green-50/30";

            return (
              <div key={p.tier} className={`rounded-xl border-2 ${borderColor} ${bgColor} p-5 relative overflow-hidden transition-all hover:shadow-md`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-lg font-black text-slate-900">{p.label}</div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5">{inspectionLabel(p.inspection)}</div>
                  </div>
                  {isBase ? (
                    <div className="px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded">比較基準</div>
                  ) : (
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-500">Eco比</div>
                      <div className="text-sm font-black text-rose-600">+{diffPercent.toFixed(1)}%</div>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-sm text-slate-500 mb-1">見積合計 (税込)</div>
                  <div className="text-3xl font-black tabular-nums tracking-tight text-slate-900">{fmtJPY(p.calc.total)}</div>
                  {!isBase && (
                    <div className="text-xs font-bold text-rose-600 mt-1 tabular-nums">
                      (+{fmtJPY(diff)})
                    </div>
                  )}
                </div>

                {/* グラフ */}
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>構成比率</span>
                    <span>{fmtJPY(p.structure.total)} (税抜)</span>
                  </div>
                  <StackedBar structure={p.structure} maxTotal={maxStructureTotal} />
                </div>

                {/* 詳細内訳テーブル */}
                <div className="bg-white/60 rounded-lg p-3 text-xs space-y-1.5 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5"><div className="w-2 h-2 bg-slate-500 rounded-full"></div>固定費</span>
                    <span className="font-medium tabular-nums">{fmtJPY(p.structure.fixed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5"><div className="w-2 h-2 bg-blue-500 rounded-full"></div>変動費(基礎)</span>
                    <span className="font-medium tabular-nums">{fmtJPY(p.structure.variableBase)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5"><div className="w-2 h-2 bg-cyan-400 rounded-full"></div>変動費(仕様)</span>
                    <span className="font-medium tabular-nums">{fmtJPY(p.structure.variableSpecs)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5"><div className="w-2 h-2 bg-rose-400 rounded-full"></div>検査増分</span>
                    <span className="font-bold text-rose-600 tabular-nums">{fmtJPY(p.structure.inspectionOverhead)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span className="p-1 bg-slate-100 rounded text-slate-600">💡</span>
            プラン選択の意思決定ポイント
          </h3>
          <ul className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <li className="flex gap-3">
              <span className="font-bold text-green-600 whitespace-nowrap">エコノミー</span>
              <span>予算重視。検査は抜取のため、工程内での手戻りや納品後の微修正リスクを許容できる場合に推奨。</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-600 whitespace-nowrap">スタンダード</span>
              <span>標準的選択。全数検査により、文字可読性やページ順序の担保を行う。公文書として十分な品質。</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-rose-600 whitespace-nowrap">プレミアム</span>
              <span>厳格要件。二重検査（ダブルチェック）と詳細ログ記録により、監査耐性と完全性を保証する。重要文化財や機密文書向け。</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span className="p-1 bg-slate-100 rounded text-slate-600">📊</span>
            コストドライバー（価格変動要因）
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-bold text-slate-800 mb-1">検査コストの影響</div>
              <p className="text-slate-600 text-xs">
                プレミアムプランでは、基礎単価に対して約20%の検査割増が発生します。これは二重検証の人件費に相当します。
              </p>
            </div>
            <div>
              <div className="font-bold text-slate-800 mb-1">固定費の厚み</div>
              <p className="text-slate-600 text-xs">
                プランが上がるにつれ、セットアップ費・管理費（F0/F1）が増加します。これは体制構築とセキュリティ管理の厳格化に伴うものです。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}