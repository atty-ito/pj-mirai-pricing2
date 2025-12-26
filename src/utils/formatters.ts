// 互換性のため単純なフォーマッターのみ残す
export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}

export function num(n: any): string {
  return Number(n).toLocaleString();
}

export function toInt(v: any): number {
  const n = parseInt(String(v).replace(/,/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

export function toMoney(v: any): number {
  return toInt(v);
}

export function fmtJPY(n: number): string {
  return "¥" + Math.round(n).toLocaleString();
}

export function suggestQuotationNo(dateStr: string): string {
  const d = dateStr.replace(/-/g, "");
  return `${d}-001`;
}

export function suggestInspectionReportNo(dateStr: string): string {
  const d = dateStr.replace(/-/g, "");
  return `QA-${d}-001`;
}

export function allocateQuotationNo(dateStr: string): string {
  return suggestQuotationNo(dateStr); // 簡易実装
}

// ラベル変換
export function tierLabel(t: string): string {
  return t.toUpperCase();
}

export function sizeLabel(s: string): string {
  return s;
}

export function colorModeLabel(c: string): string {
  return c;
}

export function dpiLabel(d: string): string {
  return d;
}

export function formatLabel(f: string): string {
  return f;
}

export function inspectionLabel(i: string): string {
  return i;
}