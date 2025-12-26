import { Data } from "../../types/pricing";
import { SERVICE_DEFINITIONS } from "../../constants/coefficients";
import { sizeLabel, colorModeLabel, dpiLabel, formatLabel, toInt } from "../../utils/formatters";
import { SealBox } from "../../components/common/SealBox";

type Props = {
  data: Data;
  calc: any; // 指示書では計算結果（金額）は使わないが、型合わせのため維持
};

// 共通ヘッダー（社内帳票用）
function InternalHeader({ title, data }: { title: string; data: Data }) {
  return (
    <div className="border-b-2 border-slate-800 pb-4 mb-6">
      <div className="flex justify-between items-end">
        <div>
          <div className="text-3xl font-bold text-slate-900 tracking-tight">{title}</div>
          <div className="mt-2 text-sm font-mono text-slate-600">
            Job No: <span className="font-bold text-black">{data.jobNo}</span>
            <span className="mx-4">|</span>
            発行日: {data.createdDate}
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>{data.issuerOrg}</div>
          <div>品質管理責任者: {data.qualityManager}</div>
        </div>
      </div>
    </div>
  );
}

// メタ情報テーブル
function MetaTable({ data }: { data: Data }) {
  return (
    <table className="w-full text-sm border-collapse border border-slate-400 mb-6">
      <tbody>
        <tr>
          <th className="border border-slate-400 bg-slate-100 p-2 w-[15%] text-left">顧客名</th>
          <td className="border border-slate-400 p-2 w-[35%] font-bold">{data.customerName}</td>
          <th className="border border-slate-400 bg-slate-100 p-2 w-[15%] text-left">件名</th>
          <td className="border border-slate-400 p-2 w-[35%] font-bold">{data.subject}</td>
        </tr>
        <tr>
          <th className="border border-slate-400 bg-slate-100 p-2 text-left">納期</th>
          <td className="border border-slate-400 p-2">
            {data.deadline} ({data.deadlineType})
            {data.isExpress && <span className="ml-2 px-2 py-0.5 bg-rose-100 text-rose-700 text-xs rounded border border-rose-300 font-bold">{data.expressLevel}</span>}
          </td>
          <th className="border border-slate-400 bg-slate-100 p-2 text-left">作業場所</th>
          <td className="border border-slate-400 p-2">{data.workLocation}</td>
        </tr>
        <tr>
          <th className="border border-slate-400 bg-slate-100 p-2 text-left">備考</th>
          <td className="border border-slate-400 p-2" colSpan={3}>{data.notes || "特になし"}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function InstructionView({ data }: Props) {
  return (
    <div className="print-page bg-white p-8 min-h-[297mm] text-slate-900 font-sans">
      <InternalHeader title="作業指示書" data={data} />
      <MetaTable data={data} />

      <div className="space-y-6">
        {/* 1. 作業対象と仕様 */}
        <section>
          <h3 className="text-sm font-bold border-l-4 border-indigo-600 pl-2 mb-2 uppercase">1. 作業対象・技術仕様（Specifications）</h3>
          <div className="text-xs text-slate-600 mb-2">※金額情報は記載しない。現場は以下の仕様と原本条件を厳守すること。</div>
          
          <table className="w-full text-xs border-collapse border border-slate-300">
            <thead className="bg-slate-50">
              <tr>
                <th className="border border-slate-300 p-2 w-8">No</th>
                <th className="border border-slate-300 p-2">作業項目名称 / サービス区分</th>
                <th className="border border-slate-300 p-2 w-24">予定数量</th>
                <th className="border border-slate-300 p-2">スキャン仕様（解像度/色/形式）</th>
                <th className="border border-slate-300 p-2 w-48">原本条件（取扱い注意）</th>
              </tr>
            </thead>
            <tbody>
              {data.workItems.map((w, idx) => (
                <tr key={w.id}>
                  <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                  <td className="border border-slate-300 p-2">
                    <div className="font-bold text-sm">{w.title}</div>
                    <div className="text-slate-500 mt-1">{SERVICE_DEFINITIONS[w.service]?.name}</div>
                    {w.notes && <div className="mt-1 p-1 bg-yellow-50 text-yellow-800 border border-yellow-100 rounded">{w.notes}</div>}
                  </td>
                  <td className="border border-slate-300 p-2 text-right">
                    <span className="font-bold text-sm">{toInt(w.qty).toLocaleString()}</span> <span className="text-[10px]">{w.unit}</span>
                  </td>
                  <td className="border border-slate-300 p-2">
                    <div className="font-semibold">{sizeLabel(w.sizeClass)} / {dpiLabel(w.resolution)} / {colorModeLabel(w.colorSpace)}</div>
                    <div className="mt-1 text-slate-600">形式: {w.fileFormats.map(formatLabel).join(", ")}</div>
                  </td>
                  <td className="border border-slate-300 p-2">
                    <div className="flex flex-wrap gap-1">
                      {w.fragile && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded border border-rose-200 font-bold">脆弱資料</span>}
                      {w.requiresNonContact && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded border border-purple-200">非接触</span>}
                      {w.dismantleAllowed ? <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">解体可</span> : <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">解体不可</span>}
                      {w.restorationRequired && <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-100">復元必須</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="grid grid-cols-2 gap-6">
          {/* 2. 運用・プロセス条件 */}
          <section>
            <h3 className="text-sm font-bold border-l-4 border-indigo-600 pl-2 mb-2 uppercase">2. 運用・プロセス条件</h3>
            <table className="w-full text-xs border-collapse border border-slate-300">
              <tbody>
                <tr>
                  <th className="border border-slate-300 bg-slate-50 p-2 text-left w-24">搬送・受領</th>
                  <td className="border border-slate-300 p-2">
                    <div>輸送: <strong>{data.shippingType}</strong> ({data.transportDistanceKm}km x {data.transportTrips}回)</div>
                    <div>照合: {data.strictCheckIn ? "厳格照合 (リスト突合)" : "通常受領"}</div>
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-300 bg-slate-50 p-2 text-left">前処理</th>
                  <td className="border border-slate-300 p-2">
                    <div>解体: {data.unbinding} / 復元: {data.rebind ? "あり" : "なし"}</div>
                    <div>燻蒸: {data.fumigation ? "実施" : "不要"} / 合紙: {data.interleaving ? "あり" : "なし"}</div>
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-300 bg-slate-50 p-2 text-left">環境管理</th>
                  <td className="border border-slate-300 p-2">
                    {data.tempHumidLog ? <span className="font-bold text-rose-600">温湿度ログ提出 (60分間隔)</span> : "標準管理"}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* 3. 画像処理・メタデータ */}
          <section>
            <h3 className="text-sm font-bold border-l-4 border-indigo-600 pl-2 mb-2 uppercase">3. 画像処理・メタデータ</h3>
            <table className="w-full text-xs border-collapse border border-slate-300">
              <tbody>
                <tr>
                  <th className="border border-slate-300 bg-slate-50 p-2 text-left w-24">画像補正</th>
                  <td className="border border-slate-300 p-2">
                    <div>傾き補正: {data.deskew ? "ON" : "OFF"} / 反射抑制: {data.reflectionSuppression ? "ON" : "OFF"}</div>
                    <div>2値化: {data.binaryConversion ? `実施 (閾値 ${data.binaryThreshold})` : "不要"}</div>
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-300 bg-slate-50 p-2 text-left">メタデータ</th>
                  <td className="border border-slate-300 p-2">
                    <div className="font-bold">{data.namingRule}</div>
                    <div className="text-[10px] text-slate-500">構造: {data.folderStructure}</div>
                    <div className="mt-1">索引: {data.indexType}</div>
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-300 bg-slate-50 p-2 text-left">OCR</th>
                  <td className="border border-slate-300 p-2">
                    {data.ocr ? (
                      <span className="font-bold text-blue-600">実施 (校正: {data.ocrProofread ? "あり" : "なし"})</span>
                    ) : "不要"}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        {/* 4. 検査・納品 */}
        <section>
          <h3 className="text-sm font-bold border-l-4 border-indigo-600 pl-2 mb-2 uppercase">4. 品質検査・納品要件</h3>
          <div className="border border-slate-300 p-3 flex gap-8 items-center text-sm">
            <div>
              <div className="text-xs text-slate-500 font-bold">検査レベル</div>
              <div className="text-lg font-bold">{data.inspectionLevel}</div>
            </div>
            <div className="h-8 w-px bg-slate-300"></div>
            <div>
              <div className="text-xs text-slate-500 font-bold">納品媒体</div>
              <div>
                {data.deliveryMedia.join(", ")} 
                <span className="ml-2 text-xs">({data.mediaCount}セット / ラベル: {data.labelPrint ? "あり" : "なし"})</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-300"></div>
            <div>
              <div className="text-xs text-slate-500 font-bold">特記事項</div>
              <div>保管: {data.longTermStorageMonths}ヶ月 / 消去証明: {data.dataDeletionProof ? "あり" : "なし"}</div>
            </div>
          </div>
        </section>

        {/* 承認欄（フッター） */}
        <div className="mt-auto pt-8 border-t border-slate-400">
          <div className="flex justify-end gap-6 text-xs">
            <div className="text-center">
              <div className="mb-1">承認</div>
              <SealBox />
            </div>
            <div className="text-center">
              <div className="mb-1">確認</div>
              <SealBox label={data.qualityManager} />
            </div>
            <div className="text-center">
              <div className="mb-1">作成</div>
              <SealBox label={data.salesManager} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}