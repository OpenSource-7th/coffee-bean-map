import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { AIAnalyzeResponse } from '@/lib/types'

const AI_SERVER_URL = process.env.NEXT_PUBLIC_AI_SERVER_URL ?? 'http://localhost:8000'

interface SubmitParams {
  cafeId: string
  userId: string
  reviewText: string
}

type ReviewStatus = 'idle' | 'loading' | 'success' | 'rejected' | 'error'

interface UseSubmitReviewResult {
  status: ReviewStatus
  confidenceScore: number | null
  errorMessage: string | null
  submit: (params: SubmitParams) => Promise<void>
  reset: () => void
}

export function useSubmitReview(): UseSubmitReviewResult {
  const [status, setStatus] = useState<ReviewStatus>('idle')
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const submit = useCallback(async ({ cafeId, userId, reviewText }: SubmitParams) => {
    setStatus('loading')
    setConfidenceScore(null)
    setErrorMessage(null)

    try {
      // 1. AI 서버 호출
      const aiResponse = await fetch(`${AI_SERVER_URL}/api/v1/analyze-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          review_text: reviewText,
          timestamp: new Date().toISOString(),
        }),
      })

      // 406은 AI 반려 응답이므로 별도 처리, 그 외 에러는 throw
      if (!aiResponse.ok && aiResponse.status !== 406) {
        throw new Error(`AI server error: ${aiResponse.status}`)
      }

      const aiData: AIAnalyzeResponse = await aiResponse.json()

      // 2. AI 반려 → 입력 텍스트 유지, 안내 메시지 표시
      if (aiData.status === 'invalid') {
        setStatus('rejected')
        setErrorMessage('커피와 관련된 내용을 작성해 주세요.')
        return
      }

      // 3. AI 승인 → Supabase INSERT (SDK 파라미터화 쿼리로 SQL 인젝션 차단)
      const { error: dbError } = await supabase.from('reviews').insert({
        cafe_id: cafeId,
        user_id: userId,
        review_text: reviewText,
        confidence_score: aiData.confidence_score,
      })

      if (dbError) throw new Error(dbError.message)

      setStatus('success')
      setConfidenceScore(aiData.confidence_score ?? null)
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setConfidenceScore(null)
    setErrorMessage(null)
  }, [])

  return { status, confidenceScore, errorMessage, submit, reset }
}
