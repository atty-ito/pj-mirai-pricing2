import { ReactNode } from "react";
import { Data, WorkItem } from "../../types/pricing";
import { CalcResult, LineItem } from "../../utils/calculations";
import { 
  fmtJPY, 
  formatJPDate, 
  suggestQuotationNo, 
  num 
} from "../../utils/formatters";
import { 
  TIER_BASE_PER_UNIT, 
  FORMAT_ADDER, 
  PROJECT_FIXED_FEES 
} from "../../constants/coefficients";
import { SealBox } from "../../components/common/SealBox";

/**
 * 帳票の共通ヘッダー
 */
function DocHeader({ docTitle, data, showDueDate = true }: { docTitle: string; data: Data; showDueDate?: boolean }) {
  const qno = data.quotationNo || suggestQuotationNo(data.issueDate);
  return (
    <div className="mb-4">
      <div className="grid grid-cols-2 gap-4 text-[11px] leading-relaxed text-slate-800">
        <div>
          <div className="font-semibold">宛先</div>
          <div>{data.clientName || "（顧客名）"} 御中</div>
          <div>担当：{data.contactName || "（担当者）"}</div>
        </div>
        <div className="text-right">
          <div className="flex items-start justify-end gap-3">
            <div className="text-right">
              <div className="font-semibold">{data.issuerOrg}</div>
              <div>{data.issuerRep}</div>
              <div>{data.issuerAddress}</div>
              <div>TEL {data.issuerTel}　FAX {data.issuerFax}</div>
              {qno ? <div>見積No：{qno}</div> : null}
              <div>発行日：{data.issueDate || "—"}</div>
              {showDueDate ? <div>有効期限：{data.dueDate || "—"}</div> : null}
            </div>
            <div className="pt-1"><SealBox /></div>
          </div>
        </div>
      </div>
      <div className="mt-3 text-center">
        <div className="text-lg font-semibold tracking-wide text-slate-900">{docTitle}</div>
        <div className="mt-1 text-sm text-slate-800">件名：{data.projectName || "（案件名）"}</div>
      </div>
      <div className="mt-3 border-t border-slate-300" />
    </div>
  );
}

/**
 * 帳票の共通フッター
 */
function DocFooter({ pageNo, totalPages, note }: { pageNo: number; totalPages: number; note?: string }) {
  return (
    <div className="mt-auto pt-3 border-t border-slate-300 text-[11px] text-slate-700 flex items-end justify-between gap-4">
      <div className="leading-relaxed">{note ?? "本書は、入力条件に基づく見積書（ドラフト）である。数量・要件の確定に伴い、金額は増減し得る。"}</div>
      <div className="tabular-nums">{pageNo}/{totalPages}</div>
    </div>
  );
}

/**
 * 印刷用1ページ分の外枠
 */
function DocPage({ children, header, footer }: { children: ReactNode; header: ReactNode; footer: ReactNode }) {
  return (
    <div className="print-page bg-white flex flex-col px-6 py-6 shadow-sm border mb-8">
      {header}
      <div className="flex-1">{children}</div>
      {footer}
    </div>
  );
}

/**
 * 明細テーブル
 */
