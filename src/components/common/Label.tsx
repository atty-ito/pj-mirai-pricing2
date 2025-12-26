import { ReactNode } from "react";

export function Label(props: { children: ReactNode }) {
  return <div className="text-xs font-medium text-slate-600 mb-1">{props.children}</div>;
}