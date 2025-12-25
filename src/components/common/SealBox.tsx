export function SealBox(props: { label?: string }) {
    return (
      <div className="inline-flex flex-col items-center justify-center border border-slate-500 w-12 h-12 text-[10px] text-slate-700">
        <div>{props.label || "印"}</div>
      </div>
    );
  }