import { Data } from "../../types/pricing";
import { SERVICE_DEFINITIONS } from "../../constants/coefficients";
import { SealBox } from "../../components/common/SealBox";
import { toInt, sizeLabel, colorModeLabel, dpiLabel } from "../../utils/formatters";

type Props = {
  data: Data;
  setData: any;
};

const CHECKLIST_ITEMS = [
  "欠落（落丁・撮り漏れがないか）",
  "重複（二重取り込みがないか）",
  "ページ順序（乱丁・反転がないか）",
  "判読性（文字潰れ・薄れ・ボケがないか）",
  "傾き・トリミング（仕様範囲内か）",
  "汚れ・異物混入（スキャナゴミ・影）",
  "色再現（色転び・階調飛びがないか）",
  "ファイル破損（正常に開けるか）",
  "命名規則・フォルダ構成の整合性",
  "ウイルスチェック・媒体動作確認",
  "情報セキュリティ（持出管理・ログ）",
];

export function InspectionView({ data }: Props) {
  return (
    <div className="print-page bg-white p-8 min-h-[297mm] text-slate-900 font-sans">
      <div className="text-center border-b-2 border-slate-900 pb-2 mb-6">
        <h1 className="text-2xl font-bold tracking-widest">検査記録表 (QA Sheet)</h1>
        <div className="text-xs text-slate-600 mt-1 text-right">Job No: {data.jobNo}</div>
      </div>

      <div className="mb-6 border border-slate-400">
        <div className="bg-slate-100 p-1 text-xs font-bold border-b border-slate-400 text-center">1. 検査条件</div>
        <div className="grid grid-cols-2 text-xs">
          <div className="p-2 border-r border-slate-400">
            <div className="flex justify-between mb-1">
              <span className="text-slate-500">案件名</span>
              <span className="font-bold">{data.subject}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-500">顧客名</span>
              <span>{data.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">検査日</span>
              <span>____年__月__日</span>
            </div>
          </div>
          <div className="p-2">
            <div className="flex justify-between mb-1">
              <span className="text-slate-500">検査深度</span>
              <span className="font-bold text-indigo-700">{data.inspectionLevel}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-500">検査責任者</span>
              <span>{data.qualityManager}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">判定</span>
              <span>□ 合格　□ 条件付合格　□ 不合格</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="text-sm font-bold mb-2">2. 共通検査項目</div>
        <table className="w-full text-xs border-collapse border border-slate-400">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-400 p-1 w-8">No</th>
              <th className="border border-slate-400 p-1">検査項目</th>
              <th className="border border-slate-400 p-1 w-24">結果</th>
              <th className="border border-slate-400 p-1 w-48">備考・是正記録</th>
            </tr>
          </thead>
          <tbody>
            {CHECKLIST_ITEMS.map((item, i) => (
              <tr key={i}>
                <td className="border border-slate-400 p-1 text-center">{i + 1}</td>
                <td className="border border-slate-400 p-1">{item}</td>
                <td className="border border-slate-400 p-1 text-center">□ OK / □ NG</td>
                <td className="border border-slate-400 p-1"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <div className="text-sm font-bold mb-2">3. 作業項目別 詳細検査</div>
        <div className="space-y-4">
          {data.workItems.map((w, idx) => (
            <div key={w.id} className="border border-slate-400 break-inside-avoid">
              <div className="bg-slate-50 p-2 border-b border-slate-400 flex justify-between items-center">
                <span className="font-bold text-xs">#{idx + 1} {w.title}</span>
                <span className="text-[10px] text-slate-600">
                  {SERVICE_DEFINITIONS[w.service]?.name} ({toInt(w.qty).toLocaleString()} {w.unit})
                </span>
              </div>
              <div className="p-2 grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-8 border-r border-slate-200 pr-2">
                  <div className="font-bold text-[10px] text-slate-500 mb-1">仕様要件</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div>サイズ: {sizeLabel(w.sizeClass)}</div>
                    <div>解像度: {dpiLabel(w.resolution)}</div>
                    <div>色空間: {colorModeLabel(w.colorSpace)}</div>
                    <div>形式: {[...w.fileFormats, w.fileFormatsFree].filter(Boolean).join(", ")}</div>
                    {data.ocr && <div>OCR: あり ({data.ocrProofread ? "校正済" : "未校正"})</div>}
                    {w.fragile && <div className="text-rose-600 font-bold">※脆弱資料</div>}
                  </div>
                </div>
                <div className="col-span-4 flex flex-col justify-center items-center">
                  <div className="mb-2">個別判定</div>
                  <div className="text-lg font-bold border border-slate-300 px-4 py-1 rounded">
                    OK / NG
                  </div>
                </div>
                <div className="col-span-12 border-t border-slate-200 pt-1 mt-1">
                  <div className="text-[10px] text-slate-400">特記事項・不具合記録</div>
                  <div className="h-8 border-b border-dotted border-slate-300"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-8 text-xs">
        <div className="text-center">
          <div className="mb-1">品質管理責任者</div>
          <SealBox label={data.qualityManager} />
        </div>
        <div className="text-center">
          <div className="mb-1">検査員</div>
          <SealBox />
        </div>
      </div>
    </div>
  );
}