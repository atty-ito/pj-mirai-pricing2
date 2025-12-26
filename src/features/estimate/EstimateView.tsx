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

// ----------------------------------------------------------------------
// コンポーネント: 帳票ヘッダー (連絡先・本社併記版)
// ----------------------------------------------------------------------
function DocHeader({ title, data }: { title: string; data: Data }) {
  const qno = data.quotationNo || suggestQuotationNo(data.createdDate);
  
  return (
    <div className="mb-8 border-b-2 border-slate-800 pb-6">
      <div className="flex justify-between items-start">
        {/* 左側: 宛先情報 */}
        <div className="w-[55%] space-y-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-wider mb-4">
              {title}
            </h1>
            <div className="text-lg underline decoration-slate-400 decoration-1 underline-offset-4 font-bold">
              件名： {data.subject}
            </div>
          </div>
          
          <div className="pl-2 border-l-4 border-slate-200">
            <div className="text-xl font-bold mb-1">
              {data.customerName} {data.jurisdiction} 御中
            </div>
            <div className="text-sm text-slate-600">
              ご担当：{data.contactName} 様
            </div>
          </div>
        </div>

        {/* 右側: 発行元情報 (本社・連絡先併記) */}
        <div className="w-[45%] text-right text-[10.5pt] leading-relaxed font-serif">
          <div className="mb-3">
            <div className="text-[9pt] text-slate-500">見積No. <span className="font-mono text-lg text-slate-900 font-bold">{qno}</span></div>
            <div className="text-[9pt] text-slate-500">発行日: <span className="text-slate-900">{data.createdDate}</span></div>
          </div>

          {/* 会社名・代表者 */}
          <div className="font-bold text-lg mb-1">{data.issuerOrg || ISSUER.org}</div>
          <div className="text-sm mb-3">{ISSUER.rep}</div>

          {/* 連絡先 (実務拠点) */}
          <div className="mb-2">
            <div className="font-bold text-[9pt] border-b border-slate-300 inline-block mb-1">
              【連絡先・送付先】 {ISSUER.dept}
            </div>
            <div>〒{ISSUER.zip} {ISSUER.address}</div>
            <div>TEL: {ISSUER.tel} / FAX: {ISSUER.fax}</div>
            <div>Email: {ISSUER.email}</div>
          </div>

          {/* 本社所在地 */}
          <div className="text-[9pt] text-slate-500 mt-2">
            <div>【本社】 {ISSUER.hqAddress}</div>
            <div>登録番号: {ISSUER.regist_no}</div>
          </div>

          {/* 印鑑欄 */}
          <div className="mt-4 flex justify-end gap-3">
            <SealBox label={data.salesManager} />
            <SealBox label="社印" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// コンポーネント: 帳票フッター
// ----------------------------------------------------------------------
function DocFooter({ page, total }: { page: number; total: number }) {
  return (
    <div className="mt-auto pt-4 border-t border-slate-300 flex justify-between text-[9pt] text-slate-500 font-serif">
      <div>{ISSUER.org} - Confidential / {ISSUER.cert}</div>
      <div>Page {page}</div>
    </div>
  );
}

// ----------------------------------------------------------------------
// コンポーネント: ページレイアウト
// ----------------------------------------------------------------------
function Page({ children }: { children: ReactNode }) {
  return (
    <div className="print-page bg-white p-[20mm] min-h-[297mm] shadow-sm border mb-8 flex flex-col font-serif relative text-slate-900">
      {children}
    </div>
  );
}

// ----------------------------------------------------------------------
// メイン: 見積書ビュー
// ----------------------------------------------------------------------
export function EstimateView({ data, calc }: Props) {
  return (
    <div className="space-y-8">
      {/* 1枚目：見積書 本紙 */}
      <Page>
        <DocHeader title="御 見 積 書" data={data} />
        
        {/* 合計金額エリア */}
        <div className="mb-8 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex justify-between items-end border-b border-slate-800 pb-2 mb-2">
            <div className="text-sm font-bold pt-2">御見積合計金額（消費税込）</div>
            <div className="text-4xl font-bold font-mono tracking-tight">
              {fmtJPY(calc.total)}
            </div>
          </div>
          <div className="text-right text-sm text-slate-600 font-mono">
            (税抜価格 {fmtJPY(calc.subtotal)} + 消費税(10%) {fmtJPY(calc.tax)})
          </div>
        </div>

        {/* 明細テーブル (カラム分離版) */}
        <div className="flex-1">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-t-2 border-b border-slate-600 text-slate-800">
                <th className="py-2 px-2 text-center w-8">No</th>
                <th className="py-2 px-2 text-left w-16">区分</th>
                <th className="py-2 px-2 text-left w-48">品名</th>
                <th className="py-2 px-2 text-left">仕様・摘要 (積算根拠)</th>
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
                  <td className="py-3 px-2 align-top text-slate-500 font-mono text-[10px] pt-3.5">
                    {item.phase}
                  </td>
                  <td className="py-3 px-2 align-top">
                    <div className="font-bold text-slate-800 text-[10.5pt]">{item.name}</div>
                  </td>
                  {/* 摘要カラムを独立化 */}
                  <td className="py-3 px-2 align-top">
                    <div className="text-slate-700 whitespace-pre-wrap leading-tight mb-1">
                      {item.spec}
                    </div>
                    {/* 積算根拠を目立たないが読める形で表示 */}
                    <div className="text-[9pt] text-slate-500 font-mono bg-slate-50/50 p-1 rounded">
                      {item.explain}
                    </div>
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

        {/* 備考・条件欄 */}
        <div className="mt-8 border border-slate-400 p-4 text-[10pt] leading-relaxed bg-white">
          <div className="font-bold mb-2 border-b border-slate-200 pb-1 w-full flex justify-between">
            <span>【前提条件・備考】</span>
            <span className="font-normal text-[9pt] text-slate-500">※本条件に基づき積算しております</span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <div className="flex gap-2">
              <span className="font-bold min-w-[4em]">有効期限:</span>
              <span>発行日より1ヶ月間</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold min-w-[4em]">納期:</span>
              <span>{data.deadline} ({data.deadlineType})</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold min-w-[4em]">納品媒体:</span>
              <span>{data.deliveryMedia.join(", ")} ({data.mediaCount}セット)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold min-w-[4em]">作業場所:</span>
              <span>{data.workLocation}</span>
            </div>
            <div className="flex gap-2 col-span-2">
              <span className="font-bold min-w-[4em]">特記事項:</span>
              <span>原本の劣化状況等により、作業工程の変更や追加費用が発生する場合がございます。</span>
            </div>
            {data.notes && (
              <div className="flex gap-2 col-span-2 mt-1 pt-1 border-t border-dotted border-slate-300 text-slate-700">
                <span className="font-bold min-w-[4em]">備考:</span>
                <span>{data.notes}</span>
              </div>
            )}
          </div>
        </div>

        <DocFooter page={1} total={data.includePriceRationalePage ? 2 : 1} />
      </Page>

      {/* 2枚目：単価算定根拠（別紙） */}
      {data.includePriceRationalePage && (
        <Page>
          <DocHeader title="単価算定根拠（別紙）" data={data} />
          
          <div className="mb-4 text-sm text-slate-600">
            <p>本見積における変動費（L3 作業項目）の単価は、以下の要素に基づき算出されています。</p>
            <ul className="list-disc list-outside pl-5 mt-2 text-xs space-y-1">
              <li><strong>Base (基準単価):</strong> 選択されたプラン「{data.tier.toUpperCase()}」に基づく基本料金。</li>
              <li><strong>Factor (係数):</strong> 原本状態(C)、品質要件(Q)、付帯工程(P)等の積算係数（上限設定あり）。</li>
              <li><strong>Adders (加算):</strong> サイズ、形式等による固定加算額。</li>
            </ul>
          </div>

          <div className="flex-1 space-y-6">
            {Object.entries(calc.unitBreakdowns).map(([id, bd]) => {
              // 対応する作業項目を検索
              const workItem = data.workItems.find(w => w.id === id);
              if (!workItem) return null;

              return (
                <div key={id} className="border border-slate-300 rounded p-4 break-inside-avoid">
                  <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                    <h3 className="font-bold text-lg">{workItem.title}</h3>
                    <div className="text-sm bg-slate-100 px-3 py-1 rounded">
                      最終単価: <span className="font-bold font-mono text-lg">{fmtJPY(bd.unitPrice)}</span> / {workItem.unit}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 text-xs">
                    <div>
                      <h4 className="font-bold mb-2 text-slate-700">1. 仕様条件</h4>
                      <table className="w-full border-collapse border border-slate-200">
                        <tbody>
                          <tr><th className="border p-1 bg-slate-50 text-left">サービス</th><td className="border p-1">{workItem.service}</td></tr>
                          <tr><th className="border p-1 bg-slate-50 text-left">サイズ</th><td className="border p-1">{workItem.sizeClass}</td></tr>
                          <tr><th className="border p-1 bg-slate-50 text-left">解像度</th><td className="border p-1">{workItem.resolution}</td></tr>
                          <tr><th className="border p-1 bg-slate-50 text-left">色空間</th><td className="border p-1">{workItem.colorSpace}</td></tr>
                          <tr><th className="border p-1 bg-slate-50 text-left">形式</th><td className="border p-1">{workItem.fileFormats.join(",")}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2 text-slate-700">2. 算定ロジック詳細</h4>
                      <table className="w-full border-collapse border border-slate-200 font-mono">
                        <tbody>
                          <tr>
                            <th className="border p-1 bg-blue-50 text-left">Base (基準)</th>
                            <td className="border p-1 text-right">{fmtJPY(bd.base)}</td>
                          </tr>
                          <tr>
                            <th className="border p-1 bg-emerald-50 text-left">Factor (係数)</th>
                            <td className="border p-1 text-right">
                              x {bd.factors.capped.toFixed(2)}
                              <div className="text-[9px] text-slate-500">
                                (raw: {bd.factors.raw.toFixed(2)})
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <th className="border p-1 bg-orange-50 text-left">Adders (加算)</th>
                            <td className="border p-1 text-right">
                              + {fmtJPY(bd.sizeAdder + bd.formatAdder)}
                            </td>
                          </tr>
                          <tr className="border-t-2 border-slate-400 font-bold">
                            <th className="border p-1 text-left">算出結果</th>
                            <td className="border p-1 text-right">{fmtJPY(bd.unitPrice)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="mt-2 text-[9px] text-slate-500">
                        ※ Factor内訳: C={bd.factors.c.toFixed(2)}, Q={bd.factors.q.toFixed(2)}, P={bd.factors.p.toFixed(2)}, I={bd.factors.i.toFixed(2)}, K={bd.factors.k.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DocFooter page={2} total={2} />
        </Page>
      )}
    </div>
  );
}