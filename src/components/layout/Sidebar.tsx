import { Data, ViewKey } from "../../types/pricing";

const VIEW_ITEMS: Array<{ key: ViewKey; label: string; hint: string }> = [
  { key: "input", label: "入力画面", hint: "案件条件・L1〜L5" },
  { key: "instruction", label: "指示書", hint: "現場用 作業指示書" },
  { key: "estimate", label: "見積もり", hint: "顧客提出用 見積書" },
  { key: "compare", label: "比較（内部）", hint: "プラン比較・分析" },
  { key: "spec", label: "仕様", hint: "仕様書 (SOW)" },
  { key: "inspection", label: "検査", hint: "検査記録表 (QA)" },
];

function NavButton(props: { viewKey: ViewKey; active: boolean; label: string; hint: string; onClick: () => void; }) {
  const { active, label, hint, onClick } = props;
  const accent = active ? "border-indigo-600 bg-indigo-50" : "border-transparent hover:bg-slate-50";
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 border-l-4 rounded-r-lg transition-colors ${accent}`}>
      <div className={`text-sm font-bold ${active ? "text-indigo-800" : "text-slate-600"}`}>{label}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">{hint}</div>
    </button>
  );
}

export function Sidebar(props: { view: ViewKey; setView: (v: ViewKey) => void; data: Data }) {
  return (
    <aside className="w-64 shrink-0 no-print">
      <div className="sticky top-6 flex flex-col gap-6">
        <nav className="space-y-1 bg-white rounded-xl shadow-sm border border-slate-200 py-2">
          {VIEW_ITEMS.map((it) => (
            <NavButton key={it.key} viewKey={it.key} active={props.view === it.key} label={it.label} hint={it.hint} onClick={() => props.setView(it.key)} />
          ))}
        </nav>
        
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status</div>
          <div className="space-y-2">
            <div className="text-xs">
              <span className="text-slate-500">Plan:</span> <span className="font-bold">{props.data.tier.toUpperCase()}</span>
            </div>
            <div className="text-xs truncate" title={props.data.inspectionLevel}>
              <span className="text-slate-500">Insp:</span> {props.data.inspectionLevel.split(" ")[0]}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}