import { Data, ViewKey } from "../../types/pricing";

const VIEW_ITEMS: Array<{ key: ViewKey; label: string; hint: string }> = [
  { key: "input", label: "入力画面", hint: "案件条件・L1〜L5" },
  { key: "instruction", label: "指示書", hint: "現場用 作業指示書" },
  { key: "estimate", label: "見積もり", hint: "顧客提出用 見積書" },
  { key: "compare", label: "比較（内部）", hint: "プラン比較・分析" },
  { key: "spec", label: "仕様", hint: "仕様書 (SOW)" },
  { key: "inspection", label: "検査", hint: "検査記録表 (QA)" },
];

function NavButton(props: {
  viewKey: ViewKey;
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  const { viewKey, active, label, hint, onClick } = props;

  const accent = (() => {
    switch (viewKey) {
      case "input":
        return { dot: "bg-blue-500", text: "text-blue-700", border: "border-blue-600", bg: "bg-blue-50" };
      case "instruction":
        return { dot: "bg-purple-500", text: "text-purple-700", border: "border-purple-600", bg: "bg-purple-50" };
      case "estimate":
        return { dot: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-600", bg: "bg-emerald-50" };
      case "compare":
        return { dot: "bg-orange-500", text: "text-orange-700", border: "border-orange-600", bg: "bg-orange-50" };
      case "spec":
        return { dot: "bg-teal-500", text: "text-teal-700", border: "border-teal-600", bg: "bg-teal-50" };
      case "inspection":
        return { dot: "bg-pink-500", text: "text-pink-700", border: "border-pink-600", bg: "bg-pink-50" };
      default:
        return { dot: "bg-slate-400", text: "text-slate-700", border: "border-slate-500", bg: "bg-slate-50" };
    }
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group w-full rounded-xl border-2 px-4 py-3 text-left transition-all duration-100 ease-in-out relative overflow-hidden",
        "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-none",
        active 
          ? `border-${accent.border} bg-white shadow-sm border-b-4` 
          : "border-slate-200 bg-white border-b-4 hover:border-slate-300",
      ].join(" ")}
    >
      {active && <div className={`absolute inset-0 opacity-10 ${accent.bg}`} />}
      
      <div className="relative flex items-center gap-3">
        <span className={[
          "h-3 w-3 rounded-full shadow-sm ring-2 ring-white",
          active ? accent.dot : "bg-slate-300 group-hover:bg-slate-400"
        ].join(" ")} />
        <div>
          <div className={["text-sm font-bold", active ? "text-slate-900" : "text-slate-600"].join(" ")}>
            {label}
          </div>
          <div className={["text-[10px] font-medium mt-0.5", active ? accent.text : "text-slate-400"].join(" ")}>
            {hint}
          </div>
        </div>
      </div>
    </button>
  );
}

export function Sidebar(props: { view: ViewKey; setView: (v: ViewKey) => void; data: Data }) {
  // 検査レベルの表示を簡略化（文字列の一部判定）
  const getInspLabel = (lvl: string) => {
    if (lvl.includes("二重")) return "二重全数";
    if (lvl.includes("全数")) return "全数";
    if (lvl.includes("抜き取り") || lvl.includes("簡易")) return "抜取";
    return "その他";
  };

  return (
    <aside className="w-64 shrink-0 no-print flex flex-col gap-6">
      <nav className="space-y-3">
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
      </nav>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
          <div className="font-bold text-xs text-slate-400 uppercase tracking-wider">Current Status</div>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-[10px] text-slate-500 font-medium mb-0.5">選択中のプラン</div>
            <div className={`font-bold px-2 py-1 rounded text-center text-xs ${
              props.data.tier === 'economy' ? 'bg-green-100 text-green-700' :
              props.data.tier === 'standard' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
            }`}>
              {props.data.tier.toUpperCase()}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-medium mb-0.5">検査レベル</div>
            <div className="font-bold text-slate-700 flex items-center gap-2 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              {getInspLabel(props.data.inspectionLevel)}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}