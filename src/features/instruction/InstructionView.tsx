import { Data } from "../../types/pricing";
import { CalcResult } from "../../utils/calculations";
import { fmtJPY, toInt, sizeLabel, colorModeLabel, dpiLabel, formatLabel, handlingLabel, metadataLabel, specProfileLabel, inspectionLabel } from "../../utils/formatters";

type Props = {
  data: Data;
  calc: CalcResult;
};

// システム名をコンポーネント内で使用できるように定義
const SYSTEM_NAME = "KHQ見積もり統合システム";

export function InstructionView({ data, calc }: Props) {
  // 仕様フラグの判定（元コードと同じロジック）
  const specFlags = {
    requireMedia: data.specProfile === "gunma" ? data.gunmaMediaRequirements : data.specProfile === "ndl",
    requireMetadata: data.specProfile === "gunma" ? data.gunmaMetadataMandatory : data.specProfile === "ndl",
    fullInspection: data.specProfile === "gunma" ? data.gunmaAllInspection : (data.inspectionLevel === "full" || data.inspectionLevel === "double_full"),
  };

  return (
    <div className="space-y-6">
      {/* 印刷用ページ外枠 */}
      <div className="print-page bg-white p-8 shadow-sm border min-h-[297mm]">
        <div className="border-b-2 border-slate-900 pb-2 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">作業指示書（内部用）</h1>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="space-y-1 text-sm">
            <div className="flex border-b py-1">
              <span className="w-24 font-semibold text-slate-600">顧客名</span>
              <span className="flex-1 text-slate-900">{data.clientName || "（未入力）"}</span>
            </div>
            <div className="flex border-b py-1">
              <span className="w-24 font-semibold text-slate-600">案件名</span>
              <span className="flex-1 text-slate-900">{data.projectName || "（未入力）"}</span>
            </div>
            <div className="flex border-b py-1">
              <span className="w-24 font-semibold text-slate-600">納期目安</span>
              <span className="flex-1 text-slate-900">{data.dueDate || "（未入力）"}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <h2 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">作業要件スイッチ</h2>
            <div className="grid grid-cols-2 gap-y-1 text-xs">
              <div className="text-slate-600">適用標準:</div>
              <div className="font-bold text-slate-900">{specProfileLabel(data.specProfile)}</div>
              <div className="text-slate-600">媒体要件:</div>
              <div className="font-bold text-slate-900">{specFlags.requireMedia ? "必須（指定あり）" : "任意"}</div>
              <div className="text-slate-600">メタデータ:</div>
              <div className="font-bold text-slate-900">{specFlags.requireMetadata ? "必須（厳格）" : "基本項目のみ"}</div>
              <div className="text-slate-600">検査強度:</div>
              <div className="font-bold text-slate-900">{specFlags.fullInspection ? "全数検査" : inspectionLabel(data.inspectionLevel)}</div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-bold text-white bg-slate-800 px-3 py-1.5 mb-3 rounded">作業明細・スキャン仕様</h2>
          <div className="overflow-hidden border border-slate-200 rounded-lg">
            <table className="w-full text-[11px] leading-tight text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-2 w-[25%]">項目名 / 備考</th>
                  <th className="p-2 w-[10%]">数量</th>
                  <th className="p-2 w-[35%]">スキャン・出力仕様</th>
                  <th className="p-2 w-[15%]">付帯・OCR</th>
                  <th className="p-2 w-[15%] text-right">参考単価</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.workItems.map((w) => (
                  <tr key={w.id} className="align-top">
                    <td className="p-2">
                      <div className="font-bold text-slate-900">{w.title}</div>
                      <div className="mt-1 text-slate-500 italic whitespace-pre-wrap">{w.notes || "—"}</div>
                    </td>
                    <td className="p-2 font-medium">
                      {toInt(w.qty).toLocaleString()} {w.unit}
                    </td>
                    <td className="p-2 space-y-1">
                      <div><span className="text-slate-400">サイズ:</span> {sizeLabel(w.sizeClass)}</div>
                      <div><span className="text-slate-400">カラー:</span> {colorModeLabel(w.colorMode)}</div>
                      <div><span className="text-slate-400">解像度:</span> {dpiLabel(w.dpi)}</div>
                      <div><span className="text-slate-400">形式:</span> {w.formats.map(formatLabel).join(", ")}</div>
                    </td>
                    <td className="p-2 space-y-1">
                      <div><span className="text-slate-400">OCR:</span> {w.ocr ? "あり" : "なし"}</div>
                      <div><span className="text-slate-400">メタ:</span> {metadataLabel(w.metadataLevel)}</div>
                      <div><span className="text-slate-400">取扱:</span> {handlingLabel(w.handling)}</div>
                    </td>
                    <td className="p-2 text-right font-mono text-slate-400">
                      {fmtJPY(calc.unitBreakdowns[w.id]?.finalUnitPrice || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-bold text-slate-800 border-l-4 border-slate-800 pl-2 mb-3">実費品目・特殊工程</h2>
            <div className="space-y-1 border rounded-lg p-3 min-h-[100px]">
              {data.miscExpenses.length === 0 ? (
                <div className="text-xs text-slate-400 italic">登録なし</div>
              ) : (
                data.miscExpenses.map((m) => (
                  <div key={m.id} className="flex justify-between text-xs py-1 border-b border-dashed border-slate-200 last:border-0">
                    <span className="text-slate-700">{m.label}</span>
                    <span className="font-medium text-slate-900">{m.qty} {m.unit}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 border-l-4 border-slate-800 pl-2 mb-3">特記事項（全体）</h2>
            <div className="border rounded-lg p-3 min-h-[100px] text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {data.notes || "特になし"}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between">
          <span>{SYSTEM_NAME} - 指示書出力モード</span>
          <span>印刷日: {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}