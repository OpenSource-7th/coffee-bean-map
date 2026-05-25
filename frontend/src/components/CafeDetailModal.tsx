"use client";

import { Cafe } from "@/lib/types";
<<<<<<< HEAD
import { useMenus } from "@/hooks/useMenus";
import { useBookmarks } from "@/hooks/useBookmarks";

interface Props {
  cafe: Cafe;
  session: any;
  onClose: () => void;
  onOpenReview: () => void;
}

export default function CafeDetailModal({ cafe, session, onClose, onOpenReview }: Props) {
  const { menus, isLoading: menusLoading } = useMenus(cafe.id);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  return (
    <div
      className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm border border-stone-200 shadow-2xl overflow-hidden"
        style={{ boxShadow: "0px 8px 40px rgba(62,39,35,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="font-serif text-[17px] font-bold text-stone-900">{cafe.name}</h3>
          <div className="flex items-center gap-2">
            {/* 북마크 버튼 */}
            <button
              onClick={() => toggleBookmark(cafe)}
              className="text-stone-400 hover:text-[#ac3509] transition-colors"
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={{
                  fontVariationSettings: isBookmarked(cafe.id) ? "'FILL' 1" : "'FILL' 0",
                  color: isBookmarked(cafe.id) ? "#ac3509" : undefined,
                }}
              >
                bookmark
              </span>
            </button>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* 주소 */}
        <div className="px-5 pt-4">
          <p className="text-[13px] text-stone-500">{cafe.address}</p>
        </div>

        {/* 메뉴 */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-[13px] font-semibold text-stone-700 mb-2">☕ 메뉴</p>
          {menusLoading && (
            <p className="text-[12px] text-stone-400">불러오는 중...</p>
          )}
          {!menusLoading && menus.length === 0 && (
            <p className="text-[12px] text-stone-400">등록된 메뉴가 없어요</p>
          )}
          {!menusLoading && menus.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {menus.map((menu) => (
                <span
                  key={menu.id}
                  className="text-[12px] px-3 py-1 bg-[#fdf8f6] border border-[#f0e6e0] text-[#ac3509] rounded-full font-medium"
                >
                  {menu.menu_name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 리뷰 작성 버튼 */}
        <div className="px-5 py-5">
          <button
            onClick={onOpenReview}
            className="w-full py-2.5 rounded-lg bg-[#ac3509] text-white text-[14px] font-semibold hover:bg-[#92300a] transition-colors shadow-sm"
          >
            {session ? "리뷰 작성" : "로그인하고 리뷰 작성"}
          </button>
        </div>
=======

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
>>>>>>> origin/develop
      </div>
    </div>
  );
}