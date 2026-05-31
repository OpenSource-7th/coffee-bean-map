"use client";

import { useState } from "react";

const MENU_OPTIONS = ["아메리카노", "라떼", "카푸치노", "핸드드립", "콜드브루"];

interface OnboardingModalProps {
  onComplete: (menus: string[]) => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (menu: string) => {
    setSelected(prev =>
      prev.includes(menu) ? prev.filter(m => m !== menu) : [...prev, menu]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl px-8 py-10 w-[340px] flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <span
            className="material-symbols-outlined text-[#ac3509] text-[40px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            local_cafe
          </span>
          <h2 className="font-serif text-[20px] font-bold text-[#271310]">
            어떤 커피를 좋아하세요?
          </h2>
          <p className="text-[13px] text-stone-500 text-center">
            선호 메뉴를 선택하면 주변에서<br />잘하는 카페를 먼저 보여드려요.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {MENU_OPTIONS.map(menu => {
            const active = selected.includes(menu);
            return (
              <button
                key={menu}
                onClick={() => toggle(menu)}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold border transition-colors ${
                  active
                    ? "bg-[#ac3509] text-white border-[#ac3509]"
                    : "bg-white text-stone-600 border-stone-300 hover:border-stone-400"
                }`}
              >
                {menu}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => onComplete(selected)}
            disabled={selected.length === 0}
            className="w-full py-2.5 rounded-xl bg-[#ac3509] text-white text-[14px] font-semibold hover:bg-[#92300a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            완료
          </button>
          <button
            onClick={() => onComplete([])}
            className="w-full py-2 text-[12px] text-stone-400 hover:text-stone-600 transition-colors"
          >
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  );
}