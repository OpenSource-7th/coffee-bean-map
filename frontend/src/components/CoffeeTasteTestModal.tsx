"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  COFFEE_TASTE_QUESTIONS,
  buildCoffeeTasteTestResult,
  saveCoffeeTasteTestResult,
  type CoffeeTasteAnswers,
  type CoffeeTasteTestResult,
} from "@/lib/coffeeTasteTest";

interface Props {
  userId: string | null;
  onClose: () => void;
  onComplete: (result: CoffeeTasteTestResult) => void;
}

export default function CoffeeTasteTestModal({ userId, onClose, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<CoffeeTasteAnswers>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentQuestion = COFFEE_TASTE_QUESTIONS[step];
  const isLastStep = step === COFFEE_TASTE_QUESTIONS.length - 1;
  const selectedValue = answers[currentQuestion.id];

  async function saveResult(nextAnswers: CoffeeTasteAnswers) {
    const result = buildCoffeeTasteTestResult(nextAnswers);
    saveCoffeeTasteTestResult(result);

    if (userId) {
      const { error } = await supabase.from("user_taste_profiles").upsert(
        {
          user_id: userId,
          acidity: result.vector.acidity,
          sweetness: result.vector.sweetness,
          bitterness: result.vector.bitterness,
          nutty: result.vector.nutty,
          body: result.vector.body,
          aroma: result.vector.aroma,
          decaf: result.vector.decaf,
          taste_match_weight: result.weights.tasteMatch,
          similar_user_weight: result.weights.similarUser,
          sentiment_weight: result.weights.sentiment,
          popularity_weight: result.weights.popularity,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) {
        console.warn("taste_profile_save_failed", error.message);
      }
    }

    onComplete(result);
  }

  async function handleSelect(value: number) {
    const nextAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(nextAnswers);
    setErrorMessage(null);

    if (!isLastStep) {
      setStep((s) => s + 1);
      return;
    }

    setIsSaving(true);
    try {
      await saveResult(nextAnswers);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "검사 결과 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">
              커피 취향 테스트
            </p>
            <h3 className="font-serif text-[18px] font-bold text-[#271310] mt-1">
              내 취향에 맞는 커피 찾기
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors p-1"
            disabled={isSaving}
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="flex items-center gap-1.5 mb-5">
            {COFFEE_TASTE_QUESTIONS.map((question, index) => (
              <div
                key={question.id}
                className={`h-1.5 flex-1 rounded-full ${
                  index <= step ? "bg-[#ac3509]" : "bg-stone-200"
                }`}
              />
            ))}
          </div>

          <p className="text-[12px] font-semibold text-stone-400 mb-2">
            {step + 1} / {COFFEE_TASTE_QUESTIONS.length}
          </p>
          <h4 className="text-[18px] font-bold text-stone-900 leading-snug mb-5">
            {currentQuestion.question}
          </h4>

          <div className="grid grid-cols-1 gap-2">
            {currentQuestion.options.map((option) => {
              const active = selectedValue === option.value;
              return (
                <button
                  key={option.label}
                  onClick={() => handleSelect(option.value)}
                  disabled={isSaving}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-[14px] font-semibold transition-colors ${
                    active
                      ? "bg-[#ac3509] text-white border-[#ac3509]"
                      : "bg-white text-stone-700 border-stone-200 hover:border-[#ac3509] hover:text-[#ac3509]"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {errorMessage && (
            <p className="mt-4 text-[13px] text-red-600">
              {errorMessage}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || isSaving}
              className="px-4 py-2 rounded-lg border border-stone-300 text-stone-600 text-[13px] font-semibold hover:bg-stone-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <p className="text-[12px] text-stone-400">
              {isSaving ? "저장 중..." : "답변을 누르면 다음 질문으로 이동합니다."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
