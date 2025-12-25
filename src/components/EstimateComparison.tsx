// src/components/EstimateComparison.tsx
import React, { useState } from "react";

export default function EstimateComparison() {
  const [activeTab, setActiveTab] = useState("standard");

  const tabs = [
    { id: "economy", label: "エコノミー", color: "#4CAF50" },
    { id: "standard", label: "スタンダード", color: "#2196F3" },
    { id: "premium", label: "プレミアム", color: "#E91E63" },
    { id: "current", label: "現在の前提", color: "#CCC", disabled: true },
  ] as const;

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh", padding: "40px" }}>
      <div
        style={{
          position: "fixed",
          top: 10,
          right: 20,
          background: "#ffeb3b",
          color: "#000",
          padding: "6px 10px",
          borderRadius: "8px",
          fontWeight: 800,
          fontSize: "0.85rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          zIndex: 50,
        }}
      >
        内部資料（社外提出禁止）
      </div>

      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: "10px",
            padding: "10px 18px",
            borderRadius: "14px",
            background: "#ffffff",
            boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#3f51b5",
              display: "inline-block",
            }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: "1.9rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#232323",
            }}
          >
            見積比較表（3プラン）
          </h1>
          <span
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "#3f51b5",
              padding: "2px 10px",
              borderRadius: 999,
              background: "rgba(63,81,181,0.12)",
              border: "1px solid rgba(63,81,181,0.25)",
            }}
          >
            内部分析用
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          marginBottom: "26px",
          flexWrap: "wrap",
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = Boolean((tab as any).disabled);

          return (
            <button
              key={tab.id}
              type="button"
              disabled={isDisabled}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: isDisabled ? "#e0e0e0" : tab.color,
                color: isDisabled ? "#6b6b6b" : "#fff",
                border: "none",
                borderRadius: "999px",
                padding: "10px 18px",
                fontSize: "0.95rem",
                fontWeight: isActive ? 900 : 700,
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isActive ? 1 : isDisabled ? 1 : 0.85,
                transform: isActive ? "translateY(-1px) scale(1.03)" : "none",
                boxShadow: isActive
                  ? "0 10px 18px rgba(0,0,0,0.16)"
                  : "0 6px 12px rgba(0,0,0,0.10)",
                transition: "all 0.16s ease-in-out",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "22px",
          padding: "0 24px",
        }}
      >
        {(["economy", "standard", "premium"] as const).map((plan) => {
          const accent =
            plan === "economy"
              ? "#4CAF50"
              : plan === "standard"
              ? "#2196F3"
              : "#E91E63";

          const title =
            plan === "economy"
              ? "エコノミー"
              : plan === "standard"
              ? "スタンダード"
              : "プレミアム";

          const desc =
            plan === "economy"
              ? "価格優先。工程の深追いはせず、抜取検査を基本とする。"
              : plan === "standard"
              ? "品質とコストのバランス。NDL準拠の標準運用を実務レベルで回す。"
              : "品質責任を強く負う前提。全数検査・二重検証を組み込む。";

          const price =
            plan === "economy"
              ? "¥480,000"
              : plan === "standard"
              ? "¥650,000"
              : "¥880,000";

          const isActive = activeTab === plan;

          return (
            <div
              key={plan}
              style={{
                background: "white",
                borderRadius: "16px",
                boxShadow: isActive
                  ? "0 14px 28px rgba(0,0,0,0.16)"
                  : "0 10px 20px rgba(0,0,0,0.10)",
                padding: "18px 18px 16px",
                borderTop: `10px solid ${accent}`,
                transform: isActive ? "translateY(-3px)" : "none",
                transition: "all 0.18s ease-in-out",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: 12, height: 12, borderRadius: 999, background: accent }} />
                <h2 style={{ margin: 0, color: accent, fontWeight: 900 }}>{title}</h2>
                {isActive && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.8rem",
                      fontWeight: 900,
                      color: "#111",
                      background: "rgba(0,0,0,0.08)",
                      padding: "3px 10px",
                      borderRadius: 999,
                    }}
                  >
                    表示中
                  </span>
                )}
              </div>

              <p style={{ marginTop: 10, lineHeight: 1.75, color: "#333", fontSize: "0.98rem" }}>
                {desc}
              </p>

              <div
                style={{
                  marginTop: 12,
                  padding: "12px 12px",
                  borderRadius: "12px",
                  background: "linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0.02))",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontWeight: 800, color: "#222" }}>概算費用</div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 950, color: "#111" }}>{price}</div>
                </div>
                <div style={{ marginTop: 6, fontSize: "0.86rem", color: "#555" }}>
                  ※比較用の表示例です（実データに置換してください）。
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
