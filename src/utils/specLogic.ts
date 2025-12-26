import { Data } from "../types/pricing";
import { toInt } from "./formatters";

export type SpecSection = { title: string; p: string[] };

export function buildSpecSections(data: Data): SpecSection[] {
  const totalVol = data.workItems.reduce((s, w) => s + toInt(w.qty), 0);
  
  // サービス内容
  const services = data.workItems
    .map((w) => {
      const f = [...w.fileFormats, w.fileFormatsFree].filter(Boolean).join("/");
      return `${w.title}（${toInt(w.qty).toLocaleString()}${w.unit} / ${f}）`;
    })
    .join("、");

  // 仕様書支給の有無による文言変化
  const specBase = data.specProvidedByClient
    ? "本業務は、発注者より提示された仕様書、および本仕様書の記載事項に基づき遂行する。"
    : "本業務の仕様は、本仕様書の記載事項、および別途協議決定した事項に基づく。";

  // 環境管理
  const env = data.tempHumidLog
    ? "作業環境は温度22℃（±2℃）、湿度55%（±5%）を維持し、湿度60%超過を禁止する。60分間隔で温湿度ログを採取し、完了時に経時グラフとして提出する。"
    : "原本保存に適した清浄な温湿度環境（常温・常湿）を維持し、急激な温湿度変化による原本劣化を防止する。";

  // 検査レベル
  let inspection = "";
  if (data.inspectionLevel.includes("二重")) {
    inspection = "全数検査に加え、有資格者による再検（二重全数検査）を実施し、検査記録（QAシート）を作成する。";
  } else if (data.inspectionLevel.includes("全数")) {
    inspection = "全数検査を実施し、検査記録を作成する。";
  } else {
    inspection = "統計的抜取検査（AQL準拠）を実施する。";
  }

  return [
    {
      title: "第1章 総則",
      p: [
        `件名: ${data.subject}`,
        `本仕様書は、上記業務に関する技術条件、品質基準、および納品要件を定めるものである。`,
        specBase,
        `対象資料の総数量は概ね${totalVol.toLocaleString()}点であり、内訳は「${services}」とする。`,
        "受託者は、原資料の文化的・証拠的価値を尊重し、物理的保全を最優先事項として業務を遂行しなければならない。",
      ],
    },
    {
      title: "第2章 管理体制・セキュリティ",
      p: [
        "受託者は、JIS Q 27001 (ISMS) 認証を取得した管理体制の下で本業務を遂行する。",
        "原本および作成データは、入退室管理、施錠保管、アクセス権限管理、操作ログ取得等の措置により、漏えい・滅失・毀損を防止する。",
        `作業場所は「${data.workLocation}」とする。原則として再委託は行わず、やむを得ず行う場合は発注者の書面による事前承諾を得るものとする。`,
      ],
    },
    {
      title: "第3章 受領・搬送・前処理",
      p: [
        `資料の搬送は「${data.shippingType}」により実施する。搬送時は施錠可能なケース等を使用し、追跡可能な状態で管理する。`,
        `受領時は${data.strictCheckIn ? "厳格なリスト突合を行い、受領書を発行する" : "数量を確認し、受領記録を作成する"}。顧客リスト提供は「${data.checkInListProvided ? "有" : "無"}」。`,
        `前処理として、${data.fumigation ? "燻蒸処理（密閉環境での殺虫・殺菌）を実施する。" : "必要に応じてクリーニングを実施する。"}${data.interleaving ? "また、撮影/スキャン時には合紙を挿入し、裏写りを防止する。" : ""}`,
        `解体処理: ${data.unbinding}。復元処置: ${data.rebind ? "実施（原状回復）" : "なし"}。`,
      ],
    },
    {
      title: "第4章 デジタル化仕様",
      p: [
        "各作業項目の指定解像度、色空間、ファイル形式に基づき、真正性を確保したデータを作成する。",
        "画像補正は、原本の情報を損なわない範囲で実施する。",
        `・傾き補正: ${data.deskew ? "実施（文字・罫線を正置）" : "なし（原本通り）"}`,
        `・トリミング: ${data.trimming}`,
        `・反射抑制: ${data.reflectionSuppression ? "実施（偏光フィルター等使用）" : "不要"}`,
        data.binaryConversion ? `・2値化: 実施（閾値: ${data.binaryThreshold}）` : "",
        `OCR処理は「${data.ocr ? "実施" : "不要"}」とし、${data.ocrProofread ? "専門スタッフによる校正を行う。" : "機械処理結果をそのまま付与する（校正なし）。"}`,
      ].filter(Boolean),
    },
    {
      title: "第5章 メタデータ・整理",
      p: [
        `ファイル命名規則: ${data.namingRule}`,
        `フォルダ構造: ${data.folderStructure}`,
        `索引データ作成: ${data.indexType}（改行コード: ${data.lineFeed}）`,
      ],
    },
    {
      title: "第6章 品質保証・検査",
      p: [
        `検査仕様: ${data.inspectionLevel}。`,
        inspection,
        "検査項目は、画像の欠落、重複、順序誤り、ファイル破損、ピンボケ、露出不良、異物混入、およびメタデータの整合性を含む。",
        "不適合が発見された場合は、速やかに是正措置（再撮影、再処理）を行い、再検査を実施する。",
      ],
    },
    {
      title: "第7章 納品・保管",
      p: [
        `納品媒体: ${data.deliveryMedia.join("、")} (${data.mediaCount}セット)。${data.labelPrint ? "管理情報を印字したラベルを貼付する。" : ""}`,
        `納品後のデータは、${data.longTermStorageMonths}ヶ月間、受託者の堅牢なストレージにてバックアップ保管を行う。`,
        `保管期間終了後は、${data.dataDeletionProof ? "データ消去ソフト等を用いて復元不可能な状態で消去し、消去証明書を発行する。" : "安全な方法でデータを消去する。"}`,
        `原本および媒体の廃棄: ${data.disposal}。`,
      ],
    },
  ];
}