"use client";

import { useState, useMemo } from "react";
import KakaoMap from "@/components/KakaoMap";
import AuthModal from "@/components/AuthModal";
import ReviewForm from "@/components/ReviewForm";
import CafeDetailModal from "@/components/CafeDetailModal";
import MyReviewsPanel from "@/components/MyReviewsPanel";
import OnboardingModal from "@/components/OnboardingModal";
import { useCafes } from "@/hooks/useCafes";
import { useAuth } from "@/hooks/useAuth";
import { useFilter } from "@/hooks/useFilter";
import { useCafeMenus } from "@/hooks/useCafeMenus";
import { useSubmitReview } from "@/hooks/useSubmitReview";
import { usePreferredMenus } from "@/hooks/usePreferredMenus";
import { useAllCafeMenuScores } from "@/hooks/useAllCafeMenuScores";
import { Cafe } from "@/lib/types";

export default function Home() {
  const [center, setCenter] = useState({ lat: 37.3219, lng: 127.1269 });
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"list" | "myreviews">("list");

  const { cafes, isLoading: cafesLoading } = useCafes({ center, radiusMeters: 1000 });
  const { session, isLoading: authLoading, signOut } = useAuth();
  const { selectedFilters, toggleFilter, clearFilters } = useFilter();
  const { pendingReviews, retryPending, dismissPending } = useSubmitReview();
  const { preferredMenus, hasInitialized, save } = usePreferredMenus();

  const cafeIds = useMemo(() => cafes.map(c => c.id), [cafes]);
  const { cafeMenuMap } = useCafeMenus(cafeIds);
  const { menuScores } = useAllCafeMenuScores(cafeIds);

  const availableMenuFilters = useMemo(() => {
    const all = new Set<string>();
    cafeMenuMap.forEach(menus => menus.forEach(m => all.add(m)));
    return Array.from(all).sort();
  }, [cafeMenuMap]);

  const filteredCafes = useMemo(() => {
    if (selectedFilters.length === 0) return cafes;
    return cafes.filter(cafe => {
      const menus = cafeMenuMap.get(cafe.id) ?? [];
      return selectedFilters.some(filter => menus.some(m => m === filter));
    });
  }, [cafes, selectedFilters, cafeMenuMap]);

  // 선호 메뉴 기반 추천 점수 계산 후 정렬
  const rankedCafes = useMemo(() => {
    if (preferredMenus.length === 0) return filteredCafes;

    const scoreMap: Record<string, number> = {};
    for (const cafe of filteredCafes) {
      const cafeMenuNames = cafeMenuMap.get(cafe.id) ?? [];
      const matchedMenuNames = cafeMenuNames.filter(name =>
        preferredMenus.includes(name)
      );
      if (matchedMenuNames.length === 0) {
        scoreMap[cafe.id] = 0;
        continue;
      }
      // 매칭된 메뉴명 → menu_id 역추적은 불가하므로
      // cafeMenuMap 기준으로 선호 메뉴가 있는 카페에 menu_scores의 최고 bayesian_score 부여
      const cafeScores = menuScores.filter(ms => ms.cafe_id === cafe.id);
      scoreMap[cafe.id] = cafeScores.length > 0
        ? Math.max(...cafeScores.map(ms => ms.bayesian_score ?? 0))
        : 0.01; // 메뉴는 있지만 scores 없는 경우 소폭 가산
    }

    return [...filteredCafes].sort(
      (a, b) => (scoreMap[b.id] ?? 0) - (scoreMap[a.id] ?? 0)
    );
  }, [filteredCafes, preferredMenus, cafeMenuMap, menuScores]);

  // 추천 카페 ID 집합 (지도 강조용)
  const recommendedCafeIds = useMemo(() => {
    if (preferredMenus.length === 0) return new Set<string>();
    return new Set(
      filteredCafes
        .filter(cafe => {
          const cafeMenuNames = cafeMenuMap.get(cafe.id) ?? [];
          return preferredMenus.some(p => cafeMenuNames.includes(p));
        })
        .map(cafe => cafe.id)
    );
  }, [filteredCafes, preferredMenus, cafeMenuMap]);

  function handleOpenReview() {
    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsReviewFormOpen(true);
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 h-14 border-b border-stone-200 bg-white shrink-0 z-30">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[#ac3509] text-[22px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            local_cafe
          </span>
          <span className="font-serif text-[17px] font-bold text-[#271310]">원두지도</span>
        </div>

        <div className="flex items-center gap-3">
          {!authLoading && (
            session ? (
              <>
                <span className="text-[13px] text-stone-500 hidden sm:block">
                  {session.user.email}
                </span>
                <button
                  onClick={signOut}
                  className="px-4 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-[13px] font-semibold hover:bg-stone-50 transition-colors"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#ac3509] text-white text-[13px] font-semibold hover:bg-[#92300a] transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">person</span>
                로그인
              </button>
            )
          )}
          {/* 선호 메뉴 재설정 버튼 */}
          {hasInitialized && (
            <button
              onClick={() => save([])}
              className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-500 text-[12px] hover:bg-stone-50 transition-colors"
              title="선호 메뉴 재설정"
            >
              <span className="material-symbols-outlined text-[16px] align-middle">tune</span>
            </button>
          )}
        </div>
      </header>

      {/* 오프라인 대기 리뷰 배너 */}
      {pendingReviews.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between shrink-0 z-20">
          <p className="text-[12px] text-amber-800">
            <span className="font-semibold">임시 저장된 리뷰 {pendingReviews.length}건</span>이 있습니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => pendingReviews.forEach(r => retryPending(r.id))}
              className="text-[12px] font-semibold text-amber-700 hover:text-amber-900 underline"
            >
              전체 재시도
            </button>
            <button
              onClick={() => pendingReviews.forEach(r => dismissPending(r.id))}
              className="text-[12px] text-amber-500 hover:text-amber-700"
            >
              전체 삭제
            </button>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="flex flex-1 overflow-hidden">
        {/* 사이드바 */}
        <aside className="w-72 flex flex-col border-r border-stone-200 bg-[#fbf9f9] overflow-hidden">
          {/* 필터 칩 */}
          <div className="px-4 pt-4 pb-2 shrink-0">
            <div className="flex gap-1.5 flex-wrap">
              {availableMenuFilters.map(filter => {
                const active = selectedFilters.includes(filter);
                return (
                  <button
                    key={filter}
                    onClick={() => toggleFilter(filter)}
                    className={`px-3 py-1 rounded-full text-[12px] font-semibold border transition-colors ${
                      active
                        ? "bg-[#ac3509] text-white border-[#ac3509]"
                        : "bg-white text-stone-600 border-stone-300 hover:border-stone-400"
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
              {selectedFilters.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 rounded-full text-[12px] font-semibold border border-stone-200 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  초기화
                </button>
              )}
            </div>
          </div>

          {/* 탭 */}
          <div className="px-5 pt-2 pb-3 shrink-0">
            <div className="flex gap-2">
              <button
                onClick={() => setSidebarTab("list")}
                className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                  sidebarTab === "list"
                    ? "bg-[#271310] text-white"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                주변 카페
              </button>
              <button
                onClick={() => setSidebarTab("myreviews")}
                className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                  sidebarTab === "myreviews"
                    ? "bg-[#271310] text-white"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                내 리뷰
              </button>
            </div>
          </div>

          {/* 카페 목록 / 내 리뷰 */}
          <div className="flex flex-col gap-2 px-4 pb-6 overflow-y-auto no-scrollbar flex-1">
            {sidebarTab === "list" ? (
              <>
                {cafesLoading && (
                  <p className="text-[14px] text-stone-400 px-1 py-4">불러오는 중...</p>
                )}
                {!cafesLoading && rankedCafes.length === 0 && (
                  <div className="px-1 py-8 text-center">
                    <span
                      className="material-symbols-outlined text-[36px] text-stone-300 block mb-2"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      search_off
                    </span>
                    <p className="text-[13px] text-stone-500 leading-relaxed">
                      이 지역에는 아직 해당 메뉴를 잘하는 곳이 없네요.
                      <br />필터를 초기화해 볼까요?
                    </p>
                    {selectedFilters.length > 0 && (
                      <button
                        onClick={clearFilters}
                        className="mt-3 px-4 py-1.5 rounded-lg border border-stone-300 text-[12px] text-stone-600 hover:bg-stone-100 transition-colors"
                      >
                        필터 초기화
                      </button>
                    )}
                  </div>
                )}
                {rankedCafes.map((cafe) => (
                  <div
                    key={cafe.id}
                    onClick={() => setSelectedCafe(cafe)}
                    className={`bg-white p-4 rounded-xl border transition-colors cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
                      recommendedCafeIds.has(cafe.id)
                        ? "border-[#ac3509]/40 ring-1 ring-[#ac3509]/20"
                        : "border-stone-200/60 hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-[15px] text-stone-800">{cafe.name}</p>
                      {recommendedCafeIds.has(cafe.id) && (
                        <span
                          className="material-symbols-outlined text-[#ac3509] text-[15px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                          title="선호 메뉴 보유"
                        >
                          recommend
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-stone-500 mt-0.5">{cafe.address}</p>
                  </div>
                ))}
              </>
            ) : (
              <MyReviewsPanel userId={session?.user.id ?? null} />
            )}
          </div>
        </aside>

        {/* 지도 */}
        <div className="flex-1 relative">
          <KakaoMap
            cafes={filteredCafes}
            onPinClick={setSelectedCafe}
            onCenterChanged={(lat, lng) => setCenter({ lat, lng })}
            recommendedCafeIds={recommendedCafeIds}
          />
        </div>
      </main>

      {/* 카페 상세 모달 */}
      {selectedCafe && !isReviewFormOpen && (
        <CafeDetailModal
          cafe={selectedCafe}
          session={session}
          onClose={() => setSelectedCafe(null)}
          onOpenReview={handleOpenReview}
        />
      )}

      {/* 리뷰 폼 */}
      {isReviewFormOpen && selectedCafe && session && (
        <ReviewForm
          cafe={selectedCafe}
          userId={session.user.id}
          onClose={() => {
            setIsReviewFormOpen(false);
            setSelectedCafe(null);
          }}
        />
      )}

      {/* 인증 모달 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* 온보딩 모달 — localStorage 미설정 시 표시 */}
      {hasInitialized === false && (
        <OnboardingModal onComplete={save} />
      )}
    </div>
  );
}
