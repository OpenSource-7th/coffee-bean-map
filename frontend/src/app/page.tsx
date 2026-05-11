"use client";

import { useState } from "react";
import KakaoMap from "@/components/KakaoMap";
import { useCafes } from "@/hooks/useCafes";
import { Cafe } from "@/lib/types";

export default function Home() {
  const [center, setCenter] = useState({ lat: 37.3219, lng: 127.1269 });
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);

  const { cafes, isLoading: loading } = useCafes({ center, radiusMeters: 1000 });

  return (
    <main style={{ display: "flex", height: "100vh", width: "100vw" }}>
      <aside style={{ width: "280px", overflowY: "auto", padding: "16px", borderRight: "1px solid #eee" }}>
        <h2 style={{ marginBottom: "16px" }}>내 주변 카페</h2>
        {loading && <p>불러오는 중...</p>}
        {cafes.map((cafe) => (
          <div
            key={cafe.id}
            onClick={() => setSelectedCafe(cafe)}
            style={{
              padding: "12px",
              marginBottom: "8px",
              border: "1px solid #eee",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            <p style={{ fontWeight: "bold" }}>{cafe.name}</p>
            <p style={{ fontSize: "12px", color: "#888" }}>{cafe.address}</p>
            <div style={{ display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" }}>
              {cafe.menu_tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    background: "#f0f0f0",
                    borderRadius: "999px",
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <div style={{ flex: 1, position: "relative" }}>
        <KakaoMap
          cafes={cafes}
          onPinClick={setSelectedCafe}
          onCenterChanged={(lat, lng) => setCenter({ lat, lng })}
        />
      </div>

      {selectedCafe && (
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
          onClick={() => setSelectedCafe(null)}
        >
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
            <h3 style={{ marginBottom: "8px" }}>{selectedCafe.name}</h3>
            <p style={{ color: "#888", fontSize: "14px", marginBottom: "12px" }}>
              {selectedCafe.address}
            </p>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {selectedCafe.menu_tags.map((tag) => (
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
              onClick={() => setSelectedCafe(null)}
              style={{
                marginTop: "16px",
                width: "100%",
                padding: "10px",
                background: "#ac3509",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}