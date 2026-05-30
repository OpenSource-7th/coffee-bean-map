import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { AIAnalyzeResponse, PendingReview } from '@/lib/types'

const AI_SERVER_URL = process.env.NEXT_PUBLIC_AI_SERVER_URL ?? 'http://localhost:8000'
const PENDING_KEY = 'coffee_pending_reviews'

interface SubmitParams {
  cafeId: string
  userId: string
  menuId: string
  reviewText: string
}

type ReviewStatus = 'idle' | 'loading' | 'success' | 'rejected' | 'error' | 'queued'

interface UseSubmitReviewResult {
  status: ReviewStatus
  confidenceScore: number | null
  errorMessage: string | null
  pendingReviews: PendingReview[]
  submit: (params: SubmitParams) => Promise<void>
  retryPending: (id: string) => Promise<void>
  dismissPending: (id: string) => void
  reset: () => void
}

function loadPending(): PendingReview[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistPending(reviews: PendingReview[]) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(reviews))
}

export function useSubmitReview(): UseSubmitReviewResult {
  const [status, setStatus] = useState<ReviewStatus>('idle')
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([])

  useEffect(() => {
    setPendingReviews(loadPending())
  }, [])

  const addToPending = useCallback((params: SubmitParams) => {
    const review: PendingReview = {
      id: crypto.randomUUID(),
      cafeId: params.cafeId,
      userId: params.userId,
      menuId: params.menuId,
      reviewText: params.reviewText,
      savedAt: new Date().toISOString(),
    }
    setPendingReviews(prev => {
      const next = [...prev, review]
      persistPending(next)
      return next
    })
  }, [])

  const removePending = useCallback((id: string) => {
    setPendingReviews(prev => {
      const next = prev.filter(r => r.id !== id)
      persistPending(next)
      return next
    })
  }, [])

  // Core submit logic (AI call + DB insert), throws on network/server error
  const doSubmit = useCallback(async (params: SubmitParams): Promise<'success' | 'rejected'> => {
    const aiResponse = await fetch(`${AI_SERVER_URL}/api/v1/analyze-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: params.userId,
        cafe_id: params.cafeId,
        menu_id: params.menuId,
        review_text: params.reviewText,
      }),
    })

    if (!aiResponse.ok) throw new Error(`AI server error: ${aiResponse.status}`)

    const aiData: AIAnalyzeResponse = await aiResponse.json()
    console.log('ai_result', { sentiment: aiData.sentiment })

    if (aiData.status === 'error') return 'rejected'

    const { error: dbError } = await supabase.from('reviews').insert({
      cafe_id: params.cafeId,
      user_id: params.userId,
      menu_id: params.menuId,
      review_text: params.reviewText,
      sentiment: aiData.sentiment,
      confidence_score: aiData.confidence,
      menu_relevance: aiData.menu_relevance,
    })

    if (dbError) throw new Error(dbError.message)

    return 'success'
  }, [])

  const submit = useCallback(async (params: SubmitParams) => {
    setStatus('loading')
    setConfidenceScore(null)
    setErrorMessage(null)

    try {
      const result = await doSubmit(params)
      if (result === 'rejected') {
        setStatus('rejected')
        setErrorMessage('커피와 관련된 내용을 작성해 주세요.')
      } else {
        setStatus('success')
      }
    } catch (err) {
      if (err instanceof TypeError) {
        // Network unreachable → queue locally
        addToPending(params)
        setStatus('queued')
        setErrorMessage('네트워크 오류로 임시 저장되었습니다. 연결 후 다시 시도해 주세요.')
      } else {
        setStatus('error')
        setErrorMessage(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
      }
    }
  }, [doSubmit, addToPending])

  const retryPending = useCallback(async (id: string) => {
    const review = pendingReviews.find(r => r.id === id)
    if (!review) return

    try {
      await doSubmit({
        cafeId: review.cafeId,
        userId: review.userId,
        menuId: review.menuId,
        reviewText: review.reviewText,
      })
      removePending(id)
    } catch {
      // Keep in queue if retry also fails
    }
  }, [pendingReviews, doSubmit, removePending])

  const reset = useCallback(() => {
    setStatus('idle')
    setConfidenceScore(null)
    setErrorMessage(null)
  }, [])

  return {
    status,
    confidenceScore,
    errorMessage,
    pendingReviews,
    submit,
    retryPending,
    dismissPending: removePending,
    reset,
  }
}
