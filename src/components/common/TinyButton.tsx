export function TinyButton(props: { label: string; onClick: () => void; kind?: "primary" | "normal" | "danger" }) {
    const cls =
      props.kind === "primary"
        ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
        : props.kind === "danger"
        ? "border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
        : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50";
    return (
      <button type="button" className={`rounded-lg border px-2 py-1 text-xs transition ${cls}`} onClick={props.onClick}>
        {props.label}
      </button>
    );
  }