import { ReactNode } from "react";
import { Data } from "../../types/pricing";
import { CalcResult } from "../../utils/calculations";
import { fmtJPY, suggestQuotationNo } from "../../utils/formatters";
import { SealBox } from "../../components/common/SealBox";
import { ISSUER } from "../../constants/coefficients";

type Props = {
  data: Data;
  calc: CalcResult;
};

function DocHeader({ title, data }: { title: string; data: Data }) {
  const qno = data.quotationNo || suggestQuotationNo(data.createdDate);
  return (
    <div className="mb-8 border-b-2 border-slate-800 pb-6">
      <div className="flex justify-between items-start">
        <div className="w-[55%] space-y-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-wider mb-4">{title}</h1>
            <div className="text-lg underline decoration-slate-400 decoration-1 underline-offset-4 font-bold">件名： {data.subject}</div>
          </div>
          <div className="pl-2 border-l-4 border-slate-200">
            <div className="text-xl font-bold mb-1">{data.customerName} {data.jurisdiction} 御中</div>
            <div className="text-sm text-slate-600">ご担当：{data.contactName} 様</div>
          </div>
        </div>
        <div className="w-[45%] text-right text-[10.5pt] leading-relaxed font-serif">
          <div className="mb-3">
            <div className="text-[9pt] text-slate-500">見積No. <span className="font-mono text-lg text-slate-900 font-bold">{qno}</span></div>
            <div className="text-[9pt] text-slate-500">発行日: <span className="text-slate-900">{data.createdDate}</span></div>
          </div>
          <div className="font-bold text-lg mb-1">{data.issuerOrg || ISSUER.org}</div>
          <div className="text-sm mb-3">{ISSUER.rep}</div>
          <div className="mb-2">
            <div className="font-bold text-[9pt] border-b border-slate-300 inline-block mb-1">【連絡先・送付先】 {ISSUER.dept}</div>
            <div>〒{ISSUER.zip} {ISSUER.address}</div>
            <div>TEL: {ISSUER.tel} / FAX: {ISSUER.fax}</div>
            <div>Email: {ISSUER.email}</div>
          </div>
          <div className="text-[9pt] text-slate-500 mt-2">
            <div>【本社】 {ISSUER.hqAddress}</div>
            <div>登録番号: {ISSUER.regist_no}</div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <SealBox label={data.salesManager} />
            <SealBox label="社印" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DocFooter({ page, total }: { page: number; total: number }) {
  return (
    <div className="mt-auto pt-4 border-t border-slate-300 flex justify-between text-[9pt] text-slate-500 font-serif">
      <div>{ISSUER.org} - Confidential / {ISSUER.cert}</div>
      <div>Page {page} / {total}</div>
    </div>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="print-page bg-white p-[20mm] min-h-[297mm] shadow-sm border mb-8 flex flex-col font-serif relative text-slate-900">
      {children}
    </div>
  );
}

export function EstimateView({ data, calc }: Props) {
  const totalPages = data.includePriceRationalePage ? 2 : 1;

  return (
    <div className="space-y-8">
      {/* 1枚目：本紙 */}
      <Page>
        <DocHeader title="御 見 積 書" data={data} />
        <div className="mb-8 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex justify-between items-end border-b border-slate-800 pb-2 mb-2">
            <div className="text-sm font-bold pt-2">御見積合計金額（消費税込）</div>
            <div className="text-4xl font-bold font-mono tracking-tight">{fmtJPY(calc.total)}</div>
          </div>
          <div className="text-right text-sm text-slate-600 font-mono">
            (税抜価格 {fmtJPY(calc.subtotal)} + 消費税(10%) {fmtJPY(calc.tax)})
          </div>
        </div>

        <div className="flex-1">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-t-2 border-b border-slate-600 text-slate-800">
                <th className="py-2 px-2 text-center w-8">No</th>
                <th className="py-2 px-2 text-left w-16">区分</th>
                <th className="py-2 px-2 text-left w-48">品名</th>
                <th className="py-2 px-2 text-left">仕様・摘要</th>
                <th className="py-2 px-2 text-right w-16">数量</th>
                <th className="py-2 px-2 text-center w-10">単位</th>
                <th className="py-2 px-2 text-right w-20">単価</th>
                <th className="py-2 px-2 text-right w-24">金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 border-b border-slate-400">
              {calc.lineItems.map((item, i) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-2 text-center align-top text-slate-500">{i + 1}</td>
                  <td className="py-3 px-2 align-top text-slate-500 font-mono text-[10px] pt-3.5">{item.phase}</td>
                  <td className="py-3 px-2 align-top">
                    <div className="font-bold text-slate-800 text-[10.5pt]">{item.name}</div>
                  </td>
                  <td className="py-3 px-2 align-top">
                    <div className="text-slate-700 whitespace-pre-wrap leading-tight mb-1">{item.spec}</div>
                  </td>
                  <td className="py-3 px-2 text-right align-top font-mono text-[10.5pt] pt-3">{item.qty.toLocaleString()}</td>
                  <td className="py-3 px-2 text-center align-top text-slate-600 pt-3">{item.unit}</td>
                  <td className="py-3 px-2 text-right align-top font-mono text-[10.5pt] pt-3">{fmtJPY(item.unitPrice)}</td>
                  <td className="py-3 px-2 text-right align-top font-mono font-bold text-slate-900 text-[10.5pt] pt-3">{fmtJPY(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 border border-slate-300 p-4 text-[10pt] leading-relaxed bg-white">
          <div className="font-bold mb-2 border-b border-slate-200 pb-1 w-full flex justify-between">
            <span>【前提条件・備考】</span>
            <span className="font-normal text-[9pt] text-slate-500">※本条件に基づき積算しております</span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <div className="flex gap-2"><span className="font-bold min-w-[4em]">有効期限:</span><span>発行日より1ヶ月間</span></div>
            <div className="flex gap-2"><span className="font-bold min-w-[4em]">納期:</span><span>{data.deadline} ({data.deadlineType})</span></div>
            <div className="flex gap-2"><span className="font-bold min-w-[4em]">納品媒体:</span><span>{data.deliveryMedia.join(", ")} ({data.mediaCount}セット)</span></div>
            <div className="flex gap-2"><span className="font-bold min-w-[4em]">作業場所:</span><span>{data.workLocation}</span></div>
            <div className="flex gap-2 col-span-2"><span className="font-bold min-w-[4em]">特記事項:</span><span>原本劣化等により、作業工程の変更や追加費用が発生する場合は事前に協議いたします。</span></div>
            {data.notes && (
              <div className="flex gap-2 col-span-2 mt-1 pt-1 border-t border-dotted border-slate-300 text-slate-700">
                <span className="font-bold min-w-[4em]">備考:</span><span>{data.notes}</span>
              </div>
            )}
          </div>
        </div>
        <DocFooter page={1} total={totalPages} />
      </Page>

      {/* 2枚目：根拠説明（別紙） */}
      {data.includePriceRationalePage && (
        <Page>
          <DocHeader title="単価算定根拠（別紙）" data={data} />
          <div className="mb-6 bg-slate-50 p-4 rounded border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-2 text-sm">■ 適正価格算定ロジック</h3>
            <p className="text-xs text-slate-600 mb-2">
              本見積は、国際マイクロ写真工業社標準の「高付加価値アーカイブ算定基準 (Ver.4)」に基づき、公正な積算を行っております。
            </p>
            <div className="font-mono text-center text-lg font-bold bg-white p-2 border border-slate-300 rounded mb-2">
              Unit Price = (Base × Factor) + Adders
            </div>
            <div className="grid grid-cols-2 gap-4 text-[10pt]">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Base (基準単価):</strong> アーカイブ専門技術者による標準処理コスト</li>
                <li><strong>Factor (係数):</strong> 原本状態・要求品質・特殊工程による難易度係数</li>
              </ul>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Adders (加算):</strong> サイズ超過・特殊形式・付帯作業の固定加算</li>
                <li><strong>Cap:</strong> 係数上限 {data.factorCap.toFixed(1)}</li>
              </ul>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            {Object.entries(calc.unitBreakdowns).map(([id, bd]) => {
              const workItem = data.workItems.find(w => w.id === id);
              if (!workItem) return null;
              return (
                <div key={id} className="border border-slate-400 rounded-lg p-4 break-inside-avoid">
                  <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                    <h3 className="font-bold text-lg">■ {workItem.title}</h3>
                    <div className="text-sm bg-slate-100 px-3 py-1 rounded border border-slate-200">
                      最終単価: <span className="font-bold font-mono text-xl">{fmtJPY(bd.unitPrice)}</span> / {workItem.unit}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8 text-xs">
                    <div>
                      <h4 className="font-bold mb-2 text-white bg-slate-600 px-2 py-1 rounded-sm">1. 仕様・条件 (Inputs)</h4>
                      <table className="w-full border-collapse border border-slate-300">
                        <tbody>
                          <tr><th className="border p-1 bg-slate-50 text-left w-20">サービス</th><td className="border p-1">{workItem.service}</td></tr>
                          <tr><th className="border p-1 bg-slate-50 text-left">サイズ</th><td className="border p-1">{workItem.sizeClass}</td></tr>
                          <tr><th className="border p-1 bg-slate-50 text-left">解像度</th><td className="border p-1">{workItem.resolution}</td></tr>
                          <tr><th className="border p-1 bg-slate-50 text-left">色空間</th><td className="border p-1">{workItem.colorSpace}</td></tr>
                          <tr><th className="border p-1 bg-slate-50 text-left">形式</th><td className="border p-1">{[...workItem.fileFormats, workItem.fileFormatsFree].filter(Boolean).join(",")}</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <h4 className="font-bold mb-2 text-white bg-slate-600 px-2 py-1 rounded-sm">2. 係数加算の根拠 (Reasoning)</h4>
                      <div className="border border-slate-300 p-2 bg-white h-full">
                        {bd.factorDetails.length > 0 ? (
                          <ul className="list-disc list-inside space-y-1">
                            {bd.factorDetails.map((reason, idx) => (
                              <li key={idx} className="text-slate-700 font-bold">{reason}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-slate-400">標準仕様のため係数加算なし (Factor: 1.0)</div>
                        )}
                        <div className="mt-3 pt-2 border-t border-slate-200 text-right text-slate-500 font-mono">
                          Total Factor: x{bd.factors.capped.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <DocFooter page={2} total={totalPages} />
        </Page>
      )}
    </div>
  );
}