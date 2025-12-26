import { useMemo } from "react";
import { Data, Tier, InspectionLevel } from "../../types/pricing";
import { computeCalc, computeUnitPrice } from "../../utils/calculations";
import { fmtJPY, inspectionLabel, tierLabel, sizeLabel, colorModeLabel, dpiLabel, formatLabel } from "../../utils/formatters";
import { PROJECT_FIXED_FEES, TIER_BASE_PER_UNIT, INSPECTION_MULTIPLIER } from "../../constants/coefficients";

type Props = {
  data: Data;
};

// 比較用に固定する各プランの検査レベル定義（画像の仕様に準拠）
const PLAN_SPECS: Record<Tier, { inspection: InspectionLevel; label: string }> = {
  economy: { inspection: "sample", label: "エコノミー" },
  standard: { inspection: "full", label: "スタンダード" },
  premium: { inspection: "double_full", label: "プレミアム" },
};

export function CompareView({ data }: Props) {
  // 3プランの計算結果を一括生成
  const comparison = useMemo(() => {
    return (["economy", "standard", "premium"] as Tier[]).map((tier) => {
      // 比較用に一時的なDataオブジェクトを作成（プランと検査レベルを強制上書き）
      const tempSpecs = PLAN_SPECS[tier];
      const tempData: Data = {
        ...data,
        tier: tier,
        inspectionLevel: tempSpecs.inspection,
      };
      
      const calc = computeCalc(tempData);
      
      // 固定費（セットアップ＋進行管理）
      const fixedCost = PROJECT_FIXED_FEES[tier].setup + PROJECT_FIXED_FEES[tier].management;
      
      return {
        tier,
        label: tempSpecs.label,
        inspection: tempSpecs.inspection,
        calc,
        fixedCost,
        baseUnit: TIER_BASE_PER_UNIT[tier],
        inspectionMult: INSPECTION_MULTIPLIER[tempSpecs.inspection],
      };
    });
  }, [data]);

  const [eco, std, pre] = comparison;
  const maxTotal = Math.max(eco.calc.total, std.calc.total, pre.calc.total);

  return (
    <div className="space-y-8 pb-20">
      
      {/* 1. 内部資料ヘッダーとプラン定義 */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
        <div className="border-b border-slate-200 pb-3 mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <span className="bg-slate-800 text-white text-xs px-2 py-1 rounded">内部資料</span>
            プラン差分説明・比較表
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            顧客提示の前に、プランの差（何が増えて何が減るか）を整理するための内部資料。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="font-bold text-emerald-700 mb-1">エコノミー</div>
            <ul className="list-disc list-outside pl-4 space-y-1 text-xs text-slate-700 leading-relaxed">
              <li><strong>価格優先。</strong>検査は「抜取」までを基本とし、工程の深追いはしない。</li>
              <li>仕様書は必要十分の粒度（標準〜詳細）を選択可能。</li>
              <li>工程是正・証跡は最小限。</li>
            </ul>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="font-bold text-blue-700 mb-1">スタンダード</div>
            <ul className="list-disc list-outside pl-4 space-y-1 text-xs text-slate-700 leading-relaxed">
              <li><strong>工程内の是正</strong>（撮り直し、命名ルール厳守、軽微な補正）を前提にした運用。</li>
              <li>詳細レベルのメタデータ（項目群・整合性）を実務レベルで回す。</li>
              <li>NDL準拠相当の標準運用。</li>
            </ul>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="font-bold text-rose-700 mb-1">プレミアム</div>
            <ul className="list-disc list-outside pl-4 space-y-1 text-xs text-slate-700 leading-relaxed">
              <li><strong>品質責任を強く負う前提。</strong>全数検査・二重検査、監査可能な情報管理、詳細ログ等を含む。</li>
              <li>厳格仕様（全数検査/媒体要件/メタデータ必須をONにした案件）にも耐える。</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 2. 合計比較 & 3. 価格ドライバー */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 合計比較テーブル */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <h3 className="font-bold text-slate-800 mb-3 text-sm border-b border-slate-100 pb-2">1) 合計比較（税込）</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium text-xs">
                <tr>
                  <th className="px-3 py-2">プラン</th>
                  <th className="px-3 py-2">検査</th>
                  <th className="px-3 py-2 text-right">固定費(F0/F1)</th>
                  <th className="px-3 py-2 text-right">合計(税込)</th>
                  <th className="px-3 py-2 w-24">相対比較</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {comparison.map((c) => {
                  const ratio = (c.calc.total / maxTotal) * 100;
                  return (
                    <tr key={c.tier}>
                      <td className="px-3 py-2 font-bold">{c.label}</td>
                      <td className="px-3 py-2 text-xs">{inspectionLabel(c.inspection).split("（")[0]}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">{fmtJPY(c.fixedCost)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold">{fmtJPY(c.calc.total)}</td>
                      <td className="px-3 py-2 align-middle">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-full">
                          <div className={`h-full ${c.tier === 'premium' ? 'bg-rose-500' : c.tier === 'standard' ? 'bg-blue-500' : 'bg-emerald-500'}`} style={{ width: `${ratio}%` }}></div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 価格ドライバーテーブル */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <h3 className="font-bold text-slate-800 mb-3 text-sm border-b border-slate-100 pb-2">2) 価格ドライバー（主な差分要因）</h3>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium text-xs">
              <tr>
                <th className="px-3 py-2">項目</th>
                <th className="px-3 py-2 text-center text-emerald-700">エコノミー</th>
                <th className="px-3 py-2 text-center text-blue-700">スタンダード</th>
                <th className="px-3 py-2 text-center text-rose-700">プレミアム</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="px-3 py-2 font-medium text-xs">L0 基礎単価（円/頁）</td>
                <td className="px-3 py-2 text-center tabular-nums">{eco.baseUnit}</td>
                <td className="px-3 py-2 text-center tabular-nums font-bold">{std.baseUnit}</td>
                <td className="px-3 py-2 text-center tabular-nums">{pre.baseUnit}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-xs">M1 検査倍率</td>
                <td className="px-3 py-2 text-center tabular-nums">×{eco.inspectionMult.toFixed(2)}</td>
                <td className="px-3 py-2 text-center tabular-nums font-bold">×{std.inspectionMult.toFixed(2)}</td>
                <td className="px-3 py-2 text-center tabular-nums">×{pre.inspectionMult.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-xs">F0+F1 案件固定費</td>
                <td className="px-3 py-2 text-center tabular-nums text-xs">{fmtJPY(eco.fixedCost)}</td>
                <td className="px-3 py-2 text-center tabular-nums text-xs font-bold">{fmtJPY(std.fixedCost)}</td>
                <td className="px-3 py-2 text-center tabular-nums text-xs">{fmtJPY(pre.fixedCost)}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-3 text-[10px] text-slate-500 leading-relaxed bg-slate-50 p-2 rounded">
            <div><strong>L0 (基礎単価):</strong> サイズ・色等の加算(L1〜)とは独立した、プラン固有のベース価格。工程内足正の許容度や基本品質水準を反映。</div>
            <div className="mt-1"><strong>M1 (検査倍率):</strong> 単価の最終計算にかかる係数。{pre.inspectionMult}倍は二重検査の人件費増を意味する。</div>
          </div>
        </div>
      </div>

      {/* 4. 作業対象別の比較（詳細） */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
        <h3 className="font-bold text-slate-800 mb-1 text-sm">3) 作業対象別の比較（単価・金額）</h3>
        <p className="text-xs text-slate-500 mb-4">
          下表は、作業対象（行）ごとに、3プランの単価と金額を横並びで示し、差分の発生源を一覧できるようにしたものである。
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-y border-slate-200">
              <tr>
                <th className="py-2 px-3 w-64">作業対象</th>
                <th className="py-2 px-2 text-right w-20">数量</th>
                <th className="py-2 px-2 text-right bg-emerald-50/50 text-emerald-800 border-l border-white">Eco 単価</th>
                <th className="py-2 px-2 text-right bg-blue-50/50 text-blue-800 border-l border-white">Std 単価</th>
                <th className="py-2 px-2 text-right bg-rose-50/50 text-rose-800 border-l border-white">Pre 単価</th>
                <th className="py-2 px-2 text-right bg-emerald-50/50 text-emerald-800 border-l border-white">Eco 金額</th>
                <th className="py-2 px-2 text-right bg-blue-50/50 text-blue-800 border-l border-white">Std 金額</th>
                <th className="py-2 px-2 text-right bg-rose-50/50 text-rose-800 border-l border-white">Pre 金額</th>
                <th className="py-2 px-4 w-32 text-center text-slate-400">単価比較</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.workItems.map((w) => {
                // 行ごとの単価・金額をオンザフライ計算
                // ※ computeUnitPriceは (tier, inspection, item) を受け取る
                const pEco = computeUnitPrice("economy", "sample", w);
                const pStd = computeUnitPrice("standard", "full", w);
                const pPre = computeUnitPrice("premium", "double_full", w);

                const amtEco = pEco.finalUnitPrice * w.qty;
                const amtStd = pStd.finalUnitPrice * w.qty;
                const amtPre = pPre.finalUnitPrice * w.qty;

                // グラフ用最大値（この行の中で）
                const maxRowPrice = Math.max(pEco.finalUnitPrice, pStd.finalUnitPrice, pPre.finalUnitPrice);

                return (
                  <tr key={w.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 align-top">
                      <div className="font-bold text-slate-800 text-sm">{w.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {sizeLabel(w.sizeClass)} / {colorModeLabel(w.colorMode)} / {dpiLabel(w.dpi)} / {w.formats.map(formatLabel).join(",")}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right align-top tabular-nums">
                      <div className="font-medium">{w.qty.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400">{w.unit}</div>
                    </td>
                    
                    {/* 単価 */}
                    <td className="py-3 px-2 text-right align-top tabular-nums border-l border-slate-100 bg-emerald-50/10 font-medium">
                      {fmtJPY(pEco.finalUnitPrice)}
                    </td>
                    <td className="py-3 px-2 text-right align-top tabular-nums border-l border-slate-100 bg-blue-50/10 font-bold text-blue-900">
                      {fmtJPY(pStd.finalUnitPrice)}
                    </td>
                    <td className="py-3 px-2 text-right align-top tabular-nums border-l border-slate-100 bg-rose-50/10 font-medium">
                      {fmtJPY(pPre.finalUnitPrice)}
                    </td>

                    {/* 金額 */}
                    <td className="py-3 px-2 text-right align-top tabular-nums border-l border-slate-100 text-slate-500">
                      {fmtJPY(amtEco)}
                    </td>
                    <td className="py-3 px-2 text-right align-top tabular-nums border-l border-slate-100 text-slate-900 font-semibold">
                      {fmtJPY(amtStd)}
                    </td>
                    <td className="py-3 px-2 text-right align-top tabular-nums border-l border-slate-100 text-slate-500">
                      {fmtJPY(amtPre)}
                    </td>

                    {/* グラフ */}
                    <td className="py-3 px-4 align-top border-l border-slate-100">
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-400" style={{ width: `${(pPre.finalUnitPrice / maxRowPrice) * 100}%` }}></div>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${(pStd.finalUnitPrice / maxRowPrice) * 100}%` }}></div>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${(pEco.finalUnitPrice / maxRowPrice) * 100}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[8px] text-slate-400 mt-0.5 px-0.5 font-mono">
                          <span>0</span>
                          <span>Pre/Std/Eco</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-[10px] text-slate-500">
          注：本頁の差分は「プラン差分（基礎単価・固定費）」と「検査レベル（標準設定の倍率）」に起因する。
          サイズ・色・dpi・形式・OCR・メタデータ・取扱等の加算（L1〜）は、作業対象の入力値に依存するため、全プランで同一条件としている。
        </div>
      </div>
    </div>
  );
}