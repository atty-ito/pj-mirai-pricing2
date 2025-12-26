import { useMemo } from "react";
import { Data, Tier, InspectionLevel } from "../../types/pricing";
import { computeCalc, CalcResult, UnitPriceBreakdown, computeUnitPrice } from "../../utils/calculations";
import { fmtJPY, inspectionLabel, tierLabel, sizeLabel, colorModeLabel, dpiLabel, formatLabel } from "../../utils/formatters";
import { PROJECT_FIXED_FEES, TIER_BASE_PER_UNIT, INSPECTION_MULTIPLIER } from "../../constants/coefficients";

type Props = {
  data: Data;
};

// 比較用に固定する各プランの定義（経営判断用モデル）
const PLAN_SPECS: Record<Tier, { inspection: InspectionLevel; label: string; desc: string; risk: string }> = {
  economy: { 
    inspection: "sample", 
    label: "エコノミー", 
    desc: "価格優先。工程の深追いはせず、抜取検査を基本とする。",
    risk: "工程内での手戻りや、納品後の微修正リスクを許容できる場合に推奨。"
  },
  standard: { 
    inspection: "full", 
    label: "スタンダード", 
    desc: "標準的選択。NDL準拠の標準運用を実務レベルで回す。",
    risk: "公文書として十分な品質。文字可読性やページ順序を全数担保する。"
  },
  premium: { 
    inspection: "double_full", 
    label: "プレミアム", 
    desc: "品質責任を強く負う前提。全数検査・二重検証を組み込む。",
    risk: "重要文化財や機密文書向け。監査耐性と完全性を保証する。"
  },
};

// コスト構造の分解型（MECE分析用）
type CostStructure = {
  fixed: number;            // F0+F1: 案件固定費
  variableBase: number;     // L0: 基礎単価分（プラン依存の変動費）
  variableSpecs: number;    // L1~L7: 仕様加算分（全プラン共通の変動費）
  inspectionCost: number;   // M1: 検査による増分（品質コスト）
  misc: number;             // 実費・付帯
  total: number;
};

// 分析ロジック
function analyzeStructure(calc: CalcResult, tier: Tier, data: Data): CostStructure {
  const fixed = PROJECT_FIXED_FEES[tier].setup + PROJECT_FIXED_FEES[tier].management;
  
  let variableBase = 0;
  let variableSpecs = 0;
  let inspectionCost = 0;

  // 各行のコストを要素分解
  for (const w of data.workItems) {
    const bd = calc.unitBreakdowns[w.id];
    if (!bd) continue;
    const qty = w.qty;

    // 1. 基礎コスト (L0 * 数量)
    variableBase += bd.base * qty;

    // 2. 仕様加算コスト ((L1~L7) * 数量)
    // subtotalは (L0 + L1..L7) なので、そこからL0を引く
    variableSpecs += (bd.subtotal - bd.base) * qty;

    // 3. 検査コスト (最終単価 - 検査前小計) * 数量
    // これが「検査係数による純粋な増分」
    inspectionCost += (bd.finalUnitPrice - bd.subtotal) * qty;
  }

  // 実費・付帯
  const misc = calc.lineItems
    .filter(x => x.kind === "misc" || x.kind === "addon")
    .reduce((a, b) => a + b.amount, 0);

  return { fixed, variableBase, variableSpecs, inspectionCost, misc, total: calc.subtotal };
}

