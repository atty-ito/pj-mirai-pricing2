import { Data, WorkItem, MiscExpense, Tier, InspectionLevel, SpecProfile, MetadataLevel, Handling, SizeClass, ColorMode, Dpi, FileFormat } from "../../types/pricing";
import { CalcResult } from "../../utils/calculations";
import { TIER_BASE_PER_UNIT } from "../../constants/coefficients";
import { fmtJPY, toInt, allocateQuotationNo, suggestQuotationNo } from "../../utils/formatters";
import { Card } from "../../components/common/Card";
import { TextField } from "../../components/common/TextField";
import { TextAreaField } from "../../components/common/TextAreaField";
import { NumberField } from "../../components/common/NumberField";
import { SelectField } from "../../components/common/SelectField";
import { Checkbox } from "../../components/common/Checkbox";
import { TinyButton } from "../../components/common/TinyButton";
import { Label } from "../../components/common/Label";

type Props = {
  data: Data;
  setData: React.Dispatch<React.SetStateAction<Data>>;
  calc: CalcResult;
  addWorkItem: () => void;
  removeWorkItem: (id: string) => void;
  updateWorkItem: (id: string, patch: Partial<WorkItem>) => void;
  addMiscExpense: () => void;
  removeMiscExpense: (id: string) => void;
  updateMiscExpense: (id: string, patch: Partial<MiscExpense>) => void;
};

