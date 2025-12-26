import { ReactNode } from "react";
import { Data } from "../../types/pricing";
import { CalcResult } from "../../utils/calculations";
import { 
  fmtJPY, 
  toInt, 
  sizeLabel, 
  colorModeLabel, 
  dpiLabel, 
  formatLabel, 
  handlingLabel, 
  metadataLabel, 
  specProfileLabel, 
  inspectionLabel 
} from "../../utils/formatters";

type Props = {
  data: Data;
  calc: CalcResult;
};

// 指示書用のページコンポーネント（App.tsxから復元）
function Page(props: { title: string; children: ReactNode }) {
  return (
    <div className="print-page rounded-2xl border bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
      <div className="border-b px-4 py-3">
        <div className="text-sm font-semibold text-slate-800">{props.title}</div>
      </div>
      <div className="p-4">{props.children}</div>
    </div>
  );
}

export function InstructionView({ data, calc }: Props) {
  // 仕様フラグ判定
  const specFlags = {
    requireMedia: data.specProfile === "gunma" ? data.gunmaMediaRequirements : data.specProfile === "ndl",
    requireMetadata: data.specProfile === "gunma" ? data.gunmaMetadataMandatory : data.specProfile === "ndl",
    fullInspection: data.specProfile === "gunma" ? data.gunmaAllInspection : (data.inspectionLevel === "full" || data.inspectionLevel === "double_full"),
  };

  return (
    <div className="space-y-4">
      <Page title="作業指示書（内部用）">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-xs font-semibold text-slate-700">案件</div>
              <div className="mt-1 text-sm text-slate-900">
                <div>顧客名: {data.clientName || "（未入力）"}</div>
                <div className="mt-0.5">案件名: {data.projectName || "（未入力）"}</div>
                <div className="mt-0.5">納期目安: {data.dueDate || "（未入力）"}</div>
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

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs font-semibold text-slate-700">作業一覧（内部指示）</div>
            <div className="mt-2 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="p-2 border-b w-[26%]">作業</th>
                    <th className="p-2 border-b w-[12%]">数量</th>
                    <th className="p-2 border-b w-[26%]">スキャン仕様</th>
                    <th className="p-2 border-b w-[18%]">付帯</th>
                    <th className="p-2 border-b w-[18%]">備考</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workItems.length === 0 ? (
                    <tr>
                      <td className="p-3 text-slate-500" colSpan={5}>
                        作業項目が未入力です。
                      </td>
                    </tr>
                  ) : (
                    data.workItems.map((w) => (
                      <tr key={w.id} className="align-top">
                        <td className="p-2 border-b">
                          <div className="font-medium text-slate-900">{w.title}</div>
                          <div className="text-[11px] text-slate-600">
                            サイズ:{sizeLabel(w.sizeClass)} / 色:{colorModeLabel(w.colorMode)} / 解像度:{dpiLabel(w.dpi)}
                          </div>
                        </td>
                        <td className="p-2 border-b">
                          {toInt(w.qty)} {w.unit}
                        </td>
                        <td className="p-2 border-b">
                          <div>形式: {w.formats.map(formatLabel).join(", ")}</div>
                          <div>取扱: {handlingLabel(w.handling)}</div>
                        </td>
                        <td className="p-2 border-b">
                          <div>OCR: {w.ocr ? "あり" : "なし"}</div>
                          <div>メタデータ: {metadataLabel(w.metadataLevel)}</div>
                        </td>
                        <td className="p-2 border-b whitespace-pre-wrap">{w.notes || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs font-semibold text-slate-700">備品・実費（自由入力）</div>
            <div className="mt-2">
              {data.miscExpenses.length === 0 ? (
                <div className="text-sm text-slate-500">登録なし</div>
              ) : (
                <div className="space-y-1">
                  {data.miscExpenses.map((m) => (
                    <div key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <div className="text-slate-800">{m.label || "（名称未入力）"}</div>
                      <div className="font-mono text-slate-900">{fmtJPY(m.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs font-semibold text-slate-700">備考</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-slate-900">{data.notes || "（未入力）"}</div>
          </div>
        </div>
      </Page>
    </div>
  );
}