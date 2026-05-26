import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface MyReview {
  id: string
  cafe_id: string
  cafe_name: string
  content: string
  is_valid: boolean
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
      .select('id, cafe_id, cafes(name), content, is_valid, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReviews(
          (data ?? []).map((r: any) => ({
            ...r,
            cafe_name: r.cafes?.name ?? '알 수 없는 카페',
          }))
        )
        setIsLoading(false)
      })
  }, [userId])

  return { reviews, isLoading }
}