import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface MyReview {
  id: string
  cafe_id: string
  cafe_name: string
  review_text: string
  sentiment: string | null
  created_at: string
}

export function useMyReviews(userId: string | null) {
  const [reviews, setReviews] = useState<MyReview[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId) {
      setReviews([])
      return
    }

    setIsLoading(true)

    supabase
      .from('reviews')
      .select('id, cafe_id, cafes(name), review_text, sentiment, created_at')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReviews(
          (data ?? []).map((r: any) => ({
            id: r.id,
            cafe_id: r.cafe_id,
            cafe_name: r.cafes?.name ?? '알 수 없는 카페',
            review_text: r.review_text ?? '',
            sentiment: r.sentiment ?? null,
            created_at: r.created_at,
          }))
        )
        setIsLoading(false)
      })
  }, [userId])

  return { reviews, isLoading }
}