export function CompareView({ data }: Props) {
  // 3プランのシミュレーションを一括実行
  const plans = useMemo(() => {
    return (["economy", "standard", "premium"] as Tier[]).map((tier) => {
      const spec = PLAN_SPECS[tier];
      // 比較用に一時的なDataオブジェクトを生成（プランと検査レベルを強制適用）
      const simData: Data = { ...data, tier, inspectionLevel: spec.inspection };
      const calc = computeCalc(simData);
      const structure = analyzeStructure(calc, tier, simData);
      
      return { tier, spec, calc, structure };
    });
  }, [data]);

  const [eco, std, pre] = plans;
  const maxTotal = Math.max(eco.calc.total, std.calc.total, pre.calc.total);

  return (
    <div className="space-y-8 pb-20 font-sans text-slate-800">
      
      {/* ヘッダー */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded">内部資料</span>
              <span className="text-slate-500 text-xs">社外秘・意思決定用</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">見積比較表（3プラン）</h2>
            <p className="text-sm text-slate-500 mt-1">同一の作業対象（数量・仕様）に対し、プラン（管理・品質水準）を変更した場合のコスト構造比較。</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">作成日</div>
            <div className="text-sm font-mono">{data.issueDate}</div>
          </div>
        </div>

        {/* 1) 合計比較（エグゼクティブサマリ） */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isBase = p.tier === "economy";
            const diff = p.calc.total - eco.calc.total;
            const diffPct = eco.calc.total > 0 ? (diff / eco.calc.total) * 100 : 0;
            const color = p.tier === "premium" ? "rose" : p.tier === "standard" ? "blue" : "emerald";
            const bg = p.tier === "premium" ? "bg-rose-50" : p.tier === "standard" ? "bg-blue-50" : "bg-emerald-50";
            const border = p.tier === "premium" ? "border-rose-200" : p.tier === "standard" ? "border-blue-200" : "border-emerald-200";
            const text = p.tier === "premium" ? "text-rose-700" : p.tier === "standard" ? "text-blue-700" : "text-emerald-700";

            return (
              <div key={p.tier} className={`relative p-4 rounded-lg border ${border} ${bg}`}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className={`font-bold text-lg ${text}`}>{p.spec.label}</h3>
                  <span className="text-xs font-medium bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">
                    {inspectionLabel(p.spec.inspection).split("（")[0]}
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-900 tracking-tight tabular-nums mb-1">
                  {fmtJPY(p.calc.total)}
                </div>
                <div className="text-xs font-medium flex justify-between items-center h-6">
                  {isBase ? (
                    <span className="text-slate-400">（比較基準）</span>
                  ) : (
                    <span className="text-rose-600 font-bold">
                      +{fmtJPY(diff)} <span className="opacity-75">(+{diffPct.toFixed(1)}%)</span>
                    </span>
                  )}
                  <span className="text-slate-500 text-[10px]">税込</span>
                </div>
                
                {/* 簡易コストバー */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 text-[10px] space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>固定費比率</span>
                    <span className="font-mono">{((p.structure.fixed / p.structure.total) * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-slate-500 leading-tight mt-1 min-h-[3em]">{p.spec.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 2) 価格ドライバー（パラメータ比較） */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm h-full">
          <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <span>⚙️</span> 価格ドライバー（差分の要因）
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            作業量（数量×仕様）以外の、プランによって変動する「単価・固定費」のパラメータ設定値。
          </p>
          
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="p-2 border border-slate-100">項目 (Code)</th>
                <th className="p-2 border border-slate-100 w-24 text-center text-emerald-700">Eco</th>
                <th className="p-2 border border-slate-100 w-24 text-center text-blue-700">Std</th>
                <th className="p-2 border border-slate-100 w-24 text-center text-rose-700">Pre</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-slate-100 font-medium">
                  <div>L0 基礎単価</div>
                  <div className="text-[10px] text-slate-400 font-normal">工程の手厚さ・基本品質</div>
                </td>
                <td className="p-2 border border-slate-100 text-center tabular-nums">{TIER_BASE_PER_UNIT.economy}円</td>
                <td className="p-2 border border-slate-100 text-center tabular-nums font-bold bg-blue-50/30">{TIER_BASE_PER_UNIT.standard}円</td>
                <td className="p-2 border border-slate-100 text-center tabular-nums bg-rose-50/30">{TIER_BASE_PER_UNIT.premium}円</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-100 font-medium">
                  <div>M1 検査倍率</div>
                  <div className="text-[10px] text-slate-400 font-normal">全数・二重検査の人件費増</div>
                </td>
                <td className="p-2 border border-slate-100 text-center tabular-nums">x{INSPECTION_MULTIPLIER.sample.toFixed(2)}</td>
                <td className="p-2 border border-slate-100 text-center tabular-nums font-bold bg-blue-50/30">x{INSPECTION_MULTIPLIER.full.toFixed(2)}</td>
                <td className="p-2 border border-slate-100 text-center tabular-nums bg-rose-50/30">x{INSPECTION_MULTIPLIER.double_full.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-100 font-medium">
                  <div>F0+F1 案件固定費</div>
                  <div className="text-[10px] text-slate-400 font-normal">初期ST・進行管理・監査対応</div>
                </td>
                <td className="p-2 border border-slate-100 text-center tabular-nums text-xs">{fmtJPY(eco.structure.fixed)}</td>
                <td className="p-2 border border-slate-100 text-center tabular-nums text-xs font-bold bg-blue-50/30">{fmtJPY(std.structure.fixed)}</td>
                <td className="p-2 border border-slate-100 text-center tabular-nums text-xs bg-rose-50/30">{fmtJPY(pre.structure.fixed)}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-4 p-3 bg-slate-50 rounded text-xs text-slate-600 leading-relaxed border border-slate-100">
            <span className="font-bold text-slate-700">💡 読み解きのポイント</span><br/>
            エコノミーとスタンダードの最大の差は「全数検査(M1)」と「基本工程の深さ(L0)」にあります。
            プレミアムの上昇分は、主に「二重検証」と「管理コスト(F1)」によるもので、監査耐性を担保するためのコストです。
          </div>
        </div>

        {/* 3) コスト構造分析（グラフ） */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm h-full">
          <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <span>📊</span> コスト構造の分解（MECE分析）
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            見積総額（税抜）を「固定費」「変動費（基礎・仕様）」「品質コスト」の4要素に分解。
          </p>

          <div className="space-y-6">
            {plans.map((p) => {
              const total = p.structure.total; // 税抜
              const getW = (val: number) => (total > 0 ? (val / total) * 100 : 0);
              
              return (
                <div key={p.tier}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>{p.spec.label}</span>
                    <span className="tabular-nums">{fmtJPY(total)}</span>
                  </div>
                  <div className="flex h-6 w-full rounded overflow-hidden bg-slate-100">
                    <div style={{ width: `${getW(p.structure.fixed)}%` }} className="bg-slate-500 hover:bg-slate-600 transition" title={`固定費: ${fmtJPY(p.structure.fixed)}`} />
                    <div style={{ width: `${getW(p.structure.variableBase)}%` }} className="bg-blue-500 hover:bg-blue-600 transition" title={`変動費(基礎): ${fmtJPY(p.structure.variableBase)}`} />
                    <div style={{ width: `${getW(p.structure.variableSpecs)}%` }} className="bg-cyan-400 hover:bg-cyan-500 transition" title={`変動費(仕様): ${fmtJPY(p.structure.variableSpecs)}`} />
                    <div style={{ width: `${getW(p.structure.inspectionCost)}%` }} className="bg-rose-400 hover:bg-rose-500 transition" title={`品質コスト(検査): ${fmtJPY(p.structure.inspectionCost)}`} />
                    <div style={{ width: `${getW(p.structure.misc)}%` }} className="bg-amber-400 hover:bg-amber-500 transition" title={`実費: ${fmtJPY(p.structure.misc)}`} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500"></span>固定費</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>基礎</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400"></span>仕様</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400"></span>品質(検査)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4) 作業対象別の詳細比較（明細） */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
        <h3 className="font-bold text-slate-800 mb-2 pb-2 border-b border-slate-100 text-sm">
          4) 作業対象別の単価・金額比較
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 min-w-[200px]">作業対象（仕様概要）</th>
                <th className="py-2 px-2 text-right">数量</th>
                <th className="py-2 px-2 text-right border-l border-white bg-emerald-50/50 text-emerald-800">Eco 単価</th>
                <th className="py-2 px-2 text-right border-l border-white bg-blue-50/50 text-blue-800 font-bold">Std 単価</th>
                <th className="py-2 px-2 text-right border-l border-white bg-rose-50/50 text-rose-800">Pre 単価</th>
                <th className="py-2 px-2 text-right border-l border-white bg-emerald-50/50 text-emerald-800">Eco 金額</th>
                <th className="py-2 px-2 text-right border-l border-white bg-blue-50/50 text-blue-800 font-bold">Std 金額</th>
                <th className="py-2 px-2 text-right border-l border-white bg-rose-50/50 text-rose-800">Pre 金額</th>
                <th className="py-2 px-3 text-center text-slate-400 w-32">単価差イメージ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.workItems.map((w) => {
                // 行ごとの単価・金額をオンザフライ計算
                const pEco = computeUnitPrice("economy", "sample", w);
                const pStd = computeUnitPrice("standard", "full", w);
                const pPre = computeUnitPrice("premium", "double_full", w);

                const amtEco = pEco.finalUnitPrice * w.qty;
                const amtStd = pStd.finalUnitPrice * w.qty;
                const amtPre = pPre.finalUnitPrice * w.qty;

                const maxPrice = Math.max(pEco.finalUnitPrice, pStd.finalUnitPrice, pPre.finalUnitPrice);

                return (
                  <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 align-top">
                      <div className="font-bold text-slate-800">{w.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        {sizeLabel(w.sizeClass)} / {colorModeLabel(w.colorMode)} / {dpiLabel(w.dpi)} / {w.formats.map(formatLabel).join(",")}
                        {w.ocr && " / OCR"}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right align-top tabular-nums text-slate-600">
                      {w.qty.toLocaleString()}<span className="text-[10px] ml-0.5">{w.unit}</span>
                    </td>
                    
                    {/* 単価 */}
                    <td className="py-3 px-2 text-right align-top tabular-nums border-l border-slate-100 bg-emerald-50/10 font-medium">{fmtJPY(pEco.finalUnitPrice)}</td>
                    <td className="py-3 px-2 text-right align-top tabular-nums border-l border-slate-100 bg-blue-50/10 font-bold text-blue-900">{fmtJPY(pStd.finalUnitPrice)}</td>
                    <td className="py-3 px-2 text-right align-top tabular-nums border-l border-slate-100 bg-rose-50/10 font-medium">{fmtJPY(pPre.finalUnitPrice)}</td>

                    {/* 金額 */}
                    <td className="py-3 px-2 text-right align-top tabular-nums border-l border-slate-100 text-slate-500">{fmtJPY(amtEco)}</td>
                    <td className="py-3 px-2 text-right align-top tabular-nums border-l border-slate-100 text-slate-900 font-semibold">{fmtJPY(amtStd)}</td>
                    <td className="py-3 px-2 text-right align-top tabular-nums border-l border-slate-100 text-slate-500">{fmtJPY(amtPre)}</td>

                    {/* グラフ */}
                    <td className="py-3 px-3 align-middle border-l border-slate-100">
                      <div className="flex flex-col gap-1 w-full opacity-80">
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-400" style={{ width: `${(pPre.finalUnitPrice / maxPrice) * 100}%` }}></div>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${(pStd.finalUnitPrice / maxPrice) * 100}%` }}></div>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${(pEco.finalUnitPrice / maxPrice) * 100}%` }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 text-right">
          ※ L1〜L7（仕様加算）は全プランで同一条件。単価差はL0（基礎単価）とM1（検査倍率）のみに起因します。
        </div>
      </div>
    </div>
  );
}