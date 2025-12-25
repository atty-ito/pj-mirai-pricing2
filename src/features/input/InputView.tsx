import { Data, WorkItem, MiscExpense, Tier, InspectionLevel, SpecProfile, MetadataLevel, Handling, SizeClass, ColorMode, Dpi, FileFormat } from "../../types/pricing";
import { CalcResult } from "../../utils/calculations";
import { TIER_BASE_PER_UNIT } from "../../constants/coefficients";
import { fmtJPY, toInt, allocateQuotationNo, suggestQuotationNo, allocateInspectionReportNo, suggestInspectionReportNo } from "../../utils/formatters";
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

export function InputView({
  data,
  setData,
  calc,
  addWorkItem,
  removeWorkItem,
  updateWorkItem,
  addMiscExpense,
  removeMiscExpense,
  updateMiscExpense,
}: Props) {
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
        <div className="mt-3">
          <TextAreaField
            label="案件備考（社内）"
            value={data.notes}
            onChange={(v) => setData((p) => ({ ...p, notes: v }))}
            placeholder="例：顧客の特記事項、品質要件の注意、追加見積の背景等"
            rows={3}
          />
        </div>
      </Card>

      <Card title="1.5) 発行者・採番" tone="slate" subtitle="発行名義・連絡先・通番管理">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <TextField label="見積No" value={data.quotationNo} onChange={(v) => setData((p) => ({ ...p, quotationNo: v }))} />
              </div>
              <TinyButton label="採番" kind="primary" onClick={() => setData((p) => ({ ...p, quotationNo: allocateQuotationNo(p.issueDate) }))} />
              <TinyButton label="候補" onClick={() => setData((p) => ({ ...p, quotationNo: suggestQuotationNo(p.issueDate) }))} />
            </div>
          </div>
          <div className="col-span-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <TextField label="検査報告No" value={data.inspectionReportNo} onChange={(v) => setData((p) => ({ ...p, inspectionReportNo: v }))} />
              </div>
              <TinyButton label="採番" kind="primary" onClick={() => setData((p) => ({ ...p, inspectionReportNo: allocateInspectionReportNo(data.inspectionIssueDate || data.issueDate) }))} />
              <TinyButton label="候補" onClick={() => setData((p) => ({ ...p, inspectionReportNo: suggestInspectionReportNo(data.inspectionIssueDate || data.issueDate) }))} />
            </div>
          </div>
          <TextField label="発行者（会社名）" value={data.issuerOrg} onChange={(v) => setData((p) => ({ ...p, issuerOrg: v }))} />
          <TextField label="担当者（発行者側）" value={data.issuerContactPerson} onChange={(v) => setData((p) => ({ ...p, issuerContactPerson: v }))} />
          <div className="col-span-2">
            <TextField label="実務連絡先住所" value={data.issuerOpsAddress} onChange={(v) => setData((p) => ({ ...p, issuerOpsAddress: v }))} />
          </div>
        </div>
      </Card>

      <Card title="2) プランと検査" tone="amber" subtitle="単価に最も影響する選択">
        <div className="grid grid-cols-2 gap-3">
          <SelectField<Tier>
            label="プラン"
            value={data.tier}
            onChange={(v) => setData((p) => ({ ...p, tier: v }))}
            options={[
              { value: "economy", label: "エコノミー（価格優先）" },
              { value: "standard", label: "スタンダード（バランス）" },
              { value: "premium", label: "プレミアム（品質・管理優先）" },
            ]}
          />
          <SelectField<InspectionLevel>
            label="検査レベル"
            value={data.inspectionLevel}
            onChange={(v) => setData((p) => ({ ...p, inspectionLevel: v }))}
            options={[
              { value: "none", label: "検査なし" },
              { value: "sample", label: "抜取検査" },
              { value: "full", label: "全数検査" },
              { value: "double_full", label: "二重・全数検査" },
            ]}
          />
        </div>
        <div className="mt-3">
          <Checkbox
            label="単価内訳（行ごと）を表示"
            checked={data.showUnitPriceBreakdown}
            onChange={(v) => setData((p) => ({ ...p, showUnitPriceBreakdown: v }))}
          />
        </div>
      </Card>

      <Card title="3) 仕様レベル" tone="emerald" subtitle="仕様書の分量と厳格度">
        <div className="grid grid-cols-2 gap-3">
          <SelectField<SpecProfile>
            label="仕様プロファイル"
            value={data.specProfile}
            onChange={(v) => setData((p) => ({ ...p, specProfile: v }))}
            options={[
              { value: "standard", label: "標準" },
              { value: "ndl", label: "詳細" },
              { value: "gunma", label: "厳格" },
            ]}
          />
        </div>
        {data.specProfile === "gunma" && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Checkbox label="全数検査（厳格）" checked={data.gunmaAllInspection} onChange={(v) => setData((p) => ({ ...p, gunmaAllInspection: v }))} />
            <Checkbox label="媒体要件（厳格）" checked={data.gunmaMediaRequirements} onChange={(v) => setData((p) => ({ ...p, gunmaMediaRequirements: v }))} />
            <Checkbox label="メタデータ必須" checked={data.gunmaMetadataMandatory} onChange={(v) => setData((p) => ({ ...p, gunmaMetadataMandatory: v }))} />
          </div>
        )}
      </Card>

      <Card title="4) 出力・付帯設定" tone="indigo">
        <div className="grid grid-cols-2 gap-3">
          <Checkbox label="見積書を出力" checked={data.includeQuotation} onChange={(v) => setData((p) => ({ ...p, includeQuotation: v }))} />
          <Checkbox label="仕様書を出力" checked={data.includeSpecDoc} onChange={(v) => setData((p) => ({ ...p, includeSpecDoc: v }))} />
          <Checkbox label="作業指示書を出力" checked={data.includeInstructionDoc} onChange={(v) => setData((p) => ({ ...p, includeInstructionDoc: v }))} />
          <Checkbox label="検査表を出力" checked={data.includeInspectionDoc} onChange={(v) => setData((p) => ({ ...p, includeInspectionDoc: v }))} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3">
          <Checkbox label="燻蒸" checked={data.includeFumigation} onChange={(v) => setData((p) => ({ ...p, includeFumigation: v }))} />
          <Checkbox label="長期保存資材格納" checked={data.includePacking} onChange={(v) => setData((p) => ({ ...p, includePacking: v }))} />
          <Checkbox label="集荷・納品" checked={data.includePickupDelivery} onChange={(v) => setData((p) => ({ ...p, includePickupDelivery: v }))} />
          <Checkbox label="現地作業" checked={data.includeOnsite} onChange={(v) => setData((p) => ({ ...p, includeOnsite: v }))} />
        </div>
      </Card>

      <Card
        title="6) 対象資料"
        tone="emerald"
        right={<TinyButton label="＋行を追加" onClick={addWorkItem} kind="primary" />}
      >
        <div className="space-y-4">
          {data.workItems.map((w, idx) => {
            const bd = calc.unitBreakdowns[w.id];
            return (
              <div key={w.id} className="rounded-xl border bg-slate-50 p-3">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">項目 {idx + 1}</span>
                  <TinyButton label="削除" onClick={() => removeWorkItem(w.id)} kind="danger" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="項目名" value={w.title} onChange={(v) => updateWorkItem(w.id, { title: v })} />
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="数量" value={w.qty} onChange={(v) => updateWorkItem(w.id, { qty: v })} />
                    <SelectField label="単位" value={w.unit} onChange={(v) => updateWorkItem(w.id, { unit: v as any })} options={[{value:"頁",label:"頁"},{value:"点",label:"点"},{value:"巻",label:"巻"}]} />
                  </div>
                  <SelectField<SizeClass> label="サイズ" value={w.sizeClass} onChange={(v) => updateWorkItem(w.id, { sizeClass: v })} options={["A4以下","A3","A2","A2以上","A1","A0","図面特大"].map(s=>({value:s as any, label:s}))} />
                  <SelectField<ColorMode> label="色" value={w.colorMode} onChange={(v) => updateWorkItem(w.id, { colorMode: v })} options={[{value:"mono",label:"白黒"},{value:"gray",label:"グレー"},{value:"color",label:"カラー"}]} />
                  <SelectField<Dpi> label="解像度" value={w.dpi} onChange={(v) => updateWorkItem(w.id, { dpi: v })} options={[{value:300,label:"300"},{value:400,label:"400"},{value:600,label:"600"}]} />
                  <SelectField<Handling> label="取扱" value={w.handling} onChange={(v) => updateWorkItem(w.id, { handling: v })} options={[{value:"normal",label:"通常"},{value:"fragile",label:"脆弱"},{value:"bound",label:"製本"},{value:"mylars",label:"マイラー"},{value:"mixed",label:"混在"}]} />
                  
                  <div className="col-span-2">
                    <Label>出力形式</Label>
                    <div className="flex flex-wrap gap-2">
                      {(["PDF", "PDF/A", "TIFF", "JPEG", "JPEG2000", "TXT", "XML"] as FileFormat[]).map((f) => (
                        <label key={f} className="flex items-center gap-1 text-xs border rounded px-2 py-1 bg-white">
                          <input type="checkbox" checked={w.formats.includes(f)} onChange={(e) => {
                            const next = e.target.checked ? [...w.formats, f] : w.formats.filter(x => x !== f);
                            updateWorkItem(w.id, { formats: next as any });
                          }} /> {f}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="grid grid-cols-2 gap-3">
                       <Checkbox label="OCR" checked={w.ocr} onChange={(v) => updateWorkItem(w.id, { ocr: v })} />
                       <SelectField<MetadataLevel> label="メタデータ" value={w.metadataLevel} onChange={(v) => updateWorkItem(w.id, { metadataLevel: v })} options={[{value:"none",label:"なし"},{value:"basic",label:"基本"},{value:"rich",label:"充実"}]} />
                    </div>
                  </div>
                </div>

                {data.showUnitPriceBreakdown && bd && (
                  <div className="mt-3 p-2 bg-white rounded border text-[10px] grid grid-cols-4 gap-1 text-slate-500">
                    <div>基礎: {bd.base}</div>
                    <div>サイズ: +{bd.size}</div>
                    <div>色: +{bd.color}</div>
                    <div>dpi: +{bd.dpi}</div>
                    <div>形式: +{bd.formats}</div>
                    <div className="col-span-2 font-bold text-slate-800 underline">単価: {fmtJPY(bd.finalUnitPrice)}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="7) 特殊工程・実費" tone="rose" right={<TinyButton label="＋追加" onClick={addMiscExpense} kind="primary" />}>
        <div className="space-y-2">
          {data.miscExpenses.map((m) => (
            <div key={m.id} className="grid grid-cols-12 gap-2 items-end border-b pb-2">
              <div className="col-span-5"><TextField label="内容" value={m.label} onChange={(v) => updateMiscExpense(m.id, { label: v })} /></div>
              <div className="col-span-2"><NumberField label="数量" value={m.qty || 1} onChange={(v) => updateMiscExpense(m.id, { qty: v })} /></div>
              <div className="col-span-4"><NumberField label="単価" value={m.unitPrice || 0} onChange={(v) => updateMiscExpense(m.id, { unitPrice: v, amount: (m.qty || 1) * v })} /></div>
              <div className="col-span-1"><TinyButton label="×" kind="danger" onClick={() => removeMiscExpense(m.id)} /></div>
            </div>
          ))}
        </div>
      </Card>

      <div className="p-4 bg-slate-900 rounded-2xl text-white flex justify-between items-center">
        <span className="text-sm opacity-70">概算合計（税込）</span>
        <span className="text-2xl font-black tabular-nums">{fmtJPY(calc.total)}</span>
      </div>
    </div>
  );
}