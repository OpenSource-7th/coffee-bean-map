"use client";

import { Cafe } from "@/lib/types";
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
      </div>
    </div>
  );
}