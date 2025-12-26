import { Data, WorkItem, Tier, ServiceCode, FileFormat, MiscExpense } from "../../types/pricing";
import { CalcResult } from "../../utils/calculations";
import { fmtJPY, allocateQuotationNo } from "../../utils/formatters";
import { 
  SERVICE_DEFINITIONS, 
  SIZE_ADDERS, 
  RESOLUTIONS, 
  COLOR_OPTS, 
  INSPECTION_LEVELS,
  SPEC_PROFILES,
  FORMAT_ADDERS
} from "../../constants/coefficients";
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
  data, setData, calc, 
  addWorkItem, removeWorkItem, updateWorkItem,
  addMiscExpense, removeMiscExpense, updateMiscExpense 
}: Props) {
  
  const applyTier = (t: Tier) => {
    setData((p) => {
      const base: Partial<Data> =
        t === 'premium'
          ? { inspectionLevel: '二重全数検査 (有資格者による再検)', tempHumidLog: true, shippingType: 'セキュリティ専用便', kLoadPct: 0 }
          : t === 'standard'
          ? { inspectionLevel: '標準全数検査 (作業者のみ)', tempHumidLog: false, shippingType: '専用便', kLoadPct: 0 }
          : { inspectionLevel: '簡易目視検査 (抜き取り)', tempHumidLog: false, shippingType: '一般宅配', kLoadPct: 0 };
      return { ...p, tier: t, ...base };
    });
  };

  const toggleFormat = (w: WorkItem, fmt: FileFormat) => {
    const current = w.fileFormats || [];
    const next = current.includes(fmt)
      ? current.filter(f => f !== fmt)
      : [...current, fmt];
    updateWorkItem(w.id, { fileFormats: next });
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* 上部：プラン選択とサマリ */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plan</div>
              <div className={`text-xl font-black uppercase ${
                data.tier === 'premium' ? 'text-rose-600' : data.tier === 'standard' ? 'text-blue-600' : 'text-emerald-600'
              }`}>{data.tier}</div>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total (Tax Inc.)</div>
              <div className="text-xl font-black text-slate-900 tabular-nums">{fmtJPY(calc.total)}</div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {(['premium', 'standard', 'economy'] as Tier[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => applyTier(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border-2 transition-all ${
                  data.tier === t 
                    ? (t === 'premium' ? 'bg-rose-50 border-rose-500 text-rose-700' : t === 'standard' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700')
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* L1: 基本情報 */}
      <Card title="L1 基本情報・要件定義" tone="indigo" subtitle="顧客情報、管理者、納期、仕様書">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3">
            <div className="flex items-end gap-1">
              <div className="flex-1">
                <TextField label="Job No" value={data.jobNo} onChange={(v) => setData(p => ({...p, jobNo: v}))} />
              </div>
              <button type="button" onClick={() => setData(p => ({...p, jobNo: allocateQuotationNo(p.createdDate)}))} className="mb-1 p-1 text-slate-400 hover:text-indigo-600" title="採番">#</button>
            </div>
          </div>
          <div className="col-span-3">
            <Label>発行日</Label>
            <input 
              type="date" 
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              value={data.createdDate} 
              onChange={(e) => setData(p => ({...p, createdDate: e.target.value}))} 
            />
          </div>
          <div className="col-span-6">
            <TextField label="件名" value={data.subject} onChange={(v) => setData(p => ({...p, subject: v}))} />
          </div>

          <div className="col-span-4">
            <TextField label="顧客名" value={data.customerName} onChange={(v) => setData(p => ({...p, customerName: v}))} />
          </div>
          <div className="col-span-4">
            <TextField label="主管課・部署" value={data.jurisdiction} onChange={(v) => setData(p => ({...p, jurisdiction: v}))} />
          </div>
          <div className="col-span-4">
            <SelectField label="顧客種別" value={data.customerType} onChange={(v) => setData(p => ({...p, customerType: v}))} options={["官公庁・自治体", "民間企業", "大学・研究機関", "その他"].map(s => ({value:s, label:s}))} />
          </div>

          <div className="col-span-3">
            <TextField label="担当者名" value={data.contactName} onChange={(v) => setData(p => ({...p, contactName: v}))} />
          </div>
          <div className="col-span-3">
            <TextField label="電話番号" value={data.contactTel} onChange={(v) => setData(p => ({...p, contactTel: v}))} />
          </div>
          <div className="col-span-3">
            <TextField label="品質責任者" value={data.qualityManager} onChange={(v) => setData(p => ({...p, qualityManager: v}))} />
          </div>
          <div className="col-span-3">
            <TextField label="監督者資格" value={data.supervisorCert} onChange={(v) => setData(p => ({...p, supervisorCert: v}))} placeholder="例: 文書情報管理士1級" />
          </div>

          <div className="col-span-12 mt-2 pt-4 border-t border-indigo-100 grid grid-cols-12 gap-4 bg-indigo-50/50 p-3 rounded-lg">
            <div className="col-span-3">
              <Label>納期</Label>
              <input 
                type="date" 
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                value={data.deadline} 
                onChange={(e) => setData(p => ({...p, deadline: e.target.value}))} 
              />
            </div>
            <div className="col-span-3">
              <SelectField label="納期種別" value={data.deadlineType} onChange={(v) => setData(p => ({...p, deadlineType: v as any}))} options={[{value:"絶対納期",label:"絶対納期"},{value:"目標納期",label:"目標納期"}]} />
            </div>
            <div className="col-span-2">
              <div className="mt-6">
                <Checkbox label="特急対応" checked={data.isExpress} onChange={(v) => setData(p => ({...p, isExpress: v}))} />
              </div>
            </div>
            <div className="col-span-4">
              <SelectField 
                label="特急レベル" 
                value={data.expressLevel} 
                onChange={(v) => setData(p => ({...p, expressLevel: v as any}))} 
                options={["通常", "特急(10営未満)", "超特急(5営未満)"].map(s => ({value:s, label:s}))} 
              />
            </div>
          </div>

          <div className="col-span-12 grid grid-cols-4 gap-4 mt-2">
            <div className="col-span-2 bg-slate-50 p-2 rounded border border-slate-200">
              <Label>仕様書レベル</Label>
              <div className="flex gap-2 mt-1">
                {SPEC_PROFILES.map(sp => (
                  <label key={sp.value} className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="specProfile"
                      checked={data.specProfile === sp.value}
                      onChange={() => setData(p => ({...p, specProfile: sp.value}))}
                    />
                    <span className="text-xs">{sp.label.split(" ")[0]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="col-span-2 flex flex-wrap gap-4 pt-4">
              <Checkbox label="顧客仕様書の支給あり" checked={data.specProvidedByClient} onChange={(v) => setData(p => ({...p, specProvidedByClient: v}))} />
              <Checkbox label="契約書受領済" checked={data.contractExists} onChange={(v) => setData(p => ({...p, contractExists: v}))} />
              <Checkbox label="個人情報あり" checked={data.privacyFlag} onChange={(v) => setData(p => ({...p, privacyFlag: v}))} />
            </div>
          </div>
          
          <div className="col-span-12 mt-2">
            <TextAreaField label="全体備考（顧客要望・背景など）" value={data.notes} onChange={(v) => setData(p => ({...p, notes: v}))} rows={2} />
          </div>
        </div>
      </Card>

      {/* L2: 運用・輸送 */}
      <Card title="L2 運用・輸送条件" tone="slate" subtitle="作業場所、セキュリティ、搬送コスト">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6">
            <SelectField 
              label="作業場所" 
              value={data.workLocation} 
              onChange={(v) => setData(p => ({...p, workLocation: v as any}))} 
              options={["社内（高セキュリティ施設）", "現地（出張）", "外部委託（要承認）"].map(s => ({value:s, label:s}))} 
            />
          </div>
          <div className="col-span-6 grid grid-cols-2 gap-4 pt-6">
            <Checkbox label="厳格照合（リスト突合）" checked={data.strictCheckIn} onChange={(v) => setData(p => ({...p, strictCheckIn: v}))} />
            <Checkbox label="顧客リスト提供あり" checked={data.checkInListProvided} onChange={(v) => setData(p => ({...p, checkInListProvided: v}))} />
          </div>

          <div className="col-span-12 mt-2 pt-4 border-t border-slate-200 grid grid-cols-12 gap-4">
            <div className="col-span-4">
              <SelectField 
                label="輸送形態" 
                value={data.shippingType} 
                onChange={(v) => setData(p => ({...p, shippingType: v as any}))} 
                options={["一般宅配", "専用便", "セキュリティ専用便", "特殊セキュリティカー"].map(s => ({value:s, label:s}))} 
              />
            </div>
            <div className="col-span-4">
              <NumberField label="片道距離(km)" value={data.transportDistanceKm} onChange={(v) => setData(p => ({...p, transportDistanceKm: v}))} suffix="km" />
            </div>
            <div className="col-span-4">
              <NumberField label="往復回数" value={data.transportTrips} onChange={(v) => setData(p => ({...p, transportTrips: Math.max(1, v)}))} suffix="回" />
            </div>
          </div>

          <div className="col-span-12 mt-2 flex flex-wrap gap-4 pt-4 border-t border-slate-200 bg-slate-50 p-3 rounded">
            <Checkbox label="燻蒸処理" checked={data.fumigation} onChange={(v) => setData(p => ({...p, fumigation: v}))} />
            <Checkbox label="温湿度ログ提出" checked={data.tempHumidLog} onChange={(v) => setData(p => ({...p, tempHumidLog: v}))} />
            <Checkbox label="合紙（前処理）" checked={data.interleaving} onChange={(v) => setData(p => ({...p, interleaving: v}))} />
            <Checkbox label="再製本（復元）" checked={data.rebind} onChange={(v) => setData(p => ({...p, rebind: v}))} />
          </div>
          
          <div className="col-span-6">
            <SelectField 
              label="解体処理" 
              value={data.unbinding} 
              onChange={(v) => setData(p => ({...p, unbinding: v as any}))} 
              options={["なし", "紐外し", "和綴じ解体", "ハードカバー解体"].map(s => ({value:s, label:s}))} 
            />
          </div>
          <div className="col-span-6">
            <TextField label="中性紙袋・保護材" value={data.neutralPaperBag} onChange={(v) => setData(p => ({...p, neutralPaperBag: v}))} />
          </div>
        </div>
      </Card>

      {/* L3: 業務内訳 */}
      <Card title="L3 業務内訳（明細行）" tone="emerald" subtitle="工程ごとに行を分けて登録" right={<TinyButton label="＋行を追加" onClick={addWorkItem} kind="primary" />}>
        <div className="space-y-6">
          {data.workItems.map((w, idx) => {
            const bd = calc.unitBreakdowns[w.id];
            return (
              <div key={w.id} className="rounded-xl border-2 border-emerald-100 bg-white p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">No.{idx + 1}</span>
                    <div className="w-64">
                      <SelectField 
                        label="" 
                        value={w.service} 
                        onChange={(v) => updateWorkItem(w.id, { service: v as any })} 
                        options={(Object.keys(SERVICE_DEFINITIONS) as ServiceCode[]).map(k => ({ value: k, label: `${k}: ${SERVICE_DEFINITIONS[k].name}` }))} 
                      />
                    </div>
                  </div>
                  <TinyButton label="削除" kind="danger" onClick={() => removeWorkItem(w.id)} />
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-6">
                    <TextField label="項目名（明細表示用）" value={w.title} onChange={(v) => updateWorkItem(w.id, { title: v })} placeholder="例: 〇〇資料 電子化" />
                  </div>
                  <div className="col-span-3">
                    <NumberField label="数量" value={w.qty} onChange={(v) => updateWorkItem(w.id, { qty: v })} />
                  </div>
                  <div className="col-span-3">
                    <TextField label="単位" value={w.unit} onChange={(v) => updateWorkItem(w.id, { unit: v })} />
                  </div>

                  <div className="col-span-3">
                    <SelectField label="サイズ" value={w.sizeClass} onChange={(v) => updateWorkItem(w.id, { sizeClass: v as any })} options={Object.keys(SIZE_ADDERS).map(k => ({value:k, label: `${k} (+${fmtJPY(SIZE_ADDERS[k])})`}))} />
                  </div>
                  <div className="col-span-3">
                    <SelectField label="解像度" value={w.resolution} onChange={(v) => updateWorkItem(w.id, { resolution: v as any })} options={RESOLUTIONS.map(r => ({value:r, label:r}))} />
                  </div>
                  <div className="col-span-3">
                    <SelectField label="色空間" value={w.colorSpace} onChange={(v) => updateWorkItem(w.id, { colorSpace: v as any })} options={COLOR_OPTS.map(c => ({value:c, label:c}))} />
                  </div>
                  
                  {/* 出力形式（複数選択 + 自由記述） */}
                  <div className="col-span-12 bg-slate-50 p-2 rounded border border-slate-200">
                    <Label>出力形式（複数選択可）</Label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                      {Object.keys(FORMAT_ADDERS).map((fmt) => (
                        <label key={fmt} className="flex items-center gap-1 cursor-pointer text-sm">
                          <input 
                            type="checkbox" 
                            checked={w.fileFormats.includes(fmt as FileFormat)} 
                            onChange={() => toggleFormat(w, fmt as FileFormat)}
                          />
                          {fmt}
                        </label>
                      ))}
                    </div>
                    <div className="mt-2">
                      <TextField label="その他形式（自由記述）" value={w.fileFormatsFree || ""} onChange={(v) => updateWorkItem(w.id, { fileFormatsFree: v })} placeholder="例: 透かし入りPDF, 高圧縮JPEGなど" />
                    </div>
                  </div>

                  <div className="col-span-12 bg-slate-50 p-3 rounded border border-slate-200 grid grid-cols-4 gap-2">
                    <Checkbox label="脆弱資料 (C)" checked={w.fragile} onChange={(v) => updateWorkItem(w.id, { fragile: v })} hint="係数C加算" />
                    <Checkbox label="解体可能" checked={w.dismantleAllowed} onChange={(v) => updateWorkItem(w.id, { dismantleAllowed: v })} hint="不可時係数増" />
                    <Checkbox label="復元必須" checked={w.restorationRequired} onChange={(v) => updateWorkItem(w.id, { restorationRequired: v })} hint="係数C加算" />
                    <Checkbox label="非接触必須" checked={w.requiresNonContact} onChange={(v) => updateWorkItem(w.id, { requiresNonContact: v })} hint="係数C加算" />
                  </div>

                  <div className="col-span-12">
                    <TextField label="備考（仕様詳細）" value={w.notes} onChange={(v) => updateWorkItem(w.id, { notes: v })} />
                  </div>
                </div>

                {bd && (
                  <div className="mt-3 pt-2 border-t border-emerald-100 text-xs text-slate-500 flex justify-between items-center bg-emerald-50/30 p-2 rounded">
                    <div>
                      基礎単価: <span className="font-mono">{bd.base}</span> × 
                      係数: <span className="font-mono font-bold text-emerald-700">{bd.factors.capped.toFixed(2)}</span> 
                      (C:{bd.factors.c.toFixed(2)} Q:{bd.factors.q.toFixed(2)} P:{bd.factors.p.toFixed(2)} I:{bd.factors.i.toFixed(2)} K:{bd.factors.k.toFixed(2)})
                      + 加算: <span className="font-mono">{bd.sizeAdder + bd.formatAdder}</span>
                    </div>
                    <div className="text-right">
                      単価: <span className="font-bold text-lg tabular-nums text-slate-800">{fmtJPY(bd.unitPrice)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {data.workItems.length === 0 && <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">作業項目がありません。「＋行を追加」してください。</div>}
        </div>
      </Card>

      {/* 特殊工程・実費（復活・強化） */}
      <Card title="特殊工程・実費" tone="rose" subtitle="市場価格（税込）を入力 → 30%諸経費を自動加算（媒体の場合は標準単価と比較し高い方を適用）" right={<TinyButton label="＋実費追加" onClick={addMiscExpense} kind="primary" />}>
        <div className="space-y-4">
          {data.miscExpenses.map((m) => (
            <div key={m.id} className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <TextField label="品名・工程名" value={m.label} onChange={(v) => updateMiscExpense(m.id, { label: v })} placeholder="例: 外付けHDD 4TB" />
              </div>
              <div className="col-span-2">
                <NumberField label="数量" value={m.qty} onChange={(v) => updateMiscExpense(m.id, { qty: v })} />
              </div>
              <div className="col-span-2">
                <TextField label="単位" value={m.unit} onChange={(v) => updateMiscExpense(m.id, { unit: v })} />
              </div>
              <div className="col-span-3">
                <NumberField label="市場価格(税込)" value={m.unitPrice} onChange={(v) => updateMiscExpense(m.id, { unitPrice: v })} />
              </div>
              <div className="col-span-1 pb-1">
                <TinyButton label="削除" kind="danger" onClick={() => removeMiscExpense(m.id)} />
              </div>
              
              <div className="col-span-12 text-[10px] text-rose-700 flex justify-between items-center bg-white/50 p-1 rounded mt-1">
                <div>
                  <span className="font-bold">種別:</span> 
                  {/* ★修正: e.target.value を "manual" | "expense" にキャスト */}
                  <select 
                    className="ml-1 border rounded bg-transparent"
                    value={m.calcType} 
                    onChange={(e) => updateMiscExpense(m.id, { calcType: e.target.value as "manual" | "expense" })}
                  >
                    <option value="expense">実費購入 (+30%乗せ)</option>
                    <option value="manual">手入力 (そのまま)</option>
                  </select>
                </div>
                <div>
                  {m.calcType === "expense" ? (
                    <span>算出単価: {fmtJPY(Math.round(m.unitPrice * 1.3))} (税抜相当として扱う)</span>
                  ) : (
                    <span>算出単価: {fmtJPY(m.unitPrice)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {data.miscExpenses.length === 0 && <div className="text-sm text-slate-400 text-center">実費項目はありません</div>}
        </div>
      </Card>

      {/* L4: 画像処理・検査 */}
      <Card title="L4 画像処理・検査・係数パラメータ" tone="amber" subtitle="Q(Quality) / P(Process) / K(K_load)">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6">
            <SelectField label="検査深度 (Q)" value={data.inspectionLevel} onChange={(v) => setData(p => ({...p, inspectionLevel: v as any}))} options={INSPECTION_LEVELS.map(l => ({value:l, label:l}))} />
          </div>
          <div className="col-span-6 grid grid-cols-2 gap-4 pt-6">
            <Checkbox label="ΔE保証 (Q)" checked={data.deltaE} onChange={(v) => setData(p => ({...p, deltaE: v}))} />
            <Checkbox label="反射抑制" checked={data.reflectionSuppression} onChange={(v) => setData(p => ({...p, reflectionSuppression: v}))} />
          </div>

          <div className="col-span-12 border-t border-amber-100 my-2"></div>

          <div className="col-span-4">
            <SelectField 
              label="命名規則 (P)" 
              value={data.namingRule} 
              onChange={(v) => setData(p => ({...p, namingRule: v as any}))} 
              options={["連番のみ", "フォルダ名のみ", "ファイル名（背文字）", "ファイル名（完全手入力）", "特殊命名規則"].map(s => ({value:s, label:s}))} 
            />
          </div>
          <div className="col-span-4">
            <TextField label="フォルダ構造" value={data.folderStructure} onChange={(v) => setData(p => ({...p, folderStructure: v}))} />
          </div>
          <div className="col-span-4">
            <SelectField 
              label="索引データ" 
              value={data.indexType} 
              onChange={(v) => setData(p => ({...p, indexType: v as any}))} 
              options={["なし", "索引データ（Excel）", "TSV（UTF-8 BOMなし）"].map(s => ({value:s, label:s}))} 
            />
          </div>

          <div className="col-span-12 grid grid-cols-4 gap-4 bg-amber-50 p-3 rounded">
            <Checkbox label="傾き補正" checked={data.deskew} onChange={(v) => setData(p => ({...p, deskew: v}))} />
            <Checkbox label="トリミング" checked={!!data.trimming} onChange={(e) => {/* UI簡易化 */}} hint="※詳細は仕様書へ反映" />
            <Checkbox label="2値化処理" checked={data.binaryConversion} onChange={(v) => setData(p => ({...p, binaryConversion: v}))} />
            {data.binaryConversion && <TextField label="2値化閾値" value={data.binaryThreshold} onChange={(v) => setData(p => ({...p, binaryThreshold: v}))} />}
          </div>

          <div className="col-span-12 grid grid-cols-4 gap-4 bg-amber-50 p-3 rounded mt-2">
            <Checkbox label="OCR処理 (標準ON)" checked={data.ocr} onChange={(v) => setData(p => ({...p, ocr: v}))} />
            <Checkbox label="OCR校正 (P+)" checked={data.ocrProofread} onChange={(v) => setData(p => ({...p, ocrProofread: v}))} />
          </div>

          <div className="col-span-12 border-t border-amber-100 my-2 pt-2">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-100 p-3 rounded">
                <NumberField 
                  label="繁忙期・負荷調整 (K_load)" 
                  value={data.kLoadPct} 
                  onChange={(v) => setData(p => ({...p, kLoadPct: Math.max(0, Math.min(20, v))}))} 
                  suffix="%" 
                />
                <div className="text-[10px] text-slate-500 mt-1">※ 特急対応や繁忙期割り増しとして係数に乗算 (例: 10% → ×1.1)</div>
              </div>
              <div className="bg-rose-50 p-3 rounded border border-rose-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-rose-800">係数上限 (Ceiling)</span>
                  <span className="text-lg font-black text-rose-600">x{data.capExceptionApproved ? "2.5" : "2.2"}</span>
                </div>
                <Checkbox 
                  label="例外上限（×2.5）を適用する" 
                  checked={data.capExceptionApproved} 
                  onChange={(v) => setData(p => ({...p, capExceptionApproved: v, factorCap: v ? 2.5 : 2.2}))} 
                  hint="※要承認事項"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* L5: 納品・媒体 */}
      <Card title="L5 納品・保管・消去" tone="slate" subtitle="成果物の納品形態とアフターフォロー">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <Label>納品媒体（チェックで標準単価計上）</Label>
            <div className="flex gap-4 mt-1">
              {["HDD/SSD", "DVD-R", "BD-R", "クラウド"].map(m => (
                <label key={m} className="flex items-center gap-2 cursor-pointer border px-3 py-2 rounded hover:bg-slate-50">
                  <input 
                    type="checkbox" 
                    checked={data.deliveryMedia.includes(m)} 
                    onChange={e => {
                      const next = e.target.checked ? [...data.deliveryMedia, m] : data.deliveryMedia.filter(x => x !== m);
                      setData(p => ({...p, deliveryMedia: next}));
                    }}
                  />
                  <span className="text-sm">{m}</span>
                </label>
              ))}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              ※特殊なHDD等が必要な場合は、上の「実費」欄に入力してください（標準単価と比較して高い方が適用されます）。
            </div>
          </div>
          <div className="col-span-3">
            <NumberField label="媒体セット数" value={data.mediaCount} onChange={(v) => setData(p => ({...p, mediaCount: Math.max(1, v)}))} />
          </div>
          <div className="col-span-3">
            <Checkbox label="レーベル印字" checked={data.labelPrint} onChange={(v) => setData(p => ({...p, labelPrint: v}))} />
          </div>
          <div className="col-span-3">
            <NumberField label="データ保管(月)" value={data.longTermStorageMonths} onChange={(v) => setData(p => ({...p, longTermStorageMonths: v}))} suffix="ヶ月" />
          </div>
          
          <div className="col-span-12 border-t border-slate-100 pt-2 grid grid-cols-2 gap-4">
            <Checkbox label="データ消去証明書の発行" checked={data.dataDeletionProof} onChange={(v) => setData(p => ({...p, dataDeletionProof: v}))} />
            <SelectField 
              label="原本/媒体廃棄" 
              value={data.disposal} 
              onChange={(v) => setData(p => ({...p, disposal: v as any}))} 
              options={["なし", "溶解処理", "返却のみ"].map(s => ({value:s, label:s}))} 
            />
          </div>
          <div className="col-span-12">
            <TextField label="納品備考" value={data.deliveryMemo} onChange={(v) => setData(p => ({...p, deliveryMemo: v}))} />
          </div>
        </div>
      </Card>

    </div>
  );
}