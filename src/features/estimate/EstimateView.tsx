import { ReactNode } from "react";
import { Data } from "../../types/pricing";
import { CalcResult, LineItem } from "../../utils/calculations";
import { fmtJPY, suggestQuotationNo } from "../../utils/formatters";
import { SealBox } from "../../components/common/SealBox";
import { ISSUER } from "../../constants/coefficients";

type Props = {
  data: Data;
  calc: CalcResult;
};

// 帳票ヘッダー
function DocHeader({ title, data }: { title: string; data: Data }) {
  const qno = data.quotationNo || suggestQuotationNo(data.createdDate);
  return (
    <div className="mb-6 border-b-2 border-slate-800 pb-4">
      <div className="flex justify-between items-start">
        <div className="w-[60%]">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
          <div className="text-sm underline decoration-slate-400 decoration-1 underline-offset-4 mb-2">
            件名： {data.subject}
          </div>
          <div className="text-sm">
            {data.customerName} {data.jurisdiction} 御中
          </div>
          <div className="text-xs text-slate-600 mt-1">
            ご担当：{data.contactName} 様
          </div>
        </div>
        <div className="w-[40%] text-right text-xs leading-relaxed">
          <div className="font-bold text-sm mb-1">{data.issuerOrg || ISSUER.org}</div>
          <div>〒162-0833 {ISSUER.address}</div>
          <div>TEL: {ISSUER.tel} / FAX: {ISSUER.fax}</div>
          <div className="mt-2">
            見積No: <span className="font-mono">{qno}</span>
          </div>
          <div>発行日: {data.createdDate}</div>
          <div>有効期限: 発行より30日</div>
          <div className="mt-2 flex justify-end gap-2">
            <SealBox label={data.salesManager} />
            <SealBox label="社印" />
          </div>
        </div>
      </div>
    </div>
  );
}

// 帳票フッター
function DocFooter({ page, total }: { page: number; total: number }) {
  return (
    <div className="mt-auto pt-4 border-t border-slate-300 flex justify-between text-[10px] text-slate-500">
      <div>{ISSUER.org} - Confidential</div>
      <div>Page {page} / {total}</div>
    </div>
  );
}

// ページコンテナ
function Page({ children }: { children: ReactNode }) {
  return (
    <div className="print-page bg-white p-[20mm] min-h-[297mm] shadow-sm border mb-8 flex flex-col font-serif relative">
      {children}
    </div>
  );
}

export function EstimateView({ data, calc }: Props) {
  // ページネーション（簡易実装：行数が多い場合は分割が必要だが、今回は1ページに収める前提）
  
  return (
    <div>
      {/* 1枚目：見積書鑑（表紙） */}
      <Page>
        <DocHeader title="御 見 積 書" data={data} />
        
        <div className="mb-8">
          <p className="text-sm mb-4">下記のとおり御見積申し上げます。</p>
          <div className="border-b-2 border-slate-800 pb-1 mb-1 flex justify-between items-end">
            <div className="text-sm font-bold">御見積合計金額（税込）</div>
            <div className="text-3xl font-bold font-mono tracking-tight">
              {fmtJPY(calc.total)}
            </div>
          </div>
          <div className="text-right text-xs text-slate-600">
            (税抜金額 {fmtJPY(calc.subtotal)} + 消費税 {fmtJPY(calc.tax)})
          </div>
        </div>

        <div className="flex-1">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-t border-b border-slate-400">
                <th className="py-2 px-2 text-center w-10">No</th>
                <th className="py-2 px-2 text-left">品名 / 仕様・摘要</th>
                <th className="py-2 px-2 text-right w-20">数量</th>
                <th className="py-2 px-2 text-center w-12">単位</th>
                <th className="py-2 px-2 text-right w-24">単価</th>
                <th className="py-2 px-2 text-right w-28">金額</th>
              </tr>
            </thead>
            <tbody>
              {calc.lineItems.map((item, i) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="py-3 px-2 text-center align-top text-slate-500">{i + 1}</td>
                  <td className="py-3 px-2 align-top">
                    <div className="font-bold text-slate-800">{item.name}</div>
                    <div className="text-slate-600 mt-1 whitespace-pre-wrap leading-tight">{item.spec}</div>
                    {/* 積算根拠を表示（ここが重要） */}
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      [{item.phase}] {item.explain}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right align-top font-mono">{item.qty.toLocaleString()}</td>
                  <td className="py-3 px-2 text-center align-top">{item.unit}</td>
                  <td className="py-3 px-2 text-right align-top font-mono">{fmtJPY(item.unitPrice)}</td>
                  <td className="py-3 px-2 text-right align-top font-mono font-medium">{fmtJPY(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 border border-slate-300 p-4 text-xs leading-relaxed">
          <div className="font-bold mb-2">【備考・条件】</div>
          <ul className="list-disc list-outside pl-4 space-y-1">
            <li>本見積の有効期限は発行日より30日間とします。</li>
            <li>作業場所：{data.workLocation}</li>
            <li>納期：{data.deadline} ({data.deadlineType})</li>
            <li>納品媒体：{data.deliveryMedia.join(", ")}</li>
            <li>原本の劣化状況により、作業工程の変更や追加費用が発生する場合がございます。その際は事前に協議させていただきます。</li>
            {data.notes && <li>その他：{data.notes}</li>}
          </ul>
        </div>

        <DocFooter page={1} total={1} />
      </Page>
    </div>
  );
}