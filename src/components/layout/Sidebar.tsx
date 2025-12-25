import { Data, ViewKey } from "../../types/pricing";

// ナビゲーション項目の定義
const VIEW_ITEMS: Array<{ key: ViewKey; label: string; hint: string }> = [
  { key: "input", label: "入力画面", hint: "案件条件・単価・スイッチ" },
  { key: "instruction", label: "指示書", hint: "内部用 作業指示書" },
  { key: "estimate", label: "見積もり", hint: "顧客提出用 見積書" },
  { key: "compare", label: "比較（内部）", hint: "内部用 見積比較" },
  { key: "spec", label: "仕様", hint: "仕様書（標準に連動）" },
  { key: "inspection", label: "検査", hint: "検査表（全数/抜取など）" },
];

function NavButton(props: {
  viewKey: ViewKey;
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  const { viewKey, active, label, hint, onClick } = props;

  // ビューごとのアクセントカラー設定
  const accent = (() => {
    switch (viewKey) {
      case "input":
        return { dot: "bg-blue-500", active: "border-blue-700 bg-blue-600 text-white", hintActive: "text-blue-100", inactive: "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50" };
      case "instruction":
        return { dot: "bg-purple-500", active: "border-purple-700 bg-purple-600 text-white", hintActive: "text-purple-100", inactive: "border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50" };
      case "estimate":
        return { dot: "bg-emerald-500", active: "border-emerald-700 bg-emerald-600 text-white", hintActive: "text-emerald-100", inactive: "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50" };
      case "compare":
        return { dot: "bg-orange-500", active: "border-orange-700 bg-orange-600 text-white", hintActive: "text-orange-100", inactive: "border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50" };
      case "spec":
        return { dot: "bg-teal-500", active: "border-teal-700 bg-teal-600 text-white", hintActive: "text-teal-100", inactive: "border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50" };
      case "inspection":
        return { dot: "bg-pink-500", active: "border-pink-700 bg-pink-600 text-white", hintActive: "text-pink-100", inactive: "border-slate-200 bg-white hover:border-pink-300 hover:bg-pink-50" };
      default:
        return { dot: "bg-slate-400", active: "border-slate-900 bg-slate-900 text-white", hintActive: "text-slate-200", inactive: "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50" };
    }
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-xl border px-3 py-2 text-left transition",
        active ? accent.active : accent.inactive,
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className={["h-2.5 w-2.5 rounded-full", accent.dot].join(" ")} />
        <div className="text-sm font-semibold">{label}</div>
      </div>
      <div className={["mt-0.5 text-xs", active ? accent.hintActive : "text-slate-600"].join(" ")}>
        {hint}
      </div>
    </button>
  );
}

export function Sidebar(props: { view: ViewKey; setView: (v: ViewKey) => void; data: Data }) {
  return (
    <aside className="w-56 shrink-0 no-print">
      <div className="sticky top-4 space-y-2">
        {VIEW_ITEMS.map((it) => (
          <NavButton
            key={it.key}
            viewKey={it.key}
            active={props.view === it.key}
            label={it.label}
            hint={it.hint}
            onClick={() => props.setView(it.key)}
          />
        ))}

        {/* 簡易ステータス表示 */}
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-100 p-3 text-xs text-slate-700">
          <div className="flex items-center justify-between">
            <div className="font-semibold">現在の前提</div>
            <div className="text-[10px] text-slate-500">参照用</div>
          </div>
          <div className="mt-1 space-y-1 text-slate-600">
            <div>
              プラン: <span className="font-medium text-slate-800">{props.data.tier === 'economy' ? 'エコノミー' : props.data.tier === 'standard' ? 'スタンダード' : 'プレミアム'}</span>
            </div>
            <div>
              検査: <span className="font-medium text-slate-800">{
                props.data.inspectionLevel === 'none' ? 'なし' : 
                props.data.inspectionLevel === 'sample' ? '抜取' : 
                props.data.inspectionLevel === 'full' ? '全数' : '二重全数'
              }</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}