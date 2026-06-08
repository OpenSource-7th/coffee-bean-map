"use client";

import { useEffect, useState, useMemo } from "react";
import KakaoMap from "@/components/KakaoMap";
import AuthModal from "@/components/AuthModal";
import ReviewForm from "@/components/ReviewForm";
import CafeDetailModal from "@/components/CafeDetailModal";
import MyReviewsPanel from "@/components/MyReviewsPanel";
import OnboardingModal from "@/components/OnboardingModal";
import CoffeeTasteTestModal from "@/components/CoffeeTasteTestModal";
import { useCafes } from "@/hooks/useCafes";
import { useAuth } from "@/hooks/useAuth";
import { useFilter } from "@/hooks/useFilter";
import { useCafeMenus } from "@/hooks/useCafeMenus";
import { useSubmitReview } from "@/hooks/useSubmitReview";
import { usePreferredMenus } from "@/hooks/usePreferredMenus";
import { useAllCafeMenuScores } from "@/hooks/useAllCafeMenuScores";
import { useRecommendations } from "@/hooks/useRecommendations";
import { Cafe } from "@/lib/types";
import {
  loadCoffeeTasteTestResult,
  type CoffeeTasteTestResult,
} from "@/lib/coffeeTasteTest";

const PERSONALIZED_FILTER = "사용자 맞춤 추천";

