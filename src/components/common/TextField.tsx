import { Label } from "./Label";

export function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const disabled = Boolean(props.disabled);
  return (
    <div>
      <Label>{props.label}</Label>
      <input
        className={[
          "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400",
          disabled ? "bg-slate-50 text-slate-600" : "bg-white",
        ].join(" ")}
        value={String(props.value)}
        placeholder={props.placeholder}
        disabled={disabled}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}