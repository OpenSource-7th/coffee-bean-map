import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { AIAnalyzeResponse } from '@/lib/types'

const AI_SERVER_URL = process.env.NEXT_PUBLIC_AI_SERVER_URL ?? 'http://localhost:8000'

interface SubmitParams {
  cafeId: string
  userId: string
  menuId: string
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

  const submit = useCallback(async ({ cafeId, userId, menuId, reviewText }: SubmitParams) => {
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
          cafe_id: cafeId,
          menu_id: menuId,
          review_text: reviewText,
        }),
      })

      if (!aiResponse.ok) {
        throw new Error(`AI server error: ${aiResponse.status}`)
      }

      const aiData: AIAnalyzeResponse = await aiResponse.json()

      if (aiData.status === 'error') {
        setStatus('rejected')
        setErrorMessage('커피와 관련된 내용을 작성해 주세요.')
        return
      }

      // 2. AI 승인 → Supabase INSERT (SDK 파라미터화 쿼리로 SQL 인젝션 차단)
      const { error: dbError } = await supabase.from('reviews').insert({
        cafe_id:          cafeId,
        user_id:          userId,
        menu_id:          menuId,
        review_text:      reviewText,
        sentiment:        aiData.sentiment,
        confidence_score: aiData.confidence,
        menu_relevance:   aiData.menu_relevance,
      })

      if (dbError) throw new Error(dbError.message)

      setStatus('success')
      setConfidenceScore(aiData.confidence)
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
