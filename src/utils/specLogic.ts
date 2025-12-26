import { Data, WorkItem } from "../types/pricing";
import { SERVICE_DEFINITIONS } from "../constants/coefficients";
import { toInt } from "./formatters";

export type SpecSection = { title: string; p: string[] };

export function buildSpecSections(data: Data): SpecSection[] {
  const totalVol = data.workItems.reduce((s, w) => s + toInt(w.qty), 0);
  
  // サービス内容の要約作成
  const services = data.workItems
    .map((w) => `${w.title}（${toInt(w.qty).toLocaleString()}${w.unit}）`)
    .join("、");

  // 環境管理の文言
  const env = data.tempHumidLog
    ? "作業環境は温度22℃（±2℃）、湿度55%（±5%）を維持し、湿度60%超過を禁止する。60分間隔ログを採取し、経時グラフを提出する。"
    : "原本保存に適した清浄な温湿度環境を維持し、原本の変質リスクを最小化する。";

  // 検査レベルの文言
  let inspection = "";
  if (data.inspectionLevel.includes("二重")) {
    inspection = "全数検査に加え、有資格者による再検（いわゆる二重全数検査）を実施する。";
  } else if (data.inspectionLevel.includes("全数")) {
    inspection = "全数検査を実施する。";
  } else {
    inspection = "抜取検査を実施する。";
  }

  return [
    {
      title: "第1章 総則",
      p: [
        `本仕様書は、「${data.subject}」に関するデジタル化及び関連業務（以下「本業務」という。）の条件を定める。`,
        `対象範囲は、${services}を含む。総数量は概ね${totalVol.toLocaleString()}単位である。`,
        "受託者は、原資料の物理的保全を最優先事項とし、情報落ち（欠落、判読不能、色再現の破綻等）を生じさせない品質で遂行する。",
      ],
    },
    {
      title: "第2章 情報セキュリティ・管理体制",
      p: [
        "JIS Q 27001 (ISMS) を満たす管理体制の下で本業務を遂行する。原本及びデータは、権限管理、入退室管理、施錠保管、媒体管理等により、漏えい・滅失・毀損を防止する。",
        `作業場所は「${data.workLocation}」とする。外部委託を行う場合は、発注者の事前承認を要する。`,
      ],
    },
    {
      title: "第3章 受領・搬送・照合（L2）",
      p: [
        `搬送は「${data.shippingType}」により実施し、施錠、追跡、引渡し記録を確保する。`,
        `厳格照合は「${data.strictCheckIn ? "実施" : "未実施"}」とする。顧客リスト提供は「${data.checkInListProvided ? "有" : "無"}」。`,
        `前処理（合紙）は「${data.interleaving ? "実施" : "不要"}」。解体は「${data.unbinding}」。復元（再製本）は「${data.rebind ? "実施" : "不要"}」。`,
      ],
    },
    {
      title: "第4章 撮影・スキャン仕様（L3）",
      p: [
        "各作業項目ごとに、解像度、色空間、読み取り範囲、ファイル形式を満たすデータを作成する。",
        "デジタル補間による擬似的な解像度向上は行わず、光学的精細度を確保する。",
        `反射抑制（無反射対策）は「${data.reflectionSuppression ? "実施" : "不要"}」。`,
      ],
    },
    {
      title: "第5章 画像処理・メタデータ（L4）",
      p: [
        `傾き補正は「${data.deskew ? "実施" : "不要"}」。トリミングは「${data.trimming}」。`,
        `2値化は「${data.binaryConversion ? `実施（閾値：${data.binaryThreshold}）` : "不要"}」。`,
        `OCRは「${data.ocr ? "実施" : "不要"}」。校正は「${data.ocrProofread ? "実施" : "なし"}」。`,
        `命名規則は「${data.namingRule}」。フォルダ構造は「${data.folderStructure}」。索引は「${data.indexType}」。改行は「${data.lineFeed}」。`,
      ],
    },
    {
      title: "第6章 検査・品質保証（L4）",
      p: [
        `検査深度は「${data.inspectionLevel}」。${inspection}`,
        "検査項目は、欠落・重複・順序・判読性・ピント・傾き・異物混入・ファイル破損・命名規則違反・索引整合等を含む。",
      ],
    },
    {
      title: "第7章 環境管理（L4）",
      p: [env, `燻蒸は「${data.fumigation ? "実施" : "不要"}」。中性紙袋等は「${data.neutralPaperBag}」。`],
    },
    {
      title: "第8章 納品・保管・消去（L5）",
      p: [
        `納品媒体は ${data.deliveryMedia.join("、")}、媒体セット数は${data.mediaCount}。ラベル印字は「${data.labelPrint ? "実施" : "不要"}」。`,
        `保管（月）は${data.longTermStorageMonths}。データ消去証明は「${data.dataDeletionProof ? "提出" : "不要"}」。`,
        `廃棄（原本/媒体）は「${data.disposal}」。`,
        `備考：${data.deliveryMemo || "—"}`,
      ],
    },
    {
      title: "第9章 積算・係数の原則（付則）",
      p: [
        "見積の基本構造は、Total = [(Base×Vol)×(C×Q×P×Interaction×K_load)] + Adders + Fixed に従う。",
        "係数積の上限は原則×2.2とし、例外として×2.5の適用は承認（決裁）を要する。",
        "交互作用（Interaction）は二重計上を避け、最大+10%を上限とする。",
      ],
    },
  ];
}