"use client";

import { useMyReviews } from "@/hooks/useMyReviews";

interface Props {
  userId: string | null;
}

const sentimentLabel: Record<string, { label: string; cls: string }> = {
  positive: { label: "긍정", cls: "bg-green-50 text-green-700" },
  neutral:  { label: "중립", cls: "bg-stone-100 text-stone-500" },
  negative: { label: "부정", cls: "bg-red-50 text-red-600" },
};

export default function MyReviewsPanel({ userId }: Props) {
  const { reviews, isLoading } = useMyReviews(userId);

  return (
    <div>
      {isLoading && (
        <p className="text-[14px] text-stone-400 px-1 py-4">불러오는 중...</p>
      )}
      {!isLoading && reviews.length === 0 && (
        <p className="text-[14px] text-stone-400 px-1 py-4">
          아직 작성한 리뷰가 없어요.
        </p>
      )}
      {reviews.map((review) => {
        const badge = review.sentiment ? sentimentLabel[review.sentiment] : null;
        return (
          <div
            key={review.id}
            className="bg-white p-4 rounded-xl border border-stone-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-2"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-[15px] text-stone-800">{review.cafe_name}</p>
              {badge && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-[13px] text-stone-600 mt-1 leading-relaxed">{review.review_text}</p>
            <p className="text-[11px] text-stone-400 mt-2">
              {new Date(review.created_at).toLocaleDateString("ko-KR")}
            </p>
          </div>
        );
      })}
    </div>
  );
}
