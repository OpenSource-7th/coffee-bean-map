"use client";

import { useState } from "react";
import KakaoMap from "@/components/KakaoMap";
import AuthModal from "@/components/AuthModal";
import ReviewForm from "@/components/ReviewForm";
import { useCafes } from "@/hooks/useCafes";
import { useAuth } from "@/hooks/useAuth";
import { Cafe } from "@/lib/types";


export default function Home() {
  const [center, setCenter] = useState({ lat: 37.3219, lng: 127.1269 });
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);

  const { cafes, isLoading: cafesLoading } = useCafes({ center, radiusMeters: 1000 });
  const { session, isLoading: authLoading, signOut } = useAuth();

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
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex flex-1 overflow-hidden">
        {/* 사이드바 */}
        <aside className="w-72 overflow-y-auto border-r border-stone-200 bg-[#fbf9f9] no-scrollbar">
          <div className="px-5 pt-5 pb-3">
            <h2 className="font-serif text-[18px] font-bold text-[#3e2723]">내 주변 카페</h2>
          </div>
          <div className="flex flex-col gap-2 px-4 pb-6">
            {cafesLoading && (
              <p className="text-[14px] text-stone-400 px-1 py-4">불러오는 중...</p>
            )}
            {cafes.map((cafe) => (
              <div
                key={cafe.id}
                onClick={() => setSelectedCafe(cafe)}
                className="bg-white p-4 rounded-xl border border-stone-200/60 hover:border-stone-300 transition-colors cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                <p className="font-bold text-[15px] text-stone-800">{cafe.name}</p>
                <p className="text-[12px] text-stone-500 mt-0.5">{cafe.address}</p>
              </div>
            ))}
          </div>
        </aside>

        {/* 지도 */}
        <div className="flex-1 relative">
          <KakaoMap
            cafes={cafes}
            onPinClick={setSelectedCafe}
            onCenterChanged={(lat, lng) => setCenter({ lat, lng })}
          />
        </div>
      </main>

      {/* 카페 상세 모달 (KAN-23) */}
      {selectedCafe && (
        <div
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCafe(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm border border-stone-200 shadow-2xl overflow-hidden"
            style={{ boxShadow: "0px 8px 40px rgba(62,39,35,0.18)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h3 className="font-serif text-[17px] font-bold text-stone-900">{selectedCafe.name}</h3>
              <button
                onClick={() => setSelectedCafe(null)}
                className="text-stone-400 hover:text-stone-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13px] text-stone-500">{selectedCafe.address}</p>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={handleOpenReview}
                className="w-full py-2.5 rounded-lg bg-[#ac3509] text-white text-[14px] font-semibold hover:bg-[#92300a] transition-colors shadow-sm"
              >
                {session ? "리뷰 작성" : "로그인하고 리뷰 작성"}
              </button>
            </div>
          </div>
        </div>
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
    </div>
  );
}
