import { Data } from "../types/pricing";
import { num, inspectionLabel, metadataLabel, handlingLabel, sizeLabel, colorModeLabel, dpiLabel, specProfilePublicLabel } from "./formatters";

export type SpecSection = { title: string; body: string };

export function buildSpecSections(data: Data): SpecSection[] {
  const profile = data.specProfile;
  const sections: SpecSection[] = [];
  const push = (title: string, bodyLines: string[]) => sections.push({ title, body: bodyLines.join("\n") });

  const hasAny = (s: string) => (s ?? "").trim().length > 0;
  const workItemSummary = data.workItems
    .map(
      (w) =>
        `- ${w.title}：数量 ${num(w.qty)} ${w.unit}／${sizeLabel(w.sizeClass)}／${colorModeLabel(w.colorMode)}／${dpiLabel(
          w.dpi,
        )}／形式 ${w.formats.join("・")}／OCR ${w.ocr ? "有" : "無"}／メタデータ ${metadataLabel(w.metadataLevel)}／取扱 ${handlingLabel(
          w.handling,
        )}`
    )
    .join("\n");

  const level = specProfilePublicLabel(profile);

  push("1. 目的・適用範囲", [
    "本書は、本案件におけるデジタルデータ作成（撮影・スキャン、画像処理、メタデータ作成、検査、納品）に関する仕様を定める。",
    `仕様レベルは「${level}」である。仕様レベルに応じて、記述の粒度、検査強度、媒体要件、メタデータ要件が変化する。`,
    "本書はドラフトであり、対象資料・数量・要件が確定した時点で最終化する。",
  ]);

  push("2. 対象・成果物", [
    "対象資料および成果物（行アイテム）は、入力情報に基づき次のとおりである。",
    workItemSummary || "（行アイテム未設定）",
    "成果物は原則として、(i) 保存用（マスター）と (ii) 利用用（閲覧・配布用）に区分し、必要に応じてメタデータおよびログを付す。",
  ]);

  push("3. 画像作成の基本要件", [
    "各画像は、文字可読性と将来再利用性の双方を満たすよう作成する。",
    "撮影・スキャン時は、傾き、天地逆、欠け、ピンぼけ、露出過不足、反射・写り込み、モアレ、偽色、ノイズ、歪み等が生じないよう留意する。",
    "裁断の有無、非裁断資料の開き角、背割れ等、物理的制約が画質に影響する場合は、無理な矯正を避け、別途ログに記録する（9章）。",
  ]);

  const trimLines = [
    "トリミングは、原則として資料の外周を欠かさず取得しつつ、不要な余白を過度に残さない。",
    "標準では、軽微な傾き補正・余白調整に留め、内容改変に該当する補正は行わない。",
  ];
  if (profile !== "standard") {
    trimLines.push(
      "詳細以上では、トリミング倍率（例：110%）等の運用ルールを定め、見開き・折込・大判を含む場合でも一貫した外周取得を行う。",
      "見開きや横長ページは、判型に応じて「1画像（見開き）」「左右分割」のいずれかを採用し、採用方式はログに記録する。",
    );
  }
  push("4. トリミング・判型・特殊ページ", trimLines);

  if (profile !== "standard") {
    push("5. 折込・大判・薄紙等の取扱い（詳細）", [
      "折込（複数回折り）等の特殊ページは、折り畳み状態の全体像を撮影した後、段階的に展開して撮影する（展開手順がある場合はそれに従う）。",
      "大判（例：A2級以上）で1コマに収まらない場合は、複数コマに分割して取得する。分割時は、継ぎ合わせ可能となるよう重なり（オーバーラップ）を確保し、順序（例：S字／Z字）を固定する。",
      "薄紙や裏写りが強い資料は、中間紙を挿入する等により可読性を確保する。作業上の工夫・制約はログに記録する。",
      "サイズ変更、切断、貼り付き、ページ欠落が疑われる場合は、その事実をログで明示する（9章）。",
    ]);
  }

  const qcLines = [
    "品質基準の判定は、目視確認に加え、必要に応じて拡大確認を行う。",
    "NG例（代表）：傾き、欠け、ピンぼけ、露出過不足、反射・写り込み、モアレ、偽色、ノイズ、天地逆、左右逆、歪み。",
  ];
  if (profile !== "standard") {
    qcLines.push(
      "詳細以上では、（必要に応じ）100%表示でのピクセル確認を行い、偽色・ノイズ・文字のつぶれ等を点検する。",
      "再撮影・再スキャンが必要な場合は、工程内是正として行い、差替えの履歴をログに残す。",
    );
  }
  if (profile === "gunma") {
    qcLines.push(
      "厳格では、傾き等の閾値（例：傾き2%以内など）を目安として運用し、全数検査を前提に是正を行う。",
      "偽色・ノイズ・モアレ等の微細な劣化も不合格要因となり得るため、拡大確認を標準化する。",
    );
  }
  push("6. 画質基準・品質検査", qcLines);

  const colorLines = [
    "画像処理は、資料の情報を損なわない範囲で、軽微な補正（傾き補正、余白調整等）に限定するのを原則とする。",
    "保存用（マスター）は、可能な限り可逆または非圧縮の形式を採用し、利用用（閲覧用）は用途に応じて圧縮・PDF化等を行う。",
  ];
  if (profile !== "standard") {
    colorLines.push(
      "詳細以上では、色空間（例：sRGB）やICCプロファイルの扱いを定め、同一資料群内で一貫性を担保する。",
      "閲覧用PDFを作成する場合、画質と容量のバランスを考慮しつつ、視認性（文字のエッジ・階調）を損なわない設定とする。",
    );
  }
  push("7. 画像処理・色管理", colorLines);

  const mdLines = ["メタデータは、成果物の探索性・再利用性を高めるために付与する。"];
  const flags = {
    requireMetadata: profile === "gunma" ? data.gunmaMetadataMandatory : profile === "ndl"
  };
  if (!flags.requireMetadata) {
    mdLines.push("標準では、基本項目（例：ファイル名、通番、種別、ページ範囲等）を中心に、提供可能な範囲で付与する。");
  } else {
    mdLines.push(
      "詳細以上では、必須項目群を定め、欠落を不合格扱いとする（厳格の場合）。",
      "必須項目例：資料識別子／資料名／巻冊・簿冊識別／ページ（コマ）番号／ファイル名／作成日／形式／解像度／色／備考。",
      "値の表記は、区切り（半角スペース、スラッシュ等）や禁則（使用不可文字等）を定め、整合性を担保する。",
    );
  }
  if (profile !== "standard") {
    mdLines.push(
      "作業・機材情報（例：ホストPC、OS、スキャナ／カメラ、画像処理ソフト）は、所定の形式で記録する（例：『対象資料群名及び区分 / 機材名』をカンマ＋半角スペース区切りで列挙）。",
    );
  }
  push("8. メタデータ要件", mdLines);

  const logLines = [
    "作業ログ（管理データ）は、後日の説明可能性を担保するために作成する。",
    "最低限、欠落・重複・差替え・対象外等、成果物の完全性に影響する事項を記録する。",
  ];
  if (profile !== "standard") {
    logLines.push(
      "詳細以上では、以下の類型をログで明示する（例示）：",
      "- スキャニング対象外（対象資料の欠落、欠番等）",
      "- 切断（裁断・分割等の作業が生じた場合）",
      "- サイズ変更（原資料と撮影条件が異なる場合）",
      "- 分割（大判の分割、見開きの左右分割等）",
      "- 誤り（天地逆、左右逆、誤ファイル等）",
      "- ページ貼り付き（剥離不可等）",
      "また、資料群ごとの整理情報、フォルダ構成、媒体ラベル情報等を含める。",
    );
  }
  push("9. ログ・管理データ", logLines);

  const inspLines = [
    `検査レベルは「${inspectionLabel(data.inspectionLevel)}」である。`,
    "検査は、(i) 画質、(ii) 欠落・重複、(iii) 命名・フォルダ整合、(iv) メタデータ整合、(v) 媒体要件の順に確認する。",
  ];
  const specFlags = {
    fullInspection: data.specProfile === "gunma" ? data.gunmaAllInspection : (data.inspectionLevel === "full" || data.inspectionLevel === "double_full")
  };
  if (specFlags.fullInspection) {
    inspLines.push("全数検査を原則とし、再撮影・差替えを工程内で完結させる。");
  } else {
    inspLines.push("抜取検査の場合でも、重大な欠陥が発見された場合は追加検査を行う。");
  }
  push("10. 検査・是正", inspLines);

  const mediaLines = [
    "納品は、成果物（マスター／閲覧用／メタデータ／ログ）を所定のフォルダ構成で格納し、媒体単位で管理する。",
  ];
  const requireMedia = data.specProfile === "gunma" ? data.gunmaMediaRequirements : data.specProfile === "ndl";
  if (requireMedia) {
    mediaLines.push(
      "詳細以上では、外付け媒体等への格納、媒体ラベル（媒体名、巻号、作成年月日、件名等）、ウイルスチェック、チェックサム等の運用を行う。",
      "媒体および保管資材（保存箱・封筒等）が必要な場合は、別途実費として計上することがある。",
    );
  } else {
    mediaLines.push("標準では、納品媒体の種類・本数は協議により定める。");
  }
  push("11. 納品媒体・保管", mediaLines);

  push("12. 情報管理・セキュリティ", [
    "作業中・納品後の情報管理は、機密度および取り扱い区分に従い実施する。",
    profile === "gunma" ? "厳格では、アクセス制御、作業者権限、持出制限、監査可能なログ等により、追跡可能性を担保する。" : ""
  ]);

  push("13. 付帯事項", [
    "本書に定めのない事項、または解釈に疑義がある事項は、協議の上で取り決める。",
    hasAny(data.notes) ? `備考：${data.notes}` : "備考：—",
  ]);

  return sections.map((s, i) => {
    const base = String(s.title || "").replace(/^\s*\d+\.\s*/, "");
    return { ...s, title: `${i + 1}. ${base}` };
  });
}