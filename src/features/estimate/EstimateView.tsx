import { ReactNode } from "react";
import { Data, Tier } from "../../types/pricing";
import { CalcResult, LineItem } from "../../utils/calculations";
import { 
  fmtJPY, 
  suggestQuotationNo, 
  num, 
  sizeLabel, 
  colorModeLabel, 
  dpiLabel, 
  formatLabel, 
  metadataLabel, 
  handlingLabel, 
  inspectionLabel,
  tierLabel 
} from "../../utils/formatters";
import { 
  FORMAT_ADDER, 
  PROJECT_FIXED_FEES,
  ADDON_FIXED_FEES 
} from "../../constants/coefficients";
import { SealBox } from "../../components/common/SealBox";

/**
 * 固定費の内訳行データ型
 */
type FixedCostRow = {
  code: string;
  label: string;
  enabled: boolean;
  amount: number;
  rationale: string;
};

/**
 * 案件固定費の行データを生成する（元のApp.tsxから完全復元）
 */
function buildFixedCostRows(data: Data): FixedCostRow[] {
  const fixed = PROJECT_FIXED_FEES[data.tier];
  return [
    {
      code: "F0",
      label: "初期セットアップ費（案件固定）",
      enabled: true,
      amount: fixed.setup,
      rationale:
        "仕様確定〜作業設計、命名規則・メタデータ定義、サンプル検証、環境・帳票の初期セットアップ等。",
    },
    {
      code: "F1",
      label: "進行管理・品質管理費（案件固定）",
      enabled: true,
      amount: fixed.management,
      rationale:
        "工程管理、品質レビュー、問合せ窓口、差戻し・再作業の統制、納品前チェック、証跡管理等。",
    },
    {
      code: "F2",
      label: "燻蒸（防カビ・防虫）",
      enabled: data.includeFumigation,
      amount: ADDON_FIXED_FEES.fumigation,
      rationale: "防カビ・防虫のための燻蒸工程（資材・手配・作業）を含みます。",
    },
    {
      code: "F3",
      label: "長期保存用資材への格納（ラベル・封緘等含む）",
      enabled: data.includePacking,
      amount: ADDON_FIXED_FEES.packing,
      rationale: "保存箱・中性紙封筒等への格納、ラベル・封緘、簿冊単位の管理等を含みます。",
    },
    {
      code: "F4",
      label: "集荷・納品（梱包・輸送手配含む）",
      enabled: data.includePickupDelivery,
      amount: ADDON_FIXED_FEES.pickupDelivery,
      rationale: "梱包・輸送手配・受領／引渡しの立会い等を含みます。",
    },
    {
      code: "F5",
      label: "現地作業（臨時設営・動線確保等）",
      enabled: data.includeOnsite,
      amount: ADDON_FIXED_FEES.onsite,
      rationale: "現地での臨時設営、動線確保、作業スペース調整等を含みます。",
    },
    {
      code: "F6",
      label: "暗号化・アクセス制御（媒体暗号化／鍵管理等）",
      enabled: data.includeEncryption,
      amount: ADDON_FIXED_FEES.encryption,
      rationale: "媒体暗号化、鍵管理、アクセス制御（必要に応じたログ運用）等を含みます。",
    },
  ];
}

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
                  <td className="py-1 text-slate-600">消費税（{Math.round(data.taxRate * 100)}%）</td>
                  <td className="py-1 text-right tabular-nums">{fmtJPY(calc.tax)}</td>
                </tr>
                <tr className="border-t-2 border-slate-900">
                  <td className="py-2 font-bold">合計（税込）</td>
                  <td className="py-2 text-right font-bold tabular-nums text-lg">{fmtJPY(calc.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-[11px] text-slate-800 leading-relaxed">
            <div>※上記見積には消費税が含まれます。</div>
            <div>※本見積書の内容は、お見積り日より1ヶ月間有効とします。</div>
          </div>

          <div className="mt-4 text-[11px] text-slate-800 leading-relaxed">
            <div className="font-semibold mb-1">備考</div>
            <div>☆保管環境：温度 10～30℃、湿度 80%RH以下</div>
            <div>
              ☆セキュリティ：施錠・暗証番号管理（個人の暗証番号を設定し、個人が責任をもって管理します）
            </div>
            <div>
              ☆運搬：弊社便または宅配便を利用して（運搬時は原稿資料の各箱単位を封印し、運搬します）
            </div>
            {data.notes ? <div className="mt-1">その他：{data.notes}</div> : null}
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
            {data.workItems.map((w, i) => {
              const bd = calc.unitBreakdowns[w.id];
              if (!bd) return null;
              const formatParts = w.formats.map((f) => formatLabel(f)).join(", ");
              return (
                <div key={w.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-baseline justify-between gap-3 border-b pb-2 mb-2">
                    <div className="text-sm font-semibold text-slate-800">
                      {i + 1}. {w.title || "（無題）"}
                    </div>
                    <div className="text-xs text-slate-600">
                      数量：{Math.max(0, w.qty).toLocaleString()} {w.unit}
                    </div>
                  </div>
                  <div className="mb-3 text-[11px] text-slate-600">
                    サイズ：{sizeLabel(w.sizeClass)} ／ 色：{colorModeLabel(w.colorMode)} ／ 解像度：{dpiLabel(w.dpi)} ／ 形式：{formatParts} ／ OCR：
                    {w.ocr ? "あり" : "なし"} ／ メタデータ：{metadataLabel(w.metadataLevel)} ／ 取扱：{handlingLabel(w.handling)}
                  </div>

                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="py-1 px-2 text-left w-12 font-mono text-slate-500">Code</th>
                        <th className="py-1 px-2 text-left">要素</th>
                        <th className="py-1 px-2 text-right">金額（円/単位）</th>
                        <th className="py-1 px-2 text-left">備考</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-1 px-2 font-mono">L0</td>
                        <td className="py-1 px-2">基礎単価（プラン）</td>
                        <td className="py-1 px-2 text-right tabular-nums">{fmtJPY(bd.base)}</td>
                        <td className="py-1 px-2">プラン：{tierLabel(data.tier)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-mono">L1</td>
                        <td className="py-1 px-2">サイズ加算</td>
                        <td className="py-1 px-2 text-right tabular-nums">{fmtJPY(bd.size)}</td>
                        <td className="py-1 px-2">{sizeLabel(w.sizeClass)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-mono">L2</td>
                        <td className="py-1 px-2">色加算</td>
                        <td className="py-1 px-2 text-right tabular-nums">{fmtJPY(bd.color)}</td>
                        <td className="py-1 px-2">{colorModeLabel(w.colorMode)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-mono">L3</td>
                        <td className="py-1 px-2">解像度加算</td>
                        <td className="py-1 px-2 text-right tabular-nums">{fmtJPY(bd.dpi)}</td>
                        <td className="py-1 px-2">{dpiLabel(w.dpi)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-mono">L4</td>
                        <td className="py-1 px-2">形式加算</td>
                        <td className="py-1 px-2 text-right tabular-nums">{fmtJPY(bd.formats)}</td>
                        <td className="py-1 px-2">{formatParts || "—"}</td>
                      </tr>
                      {/* フォーマットが複数ある場合の内訳表示（完全復元） */}
                      {w.formats.length > 1 && w.formats.map((f, idx) => (
                        <tr key={String(f) + idx} className="text-slate-500">
                          <td className="py-1 px-2 font-mono pl-4">L4-{idx + 1}</td>
                          <td className="py-1 px-2 pl-4">└ {formatLabel(f)}</td>
                          <td className="py-1 px-2 text-right tabular-nums">({fmtJPY(FORMAT_ADDER[f] ?? 0)})</td>
                          <td className="py-1 px-2">個別加算</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="py-1 px-2 font-mono">L5</td>
                        <td className="py-1 px-2">OCR加算</td>
                        <td className="py-1 px-2 text-right tabular-nums">{fmtJPY(bd.ocr)}</td>
                        <td className="py-1 px-2">{w.ocr ? "OCRあり" : "OCRなし"}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-mono">L6</td>
                        <td className="py-1 px-2">メタデータ加算</td>
                        <td className="py-1 px-2 text-right tabular-nums">{fmtJPY(bd.metadata)}</td>
                        <td className="py-1 px-2">{metadataLabel(w.metadataLevel)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-mono">L7</td>
                        <td className="py-1 px-2">取扱加算</td>
                        <td className="py-1 px-2 text-right tabular-nums">{fmtJPY(bd.handling)}</td>
                        <td className="py-1 px-2">{handlingLabel(w.handling)}</td>
                      </tr>

                      <tr className="bg-slate-50 font-semibold border-t border-slate-200">
                        <td className="py-1 px-2 font-mono">A1</td>
                        <td className="py-1 px-2">小計（検査倍率前）</td>
                        <td className="py-1 px-2 text-right tabular-nums">{fmtJPY(bd.subtotal)}</td>
                        <td className="py-1 px-2">L0〜L7の合算</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-mono">M1</td>
                        <td className="py-1 px-2">検査倍率</td>
                        <td className="py-1 px-2 text-right tabular-nums">×{bd.inspectionMultiplier.toFixed(2)}</td>
                        <td className="py-1 px-2">{inspectionLabel(data.inspectionLevel)}</td>
                      </tr>
                      <tr className="font-bold border-t-2 border-slate-800">
                        <td className="py-2 px-2 font-mono">P1</td>
                        <td className="py-2 px-2">最終単価</td>
                        <td className="py-2 px-2 text-right tabular-nums">{fmtJPY(bd.finalUnitPrice)}</td>
                        <td className="py-2 px-2">round(A1 × M1)</td>
                      </tr>
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
          <div className="mb-3 text-xs text-slate-600">
            本別紙は、見積書に計上される「案件固定費（初期セットアップ費／進行管理・品質管理費）」および「付帯作業（定額）」の積算根拠を、顧客向けに明示するためのものです。
          </div>

          {(() => {
            const rows = buildFixedCostRows(data);
            const fixedSubtotal = rows.filter((r) => r.enabled).reduce((s, r) => s + r.amount, 0);
            const miscSubtotal = calc.lineItems
              .filter((li) => li.kind === "misc")
              .reduce((s, li) => s + li.amount, 0);
            const subtotal = fixedSubtotal + miscSubtotal;
            const tax = Math.round(subtotal * data.taxRate);
            const total = subtotal + tax;

            return (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-3 py-2 text-sm font-semibold bg-slate-50">
                    固定費・付帯定額の内訳（F0〜）
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="py-2 px-2 text-left w-10 font-mono text-slate-500">Code</th>
                        <th className="py-2 px-2 text-left w-48">項目</th>
                        <th className="py-2 px-2 text-left w-20">適用</th>
                        <th className="py-2 px-2 text-right w-24">金額（税抜）</th>
                        <th className="py-2 px-2 text-left">算定根拠（要旨）</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((r) => (
                        <tr key={r.code}>
                          <td className="py-2 px-2 font-mono text-slate-500">{r.code}</td>
                          <td className="py-2 px-2 font-medium">{r.label}</td>
                          <td className="py-2 px-2">
                            <span
                              className={
                                r.enabled
                                  ? "inline-flex rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800"
                                  : "inline-flex rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400"
                              }
                            >
                              {r.enabled ? "ON" : "OFF"}
                            </span>
                          </td>
                          <td className={"py-2 px-2 text-right tabular-nums " + (r.enabled ? "text-slate-900" : "text-slate-300")}>
                            {fmtJPY(r.amount)}
                          </td>
                          <td className={"py-2 px-2 leading-relaxed " + (r.enabled ? "text-slate-700" : "text-slate-300")}>
                            {r.rationale}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="text-sm font-semibold">固定費・付帯定額 小計</div>
                    <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">{fmtJPY(fixedSubtotal)}</div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="text-sm font-semibold">実費（入力値） 小計</div>
                    <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">{fmtJPY(miscSubtotal)}</div>
                    <div className="mt-1 text-[10px] text-slate-500">※ 保存箱・外付けHDD等の実費入力分</div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex justify-between items-center">
                  <div className="text-sm font-semibold">本別紙 対象合計（税抜）</div>
                  <div className="text-xl font-bold tabular-nums text-slate-900">{fmtJPY(subtotal)}</div>
                </div>
              </div>
            );
          })()}
        </DocPage>
      )}
    </div>
  );
}