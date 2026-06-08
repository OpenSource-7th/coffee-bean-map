"use client";

import { Session } from "@supabase/supabase-js";
import { Cafe } from "@/lib/types";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useMenus } from "@/hooks/useMenus";
import { useMenuScores } from "@/hooks/useMenuScores";

interface Props {
  cafe: Cafe;
  session: Session | null;
  onClose: () => void;
  onOpenReview: () => void;
  menuRecommendationTypes?: Map<string, "bayesian" | "personalized" | "both">;
}

export default function CafeDetailModal({ cafe, session, onClose, onOpenReview, menuRecommendationTypes }: Props) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { menus, isLoading: menusLoading } = useMenus(cafe.id);
  const { menuScores } = useMenuScores(cafe.id);

  const scoreByMenuId = new Map(menuScores.map(s => [s.menu_id, s]));
  const bookmarked = isBookmarked(cafe.id);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-[360px] max-h-[80vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더: 카페명 + 북마크 버튼 */}
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold text-[18px] text-stone-900 leading-snug flex-1 mr-2">
            {cafe.name}
          </h3>
          <button
            onClick={() => toggleBookmark(cafe)}
            className="shrink-0 mt-0.5"
            title={bookmarked ? "북마크 해제" : "북마크 추가"}
          >
            <span
              className="material-symbols-outlined text-[26px] transition-colors"
              style={{
                fontVariationSettings: bookmarked ? "'FILL' 1" : "'FILL' 0",
                color: bookmarked ? "#ac3509" : "#a8a29e",
              }}
            >
              bookmark
            </span>
          </button>
        </div>
        <p className="text-[13px] text-stone-400 mb-5">{cafe.address}</p>

        {/* 메뉴 목록 */}
        <div className="mb-5">
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-2">
            메뉴
          </p>
          {menusLoading ? (
            <p className="text-[13px] text-stone-400 py-2">불러오는 중...</p>
          ) : menus.length === 0 ? (
            <p className="text-[13px] text-stone-400 py-2">등록된 메뉴가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {menus.map((menu) => {
                const score = scoreByMenuId.get(menu.id);
                const recommendationType = menuRecommendationTypes?.get(menu.id);
                const isSignature = score?.is_signature ?? false;
                const bayesian = score?.bayesian_score;
                const isBoth = recommendationType === "both";
                const isPersonalized = recommendationType === "personalized";
                const isBayesian = recommendationType === "bayesian";

                return (
                  <li
                    key={menu.id}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                      isBoth
                        ? "bg-purple-50 border border-purple-200"
                        : isPersonalized
                          ? "bg-blue-50 border border-blue-200"
                          : isBayesian || isSignature
                            ? "bg-amber-50 border border-amber-200"
                            : "bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {(isBoth || isPersonalized || isBayesian || isSignature) && (
                        <span
                          className={`material-symbols-outlined text-[16px] ${
                            isBoth ? "text-purple-500" : isPersonalized ? "text-blue-500" : "text-amber-500"
                          }`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                          title={isBoth ? "통합 추천 메뉴" : isPersonalized ? "사용자 맞춤 추천 메뉴" : "Bayesian 추천 메뉴"}
                        >
                          {isBoth ? "auto_awesome" : isPersonalized ? "favorite" : "workspace_premium"}
                        </span>
                      )}
                      <span className="text-[14px] text-stone-800 font-medium">
                        {menu.menu_name}
                      </span>
                    </div>
                    {isBoth && (
                      <span className="text-[11px] text-purple-700 font-semibold whitespace-nowrap">
                        {bayesian != null && `${(bayesian * 100).toFixed(0)}점 · `}당신에게 알맞는 커피!
                      </span>
                    )}
                    {isPersonalized && (
                      <span className="text-[11px] text-blue-700 font-semibold whitespace-nowrap">
                        다른 사용자분들이 좋아해요
                      </span>
                    )}
                    {!isBoth && !isPersonalized && bayesian != null && (
                      <span className={`text-[11px] font-mono tabular-nums ${
                        isBayesian || isSignature ? "text-amber-700" : "text-stone-400"
                      }`}>
                        {(bayesian * 100).toFixed(0)}점
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={onOpenReview}
            className="flex-1 py-2.5 bg-[#ac3509] text-white rounded-xl text-[13px] font-semibold hover:bg-[#92300a] transition-colors"
          >
            {session ? "리뷰 작성" : "로그인 후 리뷰 작성"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-stone-100 text-stone-700 rounded-xl text-[13px] font-semibold hover:bg-stone-200 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
