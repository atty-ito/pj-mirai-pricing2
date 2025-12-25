import { Label } from "./Label";

export function TextAreaField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <Label>{props.label}</Label>
      <textarea
        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
        value={String(props.value)}
        placeholder={props.placeholder}
        rows={props.rows ?? 4}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}