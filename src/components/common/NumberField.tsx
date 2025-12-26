import { Label } from "./Label";
import { toMoney } from "../../utils/formatters";

export function NumberField(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div>
      <Label>{props.label}</Label>
      <div className="flex items-center gap-2">
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          type="number"
          min={props.min ?? 0}
          step={props.step ?? 1}
          value={Number.isFinite(props.value) ? props.value : 0}
          onChange={(e) => props.onChange(toMoney(e.target.value))}
        />
        {props.suffix ? <div className="text-xs text-slate-500">{props.suffix}</div> : null}
      </div>
    </div>
  );
}