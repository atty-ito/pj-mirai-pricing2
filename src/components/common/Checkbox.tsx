export function Checkbox(props: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
    return (
      <label className="flex items-start gap-2 rounded-lg border bg-slate-50 px-3 py-2 cursor-pointer">
        <input type="checkbox" className="mt-1" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
        <div className="min-w-0">
          <div className="text-sm text-slate-800">{props.label}</div>
          {props.hint ? <div className="text-xs text-slate-500">{props.hint}</div> : null}
        </div>
      </label>
    );
  }