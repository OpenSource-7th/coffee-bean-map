"use client";

import { Cafe } from "@/lib/types";

interface Props {
  cafe: Cafe;
  onClose: () => void;
}

export default function CafeDetailModal({ cafe, onClose }: Props) {
  return (
    // 배경 오버레이 — 클릭 시 닫힘
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
      onClick={onClose}
    >
      {/* 모달 본체 — 클릭 이벤트 버블링 차단 */}
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "24px",
          width: "360px",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: "8px" }}>{cafe.name}</h3>
        <p style={{ color: "#888", fontSize: "14px", marginBottom: "12px" }}>
          {cafe.address}
        </p>

        {/* 메뉴 태그 */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {(cafe.menu_tags ?? []).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "12px",
                padding: "4px 10px",
                background: "#f5f0ee",
                borderRadius: "999px",
              }}
            >
              #{tag}
            </span>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: "16px",
            width: "100%",
            padding: "10px",
            background: "#ac3509",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}