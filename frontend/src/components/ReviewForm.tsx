'use client'

import { useState } from 'react'
import type { Cafe, Menu } from '@/lib/types'
import { useMenus } from '@/hooks/useMenus'
import { useSubmitReview } from '@/hooks/useSubmitReview'

interface ReviewFormProps {
  cafe: Cafe
  userId: string
  onClose: () => void
}

type FormStep = 1 | 2 | 3

function validateReviewText(text: string): string | null {
  const t = text.trim()
  if (t.length < 3) return '리뷰는 최소 3자 이상 입력해주세요.'
  if (/^[^a-zA-Z가-힣0-9]+$/.test(t)) return '특수문자만으로는 리뷰를 작성할 수 없습니다.'
  if (t.length > 500) return '리뷰는 최대 500자까지 입력 가능합니다.'
  return null
}

export default function ReviewForm({ cafe, userId, onClose }: ReviewFormProps) {
  const [step, setStep] = useState<FormStep>(1)
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null)
  const [reviewText, setReviewText] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const { menus, isLoading: menusLoading, error: menusError } = useMenus(cafe.id)
  const { status, errorMessage, submit, reset } = useSubmitReview()

  async function handleSubmit() {
    const err = validateReviewText(reviewText)
    if (err) {
      setValidationError(err)
      return
    }
    if (!selectedMenu) return

    setValidationError(null)
    console.log('review_submitted', { length_of_text: reviewText.trim().length })

    await submit({
      cafeId: cafe.id,
      userId,
      menuId: selectedMenu.id,
      reviewText: reviewText.trim(),
    })
  }

  const isResultStep = status === 'success' || status === 'rejected' || status === 'error'

  return (
    <div
      className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[55] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-stone-200"
        style={{ boxShadow: '0px 8px 40px rgba(62,39,35,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <div className="flex flex-col">
            <p className="text-[11px] text-stone-400 font-medium uppercase tracking-wider">리뷰 작성</p>
            <h3 className="font-serif text-[17px] font-bold text-[#271310]">{cafe.name}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            {([1, 2, 3] as const).map((s) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  s === step ? 'bg-[#ac3509]' : s < step ? 'bg-[#271310]' : 'bg-stone-200'
                }`}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors p-1"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* 바디 */}
        <div className="flex-1">
          {/* Step 1: 카페 확인 */}
          {step === 1 && (
            <div className="px-6 py-6 flex flex-col gap-4">
              <p className="text-[13px] text-stone-500 leading-relaxed">
                아래 카페에 대한 리뷰를 작성합니다. 카페가 맞으면 다음 단계로 진행하세요.
              </p>
              <div className="flex items-start gap-3 p-4 bg-[#fbf9f9] rounded-xl border border-stone-200">
                <span
                  className="material-symbols-outlined text-[#ac3509] text-[22px] mt-0.5 shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  local_cafe
                </span>
                <div>
                  <p className="font-bold text-[15px] text-stone-900">{cafe.name}</p>
                  <p className="text-[12px] text-stone-500 mt-0.5">{cafe.address ?? '주소 정보 없음'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 메뉴 선택 */}
          {step === 2 && (
            <div className="px-6 py-6 flex flex-col gap-4">
              <p className="text-[13px] font-semibold text-stone-600 uppercase tracking-wide">
                주문한 메뉴를 선택하세요
              </p>
              {menusLoading && (
                <p className="text-[14px] text-stone-400 text-center py-6">메뉴 불러오는 중...</p>
              )}
              {menusError && !menusLoading && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl">
                  <span className="material-symbols-outlined text-red-600 text-[18px] shrink-0 mt-0.5">error</span>
                  <p className="text-[13px] text-red-800">메뉴 목록을 불러오지 못했습니다.</p>
                </div>
              )}
              {!menusLoading && !menusError && menus.length === 0 && (
                <p className="text-[13px] text-stone-400 text-center py-6">등록된 메뉴가 없습니다.</p>
              )}
              {!menusLoading && menus.length > 0 && (
                <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto no-scrollbar">
                  {menus.map((menu) => (
                    <button
                      key={menu.id}
                      onClick={() => setSelectedMenu(menu)}
                      className={`px-3.5 py-2 rounded-full text-[13px] font-medium border transition-colors ${
                        selectedMenu?.id === menu.id
                          ? 'bg-[#ac3509] text-white border-[#ac3509]'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-[#ac3509] hover:text-[#ac3509]'
                      }`}
                    >
                      {menu.menu_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: 리뷰 작성 */}
          {step === 3 && status === 'idle' && (
            <div className="px-6 py-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 p-3 bg-[#fbf9f9] rounded-lg">
                <span
                  className="material-symbols-outlined text-[#ac3509] text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  coffee
                </span>
                <span className="text-[13px] font-semibold text-stone-700">{selectedMenu?.menu_name}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-stone-600 uppercase tracking-wide">
                  리뷰 작성
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => {
                    setReviewText(e.target.value)
                    if (validationError) setValidationError(null)
                  }}
                  placeholder="이 메뉴의 맛, 향, 품질에 대한 솔직한 리뷰를 남겨주세요."
                  maxLength={500}
                  rows={5}
                  className="w-full border border-stone-200 rounded-lg px-4 py-3 text-[15px] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#ac3509] transition-colors resize-none"
                />
                <div className="flex justify-between items-center">
                  {validationError ? (
                    <p className="text-[12px] text-red-600">{validationError}</p>
                  ) : (
                    <span />
                  )}
                  <span className="text-[11px] text-stone-400 ml-auto">{reviewText.length}/500</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: 로딩 */}
          {step === 3 && status === 'loading' && (
            <div className="px-6 py-10 flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-stone-200 border-t-[#ac3509] animate-spin" />
              <p className="text-[14px] text-stone-500">리뷰를 분석하는 중입니다...</p>
            </div>
          )}

          {/* Step 3: 성공 */}
          {step === 3 && status === 'success' && (
            <div className="px-6 py-8 flex flex-col items-center gap-3 text-center">
              <span
                className="material-symbols-outlined text-[48px] text-green-500"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <h4 className="font-serif text-[17px] font-bold text-stone-900">리뷰가 등록되었습니다!</h4>
              <p className="text-[13px] text-stone-500">소중한 리뷰 감사합니다.</p>
            </div>
          )}

          {/* Step 3: 반려 */}
          {step === 3 && status === 'rejected' && (
            <div className="px-6 py-8 flex flex-col items-center gap-3 text-center">
              <span
                className="material-symbols-outlined text-[48px] text-amber-500"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                report
              </span>
              <h4 className="font-serif text-[17px] font-bold text-stone-900">리뷰가 반려되었습니다</h4>
              <p className="text-[13px] text-stone-500">{errorMessage ?? '커피와 관련된 내용을 작성해 주세요.'}</p>
            </div>
          )}

          {/* Step 3: 오류 */}
          {step === 3 && status === 'error' && (
            <div className="px-6 py-8 flex flex-col items-center gap-3 text-center">
              <span
                className="material-symbols-outlined text-[48px] text-red-500"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                error
              </span>
              <h4 className="font-serif text-[17px] font-bold text-stone-900">오류가 발생했습니다</h4>
              <p className="text-[13px] text-stone-500">잠시 후 다시 시도해주세요.</p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-3 rounded-b-2xl">
          {/* 이전 버튼 (step > 1이고 결과 화면이 아닐 때) */}
          {step > 1 && !isResultStep && status !== 'loading' && (
            <button
              onClick={() => {
                setStep((s) => (s - 1) as FormStep)
                reset()
              }}
              className="px-5 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-semibold text-[14px] hover:bg-stone-100 transition-colors"
            >
              이전
            </button>
          )}

          {/* 취소 버튼 (step 1) */}
          {step === 1 && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-semibold text-[14px] hover:bg-stone-100 transition-colors"
            >
              취소
            </button>
          )}

          {/* 다음 버튼 */}
          {!isResultStep && status === 'idle' && step < 3 && (
            <button
              onClick={() => setStep((s) => (s + 1) as FormStep)}
              disabled={step === 2 && selectedMenu === null}
              className={`px-5 py-2.5 rounded-lg text-white font-semibold text-[14px] transition-colors shadow-sm ${
                step === 2 && selectedMenu === null
                  ? 'bg-stone-300 cursor-not-allowed'
                  : 'bg-[#ac3509] hover:bg-[#92300a]'
              }`}
            >
              다음
            </button>
          )}

          {/* 리뷰 제출 버튼 */}
          {status === 'idle' && step === 3 && (
            <button
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-lg bg-[#ac3509] text-white font-semibold text-[14px] hover:bg-[#92300a] transition-colors shadow-sm"
            >
              리뷰 제출
            </button>
          )}

          {/* 결과 화면 버튼 */}
          {isResultStep && (
            <>
              {status === 'error' && (
                <button
                  onClick={reset}
                  className="px-5 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-semibold text-[14px] hover:bg-stone-100 transition-colors"
                >
                  다시 시도
                </button>
              )}
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-[#ac3509] text-white font-semibold text-[14px] hover:bg-[#92300a] transition-colors shadow-sm"
              >
                닫기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
