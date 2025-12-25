import { Data } from "../../types/pricing";
import { num } from "../../utils/formatters";

type SpecSection = { title: string; body: string };

/**
 * データに基づき仕様書のセクションを構築する
 */
function buildSpecSections(data: Data): SpecSection[] {
  const profile = data.specProfile;
  const sections: SpecSection[] = [];
  const push = (title: string, bodyLines: string[]) => sections.push({ title, body: bodyLines.join("\n") });

  const specLevelLabel = profile === "standard" ? "標準" : profile === "ndl" ? "詳細" : "厳格";

  const workItemSummary = data.workItems
    .map((w) => `- ${w.title}：${num(w.qty)}${w.unit} / ${w.sizeClass} / ${w.colorMode} / ${w.dpi}dpi`)
    .join("\n");

  // 1. 目的
  push("1. 目的・適用範囲", [
    "本書は、本案件におけるデジタルデータ作成に関する仕様を定める。",
    `仕様レベルは「${specLevelLabel}」を適用する。`,
  ]);

  // 2. 対象
  push("2. 対象・成果物", [
    "対象資料および数量は以下の通りとする。",
    workItemSummary || "（未設定）",
  ]);

  // 3. 画像作成基準（プロファイルにより詳細度を変化）
  const imageLines = [
    "資料の外縁まで欠落なく取得し、文字の可読性を最優先とする。",
    "傾き補正は原則として±2度以内を目安とする。",
  ];
  if (profile !== "standard") {
    imageLines.push("カラーマネジメントとしてsRGBプロファイルを埋め込むものとする。");
    imageLines.push("見開き資料は、原本の綴じ状態に応じて適切に判断し、判型を統一する。");
  }
  push("3. 画像作成基準", imageLines);

  // 4. メタデータ
  const metaLines = ["成果物には、検索性を高めるための適切なファイル名を付与する。"];
  if (data.specProfile === "ndl" || data.specProfile === "gunma") {
    metaLines.push("管理用メタデータ（作成日、機材情報等）を指定の形式で作成し格納する。");
  }
  if (data.specProfile === "gunma" && data.gunmaMetadataMandatory) {
    metaLines.push("【厳格】必須項目に欠落がある場合は不合格とし、再作業を行う。");
  }
  push("4. メタデータ要件", metaLines);

  // 5. 検査（検査レベルと連動）
  const inspLines = [
    `検査は「${data.inspectionLevel === "none" ? "目視点検" : "所定の検査基準"}」に基づき実施する。`,
  ];
  if (data.inspectionLevel === "full" || data.inspectionLevel === "double_full" || data.gunmaAllInspection) {
    inspLines.push("本案件は全数検査を原則とし、工程内での品質担保を行う。");
  }
  push("5. 品質検査", inspLines);

  // 6. 納品・メディア
  const deliveryLines = ["成果物は、指定のフォルダ構成に整理して納品する。"];
  if (data.specProfile === "gunma" && data.gunmaMediaRequirements) {
    deliveryLines.push("【厳格】納品メディアはウイルスチェック済みの新品を使用し、チェックサムを付帯する。");
  }
  push("6. 納品形式・媒体", deliveryLines);

  return sections;
}

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