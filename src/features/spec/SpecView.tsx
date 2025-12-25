import { Data } from "../../types/pricing";
import { buildSpecSections } from "../../utils/specLogic";

type Props = {
  data: Data;
};

export function SpecView({ data }: Props) {
  const sections = buildSpecSections(data);

  return (
    <div className="space-y-4">
      <div className="print-page bg-white p-10 shadow-sm border min-h-[297mm] text-slate-800">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-bold tracking-widest border-b-2 border-slate-900 inline-block pb-1">
            業務仕様書（ドラフト）
          </h1>
          <p className="mt-4 text-sm text-slate-500">件名：{data.projectName || "（未入力）"}</p>
        </div>

        <div className="space-y-8">
          {sections.map((s, idx) => (
            <section key={idx}>
              <h2 className="text-base font-bold border-l-4 border-slate-900 pl-3 mb-3">
                {s.title}
              </h2>
              <div className="text-sm leading-relaxed pl-4 whitespace-pre-wrap text-slate-700">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-20 pt-8 border-t text-[11px] text-slate-400">
          <div className="flex justify-between">
            <span>作成元：{data.issuerOrg}</span>
            <span>参照ID：{data.quotationNo || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}