export default function Home() {
  const [center, setCenter] = useState({ lat: 37.5665, lng: 126.9780 });
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTasteTestOpen, setIsTasteTestOpen] = useState(false);
  const [tasteTestResult, setTasteTestResult] = useState<CoffeeTasteTestResult | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"list" | "myreviews">("list");

  const { cafes, isLoading: cafesLoading } = useCafes({ center, radiusMeters: 1000 });
  const { session, isLoading: authLoading, signOut } = useAuth();
  const { selectedFilters, toggleFilter, clearFilters } = useFilter();
  const { pendingReviews, retryPending, dismissPending } = useSubmitReview();
  const { hasInitialized, save } = usePreferredMenus();

  useEffect(() => {
    setTasteTestResult(loadCoffeeTasteTestResult());
  }, []);

  const cafeIds = useMemo(() => cafes.map(c => c.id), [cafes]);
  const { cafeMenuMap, cafeMenuItemsMap } = useCafeMenus(cafeIds);
  const { menuScores } = useAllCafeMenuScores(cafeIds);
  const selectedStandardFilters = useMemo(
    () => selectedFilters.filter(filter => filter !== PERSONALIZED_FILTER),
    [selectedFilters]
  );
  const isPersonalizedFilterActive = selectedFilters.includes(PERSONALIZED_FILTER);
  const { recommendations: personalizedRecommendations } = useRecommendations({
    userId: session?.user.id ?? null,
    limit: 50,
    enabled: isPersonalizedFilterActive,
    userVector: tasteTestResult?.vector ?? null,
    weights: tasteTestResult?.weights ?? null,
  });

  const availableMenuFilters = useMemo(() => {
    const all = new Set<string>();
    cafeMenuMap.forEach(menus => menus.forEach(m => all.add(m)));
    return [...Array.from(all).sort(), PERSONALIZED_FILTER];
  }, [cafeMenuMap]);

  const menuScoreByMenuId = useMemo(
    () => new Map(menuScores.map(score => [score.menu_id, score])),
    [menuScores]
  );

  const personalizedRecommendationByMenuId = useMemo(
    () => new Map(personalizedRecommendations.map(rec => [rec.menu_id, rec])),
    [personalizedRecommendations]
  );

  const personalizedCafeIds = useMemo(
    () => new Set(personalizedRecommendations.map(rec => rec.cafe_id)),
    [personalizedRecommendations]
  );

  const bayesianRecommendedMenuIds = useMemo(() => {
    if (selectedStandardFilters.length === 0) return new Set<string>();

    const ids = new Set<string>();
    cafeMenuItemsMap.forEach((menus) => {
      menus.forEach((menu) => {
        if (selectedStandardFilters.includes(menu.menu_name)) ids.add(menu.id);
      });
    });
    return ids;
  }, [cafeMenuItemsMap, selectedStandardFilters]);

  const bayesianCafeScoreMap = useMemo(() => {
    const map = new Map<string, number>();
    if (selectedStandardFilters.length === 0) return map;

    cafes.forEach((cafe) => {
      const matchingMenus = (cafeMenuItemsMap.get(cafe.id) ?? []).filter(menu =>
        selectedStandardFilters.includes(menu.menu_name)
      );
      if (matchingMenus.length === 0) return;

      const bestScore = Math.max(
        ...matchingMenus.map(menu => menuScoreByMenuId.get(menu.id)?.bayesian_score ?? 0.01)
      );
      map.set(cafe.id, bestScore);
    });

    return map;
  }, [cafes, cafeMenuItemsMap, menuScoreByMenuId, selectedStandardFilters]);

  const bayesianCafeIds = useMemo(
    () => new Set(bayesianCafeScoreMap.keys()),
    [bayesianCafeScoreMap]
  );

  const filteredCafes = useMemo(() => {
    if (selectedFilters.length === 0) return cafes;

    return cafes.filter(cafe => {
      const menus = cafeMenuMap.get(cafe.id) ?? [];
      const matchesBayesian = selectedStandardFilters.some(filter => menus.some(m => m === filter));
      const matchesPersonalized = isPersonalizedFilterActive && personalizedCafeIds.has(cafe.id);
      return matchesBayesian || matchesPersonalized;
    });
  }, [cafes, selectedFilters.length, cafeMenuMap, selectedStandardFilters, isPersonalizedFilterActive, personalizedCafeIds]);

  // 일반 메뉴 태그는 Bayesian 점수, 사용자 맞춤 태그는 취향 벡터 추천 점수로 정렬
  const rankedCafes = useMemo(() => {
    if (selectedFilters.length === 0) return filteredCafes;

    const personalizedScoreByCafeId = new Map<string, number>();
    personalizedRecommendations.forEach((rec) => {
      personalizedScoreByCafeId.set(
        rec.cafe_id,
        Math.max(personalizedScoreByCafeId.get(rec.cafe_id) ?? 0, rec.final_score)
      );
    });

    return [...filteredCafes].sort(
      (a, b) => {
        const aTypeRank =
          (bayesianCafeIds.has(a.id) && personalizedCafeIds.has(a.id)) ? 3 :
            personalizedCafeIds.has(a.id) ? 2 :
              bayesianCafeIds.has(a.id) ? 1 : 0;
        const bTypeRank =
          (bayesianCafeIds.has(b.id) && personalizedCafeIds.has(b.id)) ? 3 :
            personalizedCafeIds.has(b.id) ? 2 :
              bayesianCafeIds.has(b.id) ? 1 : 0;

        if (aTypeRank !== bTypeRank) return bTypeRank - aTypeRank;

        const aScore = isPersonalizedFilterActive
          ? personalizedScoreByCafeId.get(a.id) ?? bayesianCafeScoreMap.get(a.id) ?? 0
          : bayesianCafeScoreMap.get(a.id) ?? 0;
        const bScore = isPersonalizedFilterActive
          ? personalizedScoreByCafeId.get(b.id) ?? bayesianCafeScoreMap.get(b.id) ?? 0
          : bayesianCafeScoreMap.get(b.id) ?? 0;

        return bScore - aScore;
      }
    );
  }, [
    filteredCafes,
    selectedFilters.length,
    personalizedRecommendations,
    bayesianCafeIds,
    personalizedCafeIds,
    isPersonalizedFilterActive,
    bayesianCafeScoreMap,
  ]);

  const recommendationTypes = useMemo(() => {
    const map = new Map<string, "bayesian" | "personalized" | "both">();
    bayesianCafeIds.forEach(id => map.set(id, "bayesian"));
    if (isPersonalizedFilterActive) {
      personalizedCafeIds.forEach(id => {
        map.set(id, map.has(id) ? "both" : "personalized");
      });
    }
    return map;
  }, [bayesianCafeIds, personalizedCafeIds, isPersonalizedFilterActive]);

  const menuRecommendationTypes = useMemo(() => {
    const map = new Map<string, "bayesian" | "personalized" | "both">();
    bayesianRecommendedMenuIds.forEach(id => map.set(id, "bayesian"));
    if (isPersonalizedFilterActive) {
      personalizedRecommendationByMenuId.forEach((_rec, id) => {
        map.set(id, map.has(id) ? "both" : "personalized");
      });
    }
    return map;
  }, [bayesianRecommendedMenuIds, personalizedRecommendationByMenuId, isPersonalizedFilterActive]);

  function cardRecommendationClasses(cafeId: string): string {
    const type = recommendationTypes.get(cafeId);
    if (type === "both") return "border-purple-400/60 ring-1 ring-purple-300/50";
    if (type === "personalized") return "border-blue-400/60 ring-1 ring-blue-300/40";
    if (type === "bayesian") return "border-[#ac3509]/40 ring-1 ring-[#ac3509]/20";
    return "border-stone-200/60 hover:border-stone-300";
  }

  function recommendationIconClasses(cafeId: string): string {
    const type = recommendationTypes.get(cafeId);
    if (type === "both") return "text-purple-600";
    if (type === "personalized") return "text-blue-600";
    return "text-[#ac3509]";
  }

  function handleOpenReview() {
    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsReviewFormOpen(true);
  }

  function handleTasteTestComplete(result: CoffeeTasteTestResult) {
    setTasteTestResult(result);
    setIsSettingsOpen(false);
    if (!selectedFilters.includes(PERSONALIZED_FILTER)) {
      toggleFilter(PERSONALIZED_FILTER);
    }
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
          {/* 설정 메뉴 */}
          <div className="relative">
            <button
              onClick={() => setIsSettingsOpen((open) => !open)}
              className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-500 text-[12px] hover:bg-stone-50 transition-colors"
              title="설정"
            >
              <span className="material-symbols-outlined text-[16px] align-middle">tune</span>
            </button>
            {isSettingsOpen && (
              <div className="absolute right-0 top-10 w-64 rounded-2xl border border-stone-200 bg-white shadow-xl p-4 z-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-bold text-stone-800">커피 취향 테스트</p>
                    <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                      답변을 바탕으로 사용자 맞춤 추천 기준을 조정합니다.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsTasteTestOpen(true);
                      setIsSettingsOpen(false);
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[12px] font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {tasteTestResult ? "재검사" : "검사"}
                  </button>
                </div>

                {tasteTestResult && (
                  <p className="text-[11px] text-stone-400 mt-3">
                    최근 검사: {new Date(tasteTestResult.completedAt).toLocaleDateString("ko-KR")}
                  </p>
                )}

                {hasInitialized && (
                  <button
                    onClick={() => {
                      save([]);
                      setIsSettingsOpen(false);
                    }}
                    className="mt-3 w-full px-3 py-2 rounded-lg border border-stone-200 text-stone-500 text-[12px] font-semibold hover:bg-stone-50 transition-colors"
                  >
                    선호 메뉴 초기화
                  </button>
                )}
              </div>
            )}
          </div>
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
                const isPersonalized = filter === PERSONALIZED_FILTER;
                return (
                  <button
                    key={filter}
                    onClick={() => toggleFilter(filter)}
                    className={`px-3 py-1 rounded-full text-[12px] font-semibold border transition-colors ${
                      active && isPersonalized
                        ? "bg-blue-600 text-white border-blue-600"
                        : active
                          ? "bg-[#ac3509] text-white border-[#ac3509]"
                          : isPersonalized
                            ? "bg-white text-blue-600 border-blue-200 hover:border-blue-400"
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
                      이 지역에는 아직 추천 조건에 맞는 곳이 없네요.
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
                      cardRecommendationClasses(cafe.id)
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-[15px] text-stone-800">{cafe.name}</p>
                      {recommendationTypes.has(cafe.id) && (
                        <span
                          className={`material-symbols-outlined text-[15px] ${recommendationIconClasses(cafe.id)}`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                          title="추천 카페"
                        >
                          {recommendationTypes.get(cafe.id) === "both" ? "auto_awesome" : "recommend"}
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
            recommendationTypes={recommendationTypes}
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
          menuRecommendationTypes={menuRecommendationTypes}
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

      {isTasteTestOpen && (
        <CoffeeTasteTestModal
          userId={session?.user.id ?? null}
          onClose={() => setIsTasteTestOpen(false)}
          onComplete={handleTasteTestComplete}
        />
      )}
    </div>
  );
}
