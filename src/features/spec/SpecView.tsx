import { Data } from "../../types/pricing";
import { buildSpecSections } from "../../utils/specLogic";
import { suggestQuotationNo } from "../../utils/formatters";
import { ISSUER } from "../../constants/coefficients";

type Props = {
  data: Data;
};

export function SpecView({ data }: Props) {
  const sections = buildSpecSections(data);
  const qno = data.quotationNo || suggestQuotationNo(data.createdDate);

  return (
    <div className="space-y-4">
      <div className="print-page bg-white p-[20mm] shadow-sm border min-h-[297mm] text-slate-900 font-serif">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-bold tracking-widest border-b-2 border-slate-900 inline-block pb-1">
            業務仕様書
          </h1>
          <div className="mt-4 text-sm font-bold">{data.subject || "（件名未入力）"}</div>
        </div>

        <div className="space-y-8 text-[10.5pt] leading-relaxed">
          {sections.map((s, idx) => (
            <section key={idx}>
              <h2 className="text-base font-bold border-l-4 border-slate-800 pl-3 mb-3">
                {s.title}
              </h2>
              <div className="pl-4 text-slate-800">
                {s.p.map((line, i) => (
                  <p key={i} className="mb-2 text-justify">
                    {line}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-auto pt-16 border-t border-slate-300 text-[10pt] text-slate-600 flex justify-between items-end">
          <div>
            <div className="font-bold">{data.issuerOrg}</div>
            <div className="text-[9pt]">{ISSUER.cert}</div>
          </div>
          <div className="text-right text-[9pt]">
            <div>Ref: {qno}</div>
            <div>Date: {data.createdDate}</div>
          </div>
        </div>
      </div>
    </div>
  );
}