export function InputView({ data, setData, calc, addWorkItem, removeWorkItem, updateWorkItem, addMiscExpense, removeMiscExpense, updateMiscExpense }: Props) {
  return (
    <div className="space-y-4">
      <Card title="1) 基本情報" tone="slate" subtitle="宛先・件名・日付など（見積／仕様／検査で共通）">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="顧客名" value={data.clientName} onChange={(v) => setData((p) => ({ ...p, clientName: v }))} />
          <TextField label="案件名" value={data.projectName} onChange={(v) => setData((p) => ({ ...p, projectName: v }))} />
          <TextField label="担当者名" value={data.contactName} onChange={(v) => setData((p) => ({ ...p, contactName: v }))} />
          <TextField label="発行日" value={data.issueDate} onChange={(v) => setData((p) => ({ ...p, issueDate: v }))} />
          <TextField label="納期（任意）" value={data.dueDate} onChange={(v) => setData((p) => ({ ...p, dueDate: v }))} placeholder="例：2026-01-31 / 要相談" />
        </div>
        <div className="md:col-span-2 mt-3">
          <TextAreaField
            label="案件備考（社内）"
            value={data.notes}
            onChange={(v) => setData((p) => ({ ...p, notes: v }))}
            placeholder="例：顧客の特記事項、品質要件の注意、追加見積の背景等"
            rows={3}
          />
        </div>
      </Card>

      <Card title="1.5) 発行者・採番（見積No／検査報告No／押印欄）" tone="slate" subtitle="発行名義・連絡先（見積書ヘッダ表示）">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <TextField label="見積No" value={data.quotationNo} onChange={(v) => setData((p) => ({ ...p, quotationNo: v }))} placeholder="例：20260131-001" />
              </div>
              <button type="button" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setData((p) => ({ ...p, quotationNo: allocateQuotationNo(p.issueDate) }))}>採番</button>
              <button type="button" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 hover:bg-slate-50" onClick={() => setData((p) => ({ ...p, quotationNo: suggestQuotationNo(p.issueDate) }))}>候補に戻す</button>
            </div>
            <div className="mt-1 text-xs text-slate-500">※「採番」はローカル端末で日付ごとに通番を進めます。</div>
          </div>
          <TextField label="発行者（会社名）" value={data.issuerOrg} onChange={(v) => setData((p) => ({ ...p, issuerOrg: v }))} />
          <TextField label="本社部門" value={data.issuerDept} onChange={(v) => setData((p) => ({ ...p, issuerDept: v }))} placeholder="例：経営管理本部" />
          <TextField label="担当者（発行者側）" value={data.issuerContactPerson} onChange={(v) => setData((p) => ({ ...p, issuerContactPerson: v }))} />
          <TextField label="E-mail（実務連絡先）" value={data.issuerContactEmail} onChange={(v) => setData((p) => ({ ...p, issuerContactEmail: v }))} />
          <div className="col-span-2"><TextField label="実務連絡先住所" value={data.issuerOpsAddress} onChange={(v) => setData((p) => ({ ...p, issuerOpsAddress: v }))} /></div>
        </div>
      </Card>

      <Card title="2) プランと検査" tone="amber" subtitle="単価に最も影響する選択">
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
          <div className="grid grid-cols-2 gap-3">
            <SelectField<Tier> label="プラン" value={data.tier} onChange={(v) => setData((p) => ({ ...p, tier: v }))} options={[{ value: "economy", label: "エコノミー（価格優先）" }, { value: "standard", label: "スタンダード（バランス）" }, { value: "premium", label: "プレミアム（品質・管理優先）" }]} hint="単価は「基礎単価＋加算要素」を基に算出します。" />
            <SelectField<InspectionLevel> label="検査レベル" value={data.inspectionLevel} onChange={(v) => setData((p) => ({ ...p, inspectionLevel: v }))} options={[{ value: "none", label: "検査なし" }, { value: "sample", label: "抜取検査" }, { value: "full", label: "全数検査" }, { value: "double_full", label: "二重・全数検査" }]} hint="検査レベルは単価に倍率として反映されます。" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Checkbox label="単価内訳（行ごと）を表示" checked={data.showUnitPriceBreakdown} onChange={(v) => setData((p) => ({ ...p, showUnitPriceBreakdown: v }))} hint="入力と同時に、参考単価と内訳を確認できます。" />
          <div className="rounded-lg border bg-white px-3 py-2 flex flex-col justify-center">
            <div className="text-sm font-semibold tabular-nums">{fmtJPY(TIER_BASE_PER_UNIT[data.tier])} / 頁</div>
            <div className="text-xs text-slate-500">※ 実際の単価は加算・検査倍率を含みます。</div>
          </div>
        </div>
      </Card>

      <Card title="3) 仕様レベル（標準／詳細／厳格）" tone="emerald" subtitle="仕様書の分量と厳格度">
        <div className="grid grid-cols-2 gap-3">
          <SelectField<SpecProfile> label="仕様プロファイル" value={data.specProfile} onChange={(v) => setData((p) => ({ ...p, specProfile: v, inspectionLevel: v === "gunma" && p.inspectionLevel === "none" ? "sample" : p.inspectionLevel }))} options={[{ value: "standard", label: "標準" }, { value: "ndl", label: "詳細" }, { value: "gunma", label: "厳格" }]} hint="選択に応じて、仕様書の粒度が変化します。" />
          <div className="rounded-lg border bg-white px-3 py-2 flex flex-col justify-center">
             <div className="text-xs text-slate-600">現在のプロファイル</div>
             <div className="text-sm font-semibold">{data.specProfile === "standard" ? "標準" : data.specProfile === "ndl" ? "詳細" : "厳格"}</div>
          </div>
        </div>
        {data.specProfile === "gunma" && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Checkbox label="全数検査（厳格）" checked={data.gunmaAllInspection} onChange={(v) => setData((p) => ({ ...p, gunmaAllInspection: v }))} hint="工程・出荷前を含め、全数を原則化。" />
            <Checkbox label="媒体要件（厳格）" checked={data.gunmaMediaRequirements} onChange={(v) => setData((p) => ({ ...p, gunmaMediaRequirements: v }))} hint="媒体、チェックサム等の規格化。" />
            <Checkbox label="メタデータ必須項目（厳格）" checked={data.gunmaMetadataMandatory} onChange={(v) => setData((p) => ({ ...p, gunmaMetadataMandatory: v }))} hint="必須欠落を不合格扱いとする運用。" />
          </div>
        )}
      </Card>

      <Card title="4) 付帯・出力設定" tone="indigo" subtitle="提出物の出力ページ／付帯作業のON/OFF">
        <div className="grid grid-cols-2 gap-3">
          <Checkbox label="顧客提出用：見積書を出力" checked={data.includeQuotation} onChange={(v) => setData((p) => ({ ...p, includeQuotation: v }))} />
          <Checkbox label="顧客提出用：単価算定根拠（別紙）" checked={data.includePriceRationalePage} onChange={(v) => setData((p) => ({ ...p, includePriceRationalePage: v }))} />
          <Checkbox label="顧客提出用：案件固定費の算定根拠" checked={data.includeFixedCostRationalePage} onChange={(v) => setData((p) => ({ ...p, includeFixedCostRationalePage: v }))} />
          <Checkbox label="顧客提出用：パラメータ表（別紙）" checked={data.includeParameterTables} onChange={(v) => setData((p) => ({ ...p, includeParameterTables: v }))} />
          <Checkbox label="内部用：計算書を出力" checked={data.includeInternalCalc} onChange={(v) => setData((p) => ({ ...p, includeInternalCalc: v }))} />
          <Checkbox label="仕様書を出力" checked={data.includeSpecDoc} onChange={(v) => setData((p) => ({ ...p, includeSpecDoc: v }))} />
          <Checkbox label="内部用：作業指示書を出力" checked={data.includeInstructionDoc} onChange={(v) => setData((p) => ({ ...p, includeInstructionDoc: v }))} />
          <Checkbox label="内部用：検査表を出力" checked={data.includeInspectionDoc} onChange={(v) => setData((p) => ({ ...p, includeInspectionDoc: v }))} />
          <Checkbox label="内部用：プラン差分説明ページ" checked={data.includeInternalPlanDiffPage} onChange={(v) => setData((p) => ({ ...p, includeInternalPlanDiffPage: v }))} />
          <Checkbox label="内部用：3プラン比較表を出力" checked={data.includeInternalPlanComparePage} onChange={(v) => setData((p) => ({ ...p, includeInternalPlanComparePage: v }))} />
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 border-t pt-3">
          <Checkbox label="燻蒸（防カビ・防虫）" checked={data.includeFumigation} onChange={(v) => setData((p) => ({ ...p, includeFumigation: v }))} />
          <Checkbox label="長期保存資材への格納" checked={data.includePacking} onChange={(v) => setData((p) => ({ ...p, includePacking: v }))} />
          <Checkbox label="集荷・納品" checked={data.includePickupDelivery} onChange={(v) => setData((p) => ({ ...p, includePickupDelivery: v }))} />
          <Checkbox label="現地作業" checked={data.includeOnsite} onChange={(v) => setData((p) => ({ ...p, includeOnsite: v }))} />
          <Checkbox label="暗号化・アクセス制御" checked={data.includeEncryption} onChange={(v) => setData((p) => ({ ...p, includeEncryption: v }))} />
          <NumberField label="税率" value={Math.round(data.taxRate * 100)} onChange={(v) => setData((p) => ({ ...p, taxRate: v / 100 }))} suffix="%" />
        </div>
      </Card>

      <Card title="6) 対象資料（行ごとに単価が変わる）" tone="emerald" subtitle="サイズ・形式・OCR等により単価が変動します" right={<TinyButton label="＋行を追加" onClick={addWorkItem} kind="primary" />}>
        <div className="space-y-4">
          {data.workItems.map((w, idx) => {
            const bd = calc.unitBreakdowns[w.id];
            return (
              <div key={w.id} className="rounded-2xl border bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-800">行 {idx + 1}</div>
                  <TinyButton label="削除" onClick={() => removeWorkItem(w.id)} kind="danger" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TextField label="項目名" value={w.title} onChange={(v) => updateWorkItem(w.id, { title: v })} placeholder="例：古文書／図面／帳票" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="数量" value={w.qty} onChange={(v) => updateWorkItem(w.id, { qty: v })} />
                    <SelectField<WorkItem["unit"]> label="単位" value={w.unit} onChange={(v) => updateWorkItem(w.id, { unit: v })} options={[{ value: "頁", label: "頁" }, { value: "点", label: "点" }, { value: "巻", label: "巻" }]} />
                    <div className="rounded-lg border bg-slate-50 px-2 py-1 flex flex-col justify-center">
                      <div className="text-[10px] text-slate-500">参考単価</div>
                      <div className="text-xs font-bold tabular-nums">{fmtJPY(bd?.finalUnitPrice || 0)}</div>
                    </div>
                  </div>
                  <SelectField<SizeClass> label="サイズ区分" value={w.sizeClass} onChange={(v) => updateWorkItem(w.id, { sizeClass: v })} options={["A4以下","A3","A2","A2以上","A1","A0","図面特大"].map(s=>({value:s as any, label:s}))} />
                  <SelectField<ColorMode> label="色" value={w.colorMode} onChange={(v) => updateWorkItem(w.id, { colorMode: v })} options={[{value:"mono",label:"白黒"},{value:"gray",label:"グレー"},{value:"color",label:"カラー"}]} />
                  <SelectField<Dpi> label="解像度（dpi）" value={w.dpi} onChange={(v) => updateWorkItem(w.id, { dpi: v })} options={[{value:300,label:"300"},{value:400,label:"400"},{value:600,label:"600"}]} />
                  <SelectField<Handling> label="取扱区分" value={w.handling} onChange={(v) => updateWorkItem(w.id, { handling: v })} options={[{value:"normal",label:"通常"},{value:"fragile",label:"脆弱"},{value:"bound",label:"製本"},{value:"mylars",label:"マイラー"},{value:"mixed",label:"混在"}]} />
                  <div className="md:col-span-2">
                    <Label>出力形式（複数選択可）</Label>
                    <div className="flex flex-wrap gap-2">
                      {(["PDF", "PDF/A", "TIFF", "JPEG", "JPEG2000", "TXT", "XML"] as FileFormat[]).map(f => (
                        <label key={f} className="flex items-center gap-1 text-xs border rounded-full px-2 py-0.5 bg-slate-50 cursor-pointer hover:bg-slate-100">
                          <input type="checkbox" checked={w.formats.includes(f)} onChange={e => {
                            const next = e.target.checked ? [...w.formats, f] : w.formats.filter(x => x !== f);
                            updateWorkItem(w.id, { formats: next as any });
                          }} /> {f}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-2 gap-3">
                    <Checkbox label="OCR（文字認識）" checked={w.ocr} onChange={(v) => updateWorkItem(w.id, { ocr: v })} />
                    <SelectField<MetadataLevel> label="メタデータ" value={w.metadataLevel} onChange={(v) => updateWorkItem(w.id, { metadataLevel: v })} options={[{value:"none",label:"なし"},{value:"basic",label:"基本"},{value:"rich",label:"充実"}]} />
                  </div>
                  <div className="md:col-span-2">
                    <TextAreaField label="備考（案件個別）" value={w.notes ?? ""} onChange={(v) => updateWorkItem(w.id, { notes: v })} placeholder="例：禁裁断、欠損あり等" rows={2} />
                  </div>
                  {data.showUnitPriceBreakdown && bd && (
                    <div className="md:col-span-2 p-2 bg-slate-50 rounded text-[10px] grid grid-cols-4 gap-x-2 text-slate-500 border border-slate-200">
                      <div>基礎: {fmtJPY(bd.base)}</div>
                      <div>サイズ: +{fmtJPY(bd.size)}</div>
                      <div>色: +{fmtJPY(bd.color)}</div>
                      <div>dpi: +{fmtJPY(bd.dpi)}</div>
                      <div>形式: +{fmtJPY(bd.formats)}</div>
                      <div>OCR: +{fmtJPY(bd.ocr)}</div>
                      <div>メタ: +{fmtJPY(bd.metadata)}</div>
                      <div>取扱: +{fmtJPY(bd.handling)}</div>
                      <div className="col-span-4 font-bold text-slate-800 border-t mt-1 pt-1">最終単価(検査倍率×{bd.inspectionMultiplier.toFixed(2)}込): {fmtJPY(bd.finalUnitPrice)}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="7) 特殊工程・実費" tone="rose" subtitle="大型図面・前処理・媒体実費など" right={<TinyButton label="＋追加" onClick={addMiscExpense} kind="primary" />}>
        <div className="space-y-4">
          {data.miscExpenses.map((m) => {
            const isExpense = m.calcType === "expense";
            const estPrice = isExpense ? Math.round((m.unitPrice || 0) * 1.3) : (m.unitPrice || 0);
            
            return (
              <div key={m.id} className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                <div className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-12 md:col-span-3">
                    <SelectField<MiscExpense["calcType"]>
                      label="種別"
                      value={m.calcType || "manual"}
                      onChange={(v) => updateMiscExpense(m.id, { calcType: v })}
                      options={[
                        { value: "manual", label: "特殊工程 (手入力)" },
                        { value: "expense", label: "実費購入 (+30%)" },
                      ]}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-9 grid grid-cols-12 gap-2">
                    <div className="col-span-12 md:col-span-5">
                      <TextField label="項目名" value={m.label} onChange={(v) => updateMiscExpense(m.id, { label: v })} placeholder="例：大型図面補正 / 外付けHDD" />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <NumberField label="数量" value={m.qty || 1} onChange={(v) => updateMiscExpense(m.id, { qty: v })} />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <TextField label="単位" value={m.unit || "式"} onChange={(v) => updateMiscExpense(m.id, { unit: v })} />
                    </div>
                    <div className="col-span-4 md:col-span-3">
                      <NumberField 
                        label={isExpense ? "市場価格(税込)" : "単価(税抜)"} 
                        value={m.unitPrice || 0} 
                        onChange={(v) => updateMiscExpense(m.id, { unitPrice: v, amount: (m.qty || 1) * v })} 
                      />
                      {isExpense && (
                        <div className="text-[10px] text-rose-600 text-right mt-0.5">
                          見積提示額: {fmtJPY(estPrice)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 2行目：備考と削除ボタン */}
                  <div className="col-span-12 flex gap-3 items-start">
                    <div className="flex-1">
                      <TextField 
                        label="工程説明・備考（見積書に記載）" 
                        value={m.note || ""} 
                        onChange={(v) => updateMiscExpense(m.id, { note: v })} 
                        placeholder={isExpense ? "例：メーカー・型番・容量等" : "例：作業の詳細手順や前提条件など"}
                      />
                    </div>
                    <div className="pt-6">
                      <TinyButton label="削除" kind="danger" onClick={() => removeMiscExpense(m.id)} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {data.miscExpenses.length === 0 && (
            <div className="text-sm text-slate-400 text-center py-4">項目がありません。「＋追加」ボタンで追加してください。</div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900 rounded-2xl text-white">
        <div><div className="text-[10px] opacity-70 uppercase font-bold tracking-wider">小計(税抜)</div><div className="text-lg font-bold tabular-nums">{fmtJPY(calc.subtotal)}</div></div>
        <div><div className="text-[10px] opacity-70 uppercase font-bold tracking-wider">消費税</div><div className="text-lg font-bold tabular-nums">{fmtJPY(calc.tax)}</div></div>
        <div className="text-right"><div className="text-[10px] opacity-70 uppercase font-bold tracking-wider">合計(税込)</div><div className="text-2xl font-black tabular-nums">{fmtJPY(calc.total)}</div></div>
      </div>
    </div>
  );
}