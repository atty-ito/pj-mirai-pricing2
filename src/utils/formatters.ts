/**
 * 一意のID（ランダムな文字列）を生成する
 */
export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

/**
 * 数値をカンマ区切りの文字列に変換する
 */
export function num(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const s = n % 1 === 0 ? String(Math.round(n)) : String(n);
  const [i, d] = s.split(".");
  const head = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return d ? `${head}.${d}` : head;
}

/**
 * 数値を日本円形式(¥)の文字列に変換する
 */
export function fmtJPY(n: number): string {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(Math.round(n));
  return `${sign}¥${v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/**
 * ISO形式の日付(YYYY-MM-DD)を日本形式(YYYY年MM月DD日)に変換する
 */
export function formatJPDate(iso: string): string {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(iso || "");
  const y = m[1];
  const mm = String(Number(m[2]));
  const dd = String(Number(m[3]));
  return `${y}年${mm}月${dd}日`;
}

/**
 * ISO形式の日付からハイフンを除去した文字列を取得する
 */
export function yyyymmdd(iso: string): string {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[1]}${m[2]}${m[3]}`;
}

/**
 * 見積Noの候補を生成する
 */
export function suggestQuotationNo(iso: string): string {
  const ymd = yyyymmdd(iso);
  if (!ymd) return "";
  return `${ymd}-001`;
}

/**
 * ローカルストレージを利用して見積Noを確定採番する
 */
export function allocateQuotationNo(iso: string): string {
  const ymd = yyyymmdd(iso);
  if (!ymd) return "";
  if (typeof window === "undefined") return `${ymd}-001`;

  const key = `quote_seq_${ymd}`;
  const cur = Number(window.localStorage.getItem(key) || "0");
  const next = Math.max(1, cur + 1);
  window.localStorage.setItem(key, String(next));
  const seq = String(next).padStart(3, "0");
  return `${ymd}-${seq}`;
}

/**
 * 検査報告Noの候補を生成する
 */
export function suggestInspectionReportNo(iso: string): string {
  const ymd = yyyymmdd(iso);
  if (!ymd) return "";
  return `INSP-${ymd}-001`;
}

/**
 * ローカルストレージを利用して検査報告Noを確定採番する
 */
export function allocateInspectionReportNo(iso: string): string {
  const ymd = yyyymmdd(iso);
  if (!ymd) return "";
  if (typeof window === "undefined") return `INSP-${ymd}-001`;

  const key = `khq_insp_seq_${ymd}`;
  const cur = Number(window.localStorage.getItem(key) || "0");
  const next = Math.max(1, cur + 1);
  window.localStorage.setItem(key, String(next));
  const seq = String(next).padStart(3, "0");
  return `INSP-${ymd}-${seq}`;
}

/**
 * 文字列を数値に変換する（カンマ除去対応）
 */
export function toInt(v: number | string | null | undefined, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * 入力値を金額数値に変換する
 */
export function toMoney(v: string, fallback = 0): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}