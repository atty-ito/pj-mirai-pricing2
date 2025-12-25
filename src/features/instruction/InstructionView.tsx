import { Data } from "../../types/pricing";
import { CalcResult } from "../../utils/calculations";
import { fmtJPY, toInt, sizeLabel, colorModeLabel, dpiLabel, inspectionLabel, metadataLabel, handlingLabel, specProfileLabel } from "../../utils/formatters";

type Props = {
  data: Data;
  calc: CalcResult;
};

export function InstructionView({ data, calc }: Props) {
  // 元のロジックから仕様スイッチを判定
  const specFlags = {
    requireMedia: data.specProfile === "gunma" ? data.gunmaMediaRequirements : data.specProfile === "ndl",
    requireMetadata: data.specProfile === "gunma" ? data.gunmaMetadataMandatory : data.specProfile === "ndl",
    fullInspection: data.specProfile === "gunma" ? data.gunmaAllInspection : (data.inspectionLevel === "full" || data.inspectionLevel === "double_full"),
  };

  return (
    <div className="print-page bg-white p-8 shadow-sm border min-h-[297mm]">
      <div className="space-y-4">
        <h1 className="text-xl font-bold border-b pb-2">作業指示書（内部用）</h1>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs font-semibold text-slate-700">案件基本情報</div>
            <div className="mt-1 text-sm text-slate-900 space-y-0.5">
              <div>顧客名: {data.clientName || "（未入力）"}</div>
              <div>案件名: {data.projectName || "（未入力）"}</div>
              <div>納期目安: {data.dueDate || "（未入力）"}</div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs font-semibold text-slate-700">作業要件スイッチ</div>
            <div className="mt-1 space-y-0.5 text-sm text-slate-900">
              <div>標準: {specProfileLabel(data.specProfile)}</div>
              <div>媒体要件: {specFlags.requireMedia ? "必須" : "任意"}</div>
              <div>メタデータ: {specFlags.requireMetadata ? "必須" : "任意"}</div>
              <div>検査: {specFlags.fullInspection ? "全数検査" : inspectionLabel(data.inspectionLevel)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="bg-slate-50 px-3 py-1.5 text-xs font-bold border-b text-slate-700">作業一覧・スキャン仕様</div>
          <table className="w-full text-[11px] border-collapse">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left">
                <th className="p-2 border-r w-[26%]">作業項目</th>
                <th className="p-2 border-r w-[12%]">数量</th>
                <th className="p-2 border-r w-[26%]">スキャン仕様</th>
                <th className="p-2 border-r w-[18%]">付帯・OCR</th>
                <th className="p-2 w-[18%]">備考</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.workItems.map((w) => (
                <tr key={w.id} className="align-top">
                  <td className="p-2 border-r">
                    <div className="font-bold">{w.title}</div>
                    <div className="text-[10px] text-slate-500">
                      {sizeLabel(w.sizeClass)} / {colorModeLabel(w.colorMode)} / {dpiLabel(w.dpi)}
                    </div>
                  </td>
                  <td className="p-2 border-r whitespace-nowrap">{toInt(w.qty).toLocaleString()} {w.unit}</td>
                  <td className="p-2 border-r">
                    <div>形式: {w.formats.join(", ")}</div>
                    <div>取扱: {handlingLabel(w.handling)}</div>
                  </td>
                  <td className="p-2 border-r">
                    <div>OCR: {w.ocr ? "あり" : "なし"}</div>
                    <div>メタ: {metadataLabel(w.metadataLevel)}</div>
                  </td>
                  <td className="p-2 whitespace-pre-wrap italic text-slate-600">{w.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs font-semibold text-slate-700 mb-2">備品・実費（自由入力）</div>
            <div className="space-y-1">
              {data.miscExpenses.length === 0 ? (
                <div className="text-xs text-slate-400">登録なし</div>
              ) : (
                data.miscExpenses.map((m) => (
                  <div key={m.id} className="flex justify-between text-[11px] border-b border-dashed pb-1">
                    <span>{m.label}</span>
                    <span className="font-bold">{m.qty} {m.unit}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs font-semibold text-slate-700 mb-2">特記事項・備考（全体）</div>
            <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
              {data.notes || "（特記事項なし）"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}