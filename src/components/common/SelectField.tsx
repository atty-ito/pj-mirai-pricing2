import { Label } from "./Label";

export function SelectField<T extends string | number>(props: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
}) {
  return (
    <div>
      <Label>{props.label}</Label>
      <select
        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
        value={String(props.value)}
        onChange={(e) => {
          const raw = e.target.value;
          const found = props.options.find((o) => String(o.value) === raw);
          props.onChange((found ? found.value : (props.options[0]?.value as T)) as T);
        }}
      >
        {props.options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      {props.hint ? <div className="mt-1 text-xs text-slate-500">{props.hint}</div> : null}
    </div>
  );
}