function LineItemTable({ items }: { items: LineItem[] }) {
  return (
    <table className="w-full text-sm mt-4">
      <thead>
        <tr className="border-b bg-slate-50">
          <th className="py-2 px-2 text-left font-semibold text-slate-700">摘要</th>
          <th className="py-2 px-2 text-right font-semibold text-slate-700">数量</th>
          <th className="py-2 px-2 text-left font-semibold text-slate-700">単位</th>
          <th className="py-2 px-2 text-right font-semibold text-slate-700">単価</th>
          <th className="py-2 px-2 text-right font-semibold text-slate-700">金額</th>
        </tr>
      </thead>
      <tbody>
        {items.map((li, idx) => (
          <tr key={idx} className="border-b">
            <td className="py-2 px-2">
              <div className="text-slate-900">{li.label}</div>
              {li.note && <div className="text-[10px] text-slate-500 leading-tight">{li.note}</div>}
            </td>
            <td className="py-2 px-2 text-right tabular-nums">{li.qty.toLocaleString()}</td>
            <td className="py-2 px-2">{li.unit}</td>
            <td className="py-2 px-2 text-right tabular-nums">{fmtJPY(li.unitPrice)}</td>
            <td className="py-2 px-2 text-right tabular-nums">{fmtJPY(li.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type Props = {
  data: Data;
  calc: CalcResult;
};

export function EstimateView({ data, calc }: Props) {
  const totalPages = (data.includeQuotation ? 1 : 0) + 
                     (data.includePriceRationalePage ? 1 : 0) + 
                     (data.includeFixedCostRationalePage ? 1 : 0);
  let currentPage = 0;

  return (
    <div className="space-y-4">
      {/* 1. 見積書 本紙 */}
      {data.includeQuotation && (
        <DocPage
          header={<DocHeader docTitle="見積書" data={data} />}
          footer={<DocFooter pageNo={++currentPage} totalPages={totalPages} />}
        >
          <div className="mt-4 grid grid-cols-[100px_1fr] gap-y-2 text-sm text-slate-900 border-b pb-4">
            <div className="font-medium">見積合計</div>
            <div className="font-bold text-xl tabular-nums">{fmtJPY(calc.total)}（税込）</div>
          </div>

          <LineItemTable items={calc.lineItems} />

          <div className="mt-4 flex justify-end">
            <table className="w-64 text-sm">
              <tbody>
                <tr>
                  <td className="py-1 text-slate-600">小計（税抜）</td>
                  <td className="py-1 text-right tabular-nums">{fmtJPY(calc.subtotal)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-slate-600">消費税（10%）</td>
                  <td className="py-1 text-right tabular-nums">{fmtJPY(calc.tax)}</td>
                </tr>
                <tr className="border-t-2 border-slate-900">
                  <td className="py-2 font-bold">合計（税込）</td>
                  <td className="py-2 text-right font-bold tabular-nums text-lg">{fmtJPY(calc.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </DocPage>
      )}

      {/* 2. 単価算定根拠（別紙） */}
      {data.includePriceRationalePage && (
        <DocPage
          header={<DocHeader docTitle="単価算定根拠（別紙）" data={data} />}
          footer={<DocFooter pageNo={++currentPage} totalPages={totalPages} />}
        >
          <div className="text-[11px] text-slate-600 mb-4">※各作業項目の単価は、基礎単価に諸条件の加算を行い、検査倍率を乗じて算出しています。</div>
          <div className="space-y-6">
            {data.workItems.map((w) => {
              const bd = calc.unitBreakdowns[w.id];
              if (!bd) return null;
              return (
                <div key={w.id} className="border p-3 rounded">
                  <div className="font-bold text-sm border-b pb-1 mb-2">{w.title}</div>
                  <table className="w-full text-[11px]">
                    <tbody>
                      <tr><td>基礎単価（プラン）</td><td className="text-right tabular-nums">{fmtJPY(bd.base)}</td></tr>
                      <tr><td>サイズ加算</td><td className="text-right tabular-nums">+{fmtJPY(bd.size)}</td></tr>
                      <tr><td>色/解像度加算</td><td className="text-right tabular-nums">+{fmtJPY(bd.color + bd.dpi)}</td></tr>
                      <tr><td>形式/OCR/メタ加算</td><td className="text-right tabular-nums">+{fmtJPY(bd.formats + bd.ocr + bd.metadata)}</td></tr>
                      <tr className="border-t font-bold"><td>小計</td><td className="text-right tabular-nums">{fmtJPY(bd.subtotal)}</td></tr>
                      <tr><td>検査倍率</td><td className="text-right tabular-nums">× {bd.inspectionMultiplier.toFixed(2)}</td></tr>
                      <tr className="border-t-2 text-sm font-black"><td>適用単価（1ユニット当り）</td><td className="text-right tabular-nums">{fmtJPY(bd.finalUnitPrice)}</td></tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </DocPage>
      )}

      {/* 3. 案件固定費算定根拠（別紙） */}
      {data.includeFixedCostRationalePage && (
        <DocPage
          header={<DocHeader docTitle="案件固定費算定根拠（別紙）" data={data} />}
          footer={<DocFooter pageNo={++currentPage} totalPages={totalPages} />}
        >
          <div className="text-xs text-slate-700 leading-relaxed space-y-4">
             <div className="p-4 bg-slate-50 border rounded">
                <div className="font-bold mb-2">初期セットアップ費</div>
                <p>案件要件の確認、納品フォルダ構成・命名規則の確定、帳票テンプレートの初期化、作業環境・セキュリティ設定等の初期コストです。</p>
             </div>
             <div className="p-4 bg-slate-50 border rounded">
                <div className="font-bold mb-2">進行管理・品質管理費</div>
                <p>工程管理（進捗・納期管理）、品質基準の適用、顧客窓口業務、検査計画の策定および是正指示、納品前チェックに関わる役務コストです。</p>
             </div>
          </div>
        </DocPage>
      )}
    </div>
  );
}