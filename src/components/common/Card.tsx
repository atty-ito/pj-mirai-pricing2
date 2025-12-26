import { ReactNode } from "react";

export type CardTone = "slate" | "indigo" | "emerald" | "amber" | "rose";

const CARD_TONE: Record<CardTone, { outer: string; header: string; dot: string }> = {
  slate: {
    outer: "border-l-4 border-l-slate-400 print:border-l-0",
    header: "bg-slate-50/60 print:bg-white",
    dot: "bg-slate-500",
  },
  indigo: {
    outer: "border-l-4 border-l-indigo-500 print:border-l-0",
    header: "bg-indigo-50/50 print:bg-white",
    dot: "bg-indigo-500",
  },
  emerald: {
    outer: "border-l-4 border-l-emerald-500 print:border-l-0",
    header: "bg-emerald-50/50 print:bg-white",
    dot: "bg-emerald-500",
  },
  amber: {
    outer: "border-l-4 border-l-amber-500 print:border-l-0",
    header: "bg-amber-50/60 print:bg-white",
    dot: "bg-amber-500",
  },
  rose: {
    outer: "border-l-4 border-l-rose-500 print:border-l-0",
    header: "bg-rose-50/50 print:bg-white",
    dot: "bg-rose-500",
  },
};

export function Card(props: { 
  title: string; 
  children: ReactNode; 
  right?: ReactNode; 
  tone?: CardTone; 
  subtitle?: string 
}) {
  const tone: CardTone = props.tone ?? "slate";
  const t = CARD_TONE[tone];
  return (
    <div
      className={[
        "print-page rounded-2xl border bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none mb-4",
        t.outer,
      ].join(" ")}
    >
      <div className={["flex items-center justify-between border-b px-4 py-3 print:bg-white", t.header].join(" ")}>
        <div className="flex items-start gap-2">
          <span className={["mt-1 inline-block h-2.5 w-2.5 rounded-full print:hidden", t.dot].join(" ")} />
          <div>
            <div className="text-sm font-semibold text-slate-800">{props.title}</div>
            {props.subtitle ? <div className="mt-0.5 text-xs text-slate-500">{props.subtitle}</div> : null}
          </div>
        </div>
        {props.right}
      </div>
      <div className="p-4">{props.children}</div>
    </div>
  );
}