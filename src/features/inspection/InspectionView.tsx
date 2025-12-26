import { Data } from "../../types/pricing";
import { 
  formatJPDate, 
  suggestInspectionReportNo, 
  allocateInspectionReportNo,
  inspectionLabel,
  specProfilePublicLabel
} from "../../utils/formatters";
import { Card } from "../../components/common/Card";
import { TextField } from "../../components/common/TextField";
import { SelectField } from "../../components/common/SelectField";
import { NumberField } from "../../components/common/NumberField";
import { TextAreaField } from "../../components/common/TextAreaField";
import { TinyButton } from "../../components/common/TinyButton";
import { InlineSealBox } from "../../components/common/InlineSealBox";

type Props = {
  data: Data;
  setData: React.Dispatch<React.SetStateAction<Data>>;
};

function getOverallLabel(v: Data["inspectionOverall"]) {
  if (v === "pass") return "合格";
  if (v === "conditional") return "条件付合格";
  return "不合格";
}

export function InspectionView({ data, setData }: Props) {
  const inspectionIssueDate = data.inspectionIssueDate || data.issueDate;
  const inspectionReportNo = data.inspectionReportNo || suggestInspectionReportNo(inspectionIssueDate);

  // 仕様フラグの判定
  const requireMetadata = data.specProfile === "gunma" ? data.gunmaMetadataMandatory : data.specProfile === "ndl";
  const requireMedia = data.specProfile === "gunma" ? data.gunmaMediaRequirements : data.specProfile === "ndl";
  const isFullInspection = data.specProfile === "gunma" ? data.gunmaAllInspection : (data.inspectionLevel === "full" || data.inspectionLevel === "double_full");

  // 検査項目リスト（元のApp.tsxから完全復元）
  const inspectionItems = [
    ["画像欠落", "画像番号の連続性・欠落0件"],
    ["傾き/天地", "許容範囲内（仕様書準拠）"],
    ["解像度/色", "指定プロファイル・dpi準拠"],
    ["ファイル名規則", "命名規則どおり"],
    ["フォルダ構成", "指定構成どおり"],
    ["ログ/チェックサム", "記録整合／チェックサム一致"],
    ["メタデータ", requireMetadata ? "必須項目の完全性（欠落なし）" : "基本項目の整合性"],
    ["媒体格納", requireMedia ? "媒体要件準拠・ウイルスチェック" : "指定媒体への格納"],
  ];

  return (
    <div className="space-y-4">
      {/* 入力UIエリア（印刷時は非表示） */}
      <div className="no-print">
        <Card title="検査結果の入力" tone="indigo" subtitle="この内容は下の「検査結果報告書」に反映されます">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8">
              <TextField
                label="検査報告No"
                value={data.inspectionReportNo}
                onChange={(v) => setData((p) => ({ ...p, inspectionReportNo: v }))}
              />
            </div>
            <div className="col-span-4 flex items-end gap-2">
              <TinyButton label="採番" kind="primary" onClick={() => setData((p) => ({ ...p, inspectionReportNo: allocateInspectionReportNo(inspectionIssueDate) }))} />
            </div>

            <div className="col-span-6">
              <TextField label="発行日" value={data.inspectionIssueDate} onChange={(v) => setData((p) => ({ ...p, inspectionIssueDate: v }))} />
            </div>
            <div className="col-span-6">
              <TextField label="検査実施日" value={data.inspectionDate} onChange={(v) => setData((p) => ({ ...p, inspectionDate: v }))} />
            </div>

            <div className="col-span-4">
              <SelectField<Data["inspectionOverall"]>
                label="総合判定"
                value={data.inspectionOverall}
                onChange={(v) => setData((p) => ({ ...p, inspectionOverall: v }))}
                options={[
                  { value: "pass", label: "合格" },
                  { value: "conditional", label: "条件付合格" },
                  { value: "fail", label: "不合格" },
                ]}
              />
            </div>
            <div className="col-span-4">
              <NumberField label="不備件数" value={data.inspectionDefectCount} onChange={(v) => setData((p) => ({ ...p, inspectionDefectCount: v }))} suffix="件" />
            </div>
            <div className="col-span-4">
              <NumberField label="再作業数" value={data.inspectionReworkCount} onChange={(v) => setData((p) => ({ ...p, inspectionReworkCount: v }))} suffix="件" />
            </div>

            <div className="col-span-12">
              <TextAreaField
                label="検査所見（特記事項）"
                value={data.inspectionRemarks}
                onChange={(v) => setData((p) => ({ ...p, inspectionRemarks: v }))}
                rows={4}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* 帳票本体（A4 印刷用） */}
      <div className="print-page bg-white p-10 shadow-sm border min-h-[297mm] text-slate-800 flex flex-col">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold border-b-2 border-slate-900 inline-block pb-1">検査結果報告書</h1>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm mb-10">
          <div className="space-y-2">
            <div><span className="font-semibold">顧客名：</span>{data.clientName} 御中</div>
            <div><span className="font-semibold">案件名：</span>{data.projectName}</div>
            <div><span className="font-semibold">仕様レベル：</span>{specProfilePublicLabel(data.specProfile)}</div>
          </div>
          <div className="text-right space-y-1">
            <div>報告No：{inspectionReportNo}</div>
            <div>発行日：{formatJPDate(inspectionIssueDate)}</div>
            <div>検査日：{formatJPDate(data.inspectionDate)}</div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded border mb-8">
          <div className="text-base font-bold mb-3 border-b border-slate-300 pb-1">1. 総合判定</div>
          <div className="flex items-center gap-10">
            <div className="text-xl font-black">{getOverallLabel(data.inspectionOverall)}</div>
            <div className="text-sm space-y-1">
              <div>不備件数：{data.inspectionDefectCount} 件</div>
              <div>再作業数：{data.inspectionReworkCount} 件</div>
              <div>検査レベル：{isFullInspection ? "全数検査" : `標準（${inspectionLabel(data.inspectionLevel)}）`}</div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="text-base font-bold mb-3 border-b border-slate-300 pb-1">2. 検査項目および結果</div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 w-10">No</th>
                <th className="border p-2">検査項目</th>
                <th className="border p-2">判定基準</th>
                <th className="border p-2 w-32 text-center">結果</th>
                <th className="border p-2">備考</th>
              </tr>
            </thead>
            <tbody>
              {inspectionItems.map(([item, criteria], i) => (
                <tr key={i}>
                  <td className="border p-2 text-center">{i + 1}</td>
                  <td className="border p-2 font-semibold">{item}</td>
                  <td className="border p-2 text-slate-600">{criteria}</td>
                  <td className="border p-2 text-center text-slate-700">□適合 / □不適合</td>
                  <td className="border p-2 text-slate-400">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex-1 border p-4 rounded mb-10">
          <div className="text-sm font-bold mb-2">3. 検査所見・特記事項</div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap min-h-[100px]">
            {data.inspectionRemarks || "（特記事項なし）"}
          </div>
        </div>

        <div className="mt-auto grid grid-cols-3 gap-4 text-xs">
          <div className="border-t pt-2">検査担当者：{data.inspectionInspector || "（氏名）"}<InlineSealBox /></div>
          <div className="border-t pt-2 text-center">承認者：{data.inspectionApprover || "（氏名）"}<InlineSealBox /></div>
          <div className="border-t pt-2 text-right">発行元：{data.issuerOrg}</div>
        </div>
      </div>
    </div>
  );
}