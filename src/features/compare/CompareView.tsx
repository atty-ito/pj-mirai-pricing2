import { useMemo } from "react";
import { Data, Tier, InspectionLevel } from "../../types/pricing";
import { computeCalc, CalcResult } from "../../utils/calculations";
import { fmtJPY } from "../../utils/formatters";

type Props = {
  data: Data;
};

/**
 * 比較用カードコンポーネント
 */
function PlanComparisonCard({ 
  tier, 
  label, 
  inspection, 
  calc, 
  stdTotal, 
  maxTotal 
}: { 
  tier: Tier; 
  label: string; 
  inspection: InspectionLevel; 
  calc: CalcResult; 
  stdTotal: number; 
  maxTotal: number; 
}) {
  const COLOR: Record<Tier, string> = {
    economy: "#22c55e", // green
    standard: "#3b82f6", // blue
    premium: "#ec4899", // pink
  };

  const accent = COLOR[tier];
  const ratio = Math.max(Math.min((calc.total / maxTotal) * 100, 100), 0);
  const delta = tier === "standard" ? 0 : calc.total - stdTotal;
  const deltaSign = delta === 0 ? "" : delta > 0 ? "+" : "-";
  const deltaAbs = Math.abs(delta);

  const inspectionLabel = (lv: InspectionLevel) => {
    if (lv === "sample") return "抜取検査";
    if (lv === "full") return "全数検査";
    if (lv === "double_full") return "二重全数";
    return "検査なし";
  };

  return (
    <div
      className="rounded-2xl border-2 p-4 shadow-sm"
      style={{
        borderColor: accent,
        background: `linear-gradient(135deg, ${accent}20, #ffffff 55%)`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-lg font-extrabold" style={{ color: accent }}>
          {label}
        </div>
        <div
          className="rounded-full px-3 py-1 text-xs font-extrabold text-white"
          style={{ backgroundColor: accent }}
        >
          {inspectionLabel(inspection)}
        </div>
      </div>

      <div className="mt-3 text-3xl font-black tabular-nums text-slate-900">{fmtJPY(calc.total)}</div>
      <div className="mt-1 text-xs text-slate-700">
        小計 {fmtJPY(calc.subtotal)} ／ 税 {fmtJPY(calc.tax)}
      </div>

      <div className="mt-3">
        <div className="h-3 w-full rounded-full bg-white/60 ring-1 ring-slate-200 overflow-hidden">
          <div className="h-full" style={{ width: `${ratio}%`, backgroundColor: accent }} />
        </div>
        <div className="mt-1 text-[11px] text-slate-700">相対比較（最大=100%）</div>
      </div>

      <div className="mt-3 rounded-xl bg-white/70 p-3 text-sm text-slate-800 ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Std差分（税込）</span>
          {tier === "standard" ? (
            <span className="tabular-nums">—</span>
          ) : (
            <span className="tabular-nums font-extrabold">{`${deltaSign}${fmtJPY(deltaAbs)}`}</span>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-700">
          <div className="rounded-lg bg-slate-50 px-2 py-1 text-center">
            固定費: <span className="font-bold">{fmtJPY(calc.lineItems.filter(x => x.kind === "fixed" || x.kind === "addon").reduce((a, b) => a + b.amount, 0))}</span>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-1 text-center">
            変動費: <span className="font-bold">{fmtJPY(calc.lineItems.filter(x => x.kind === "work").reduce((a, b) => a + b.amount, 0))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompareView({ data }: Props) {
  // 各プランの前提検査レベル
  const PRESET_INSPECTION: Record<Tier, InspectionLevel> = {
    economy: "sample",
    standard: "full",
    premium: "double_full",
  };

  // 3プランの計算を同時実行
  const plans = useMemo(() => {
    return [
      { 
        tier: "economy" as Tier, 
        label: "エコノミー", 
        inspection: PRESET_INSPECTION.economy, 
        calc: computeCalc({ ...data, tier: "economy", inspectionLevel: PRESET_INSPECTION.economy }) 
      },
      { 
        tier: "standard" as Tier, 
        label: "スタンダード", 
        inspection: PRESET_INSPECTION.standard, 
        calc: computeCalc({ ...data, tier: "standard", inspectionLevel: PRESET_INSPECTION.standard }) 
      },
      { 
        tier: "premium" as Tier, 
        label: "プレミアム", 
        inspection: PRESET_INSPECTION.premium, 
        calc: computeCalc({ ...data, tier: "premium", inspectionLevel: PRESET_INSPECTION.premium }) 
      },
    ];
  }, [data]);

  const stdTotal = plans.find((p) => p.tier === "standard")?.calc.total ?? 0;
  const maxTotal = Math.max(...plans.map((p) => p.calc.total), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-yellow-200 px-3 py-1 text-xs font-black text-slate-900 mb-2">
            内部資料（社外提出禁止）
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">見積比較（3プラン）</h2>
          <div className="mt-1 text-sm text-slate-600 font-medium">
            {data.clientName} / {data.projectName}
          </div>
        </div>
        
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 max-w-xs leading-relaxed">
          <div className="font-semibold text-slate-800 mb-1">比較の前提</div>
          作業対象（数量・仕様・オプション）は入力中の条件で固定し、プランごとの基礎単価および標準設定の検査レベルのみを変動させています。
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {plans.map((p) => (
          <PlanComparisonCard
            key={p.tier}
            tier={p.tier}
            label={p.label}
            inspection={p.inspection}
            calc={p.calc}
            stdTotal={stdTotal}
            maxTotal={maxTotal}
          />
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
        <div className="font-extrabold text-slate-900 mb-2">プラン選択のポイント</div>
        <div className="space-y-2 leading-relaxed text-xs">
          <div>① <span className="font-bold">エコノミー</span>: 予算制約が厳しい場合に提案。検査は抜取のため、一定の不備許容を前提とする。</div>
          <div>② <span className="font-bold">スタンダード</span>: 推奨設定。全数検査と工程内是正を含み、一般的な公文書作成レベルを担保。</div>
          <div>③ <span className="font-bold">プレミアム</span>: 厳格な仕様や重要資料に。二重検査と詳細な作業ログにより、高い監査耐性を持つ。</div>
        </div>
      </div>
    </div>
  );
}