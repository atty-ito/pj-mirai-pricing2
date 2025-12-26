export function InlineSealBox(props: { label?: string }) {
    return (
      <span className="ml-2 inline-flex items-center justify-center border border-slate-500 w-7 h-7 text-[10px] text-slate-700 align-middle">
        {props.label || "印"}
      </span>
    );
  }