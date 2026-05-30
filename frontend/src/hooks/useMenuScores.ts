import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { MenuScore } from '@/lib/types'

export function useMenuScores(cafeId: string | null) {
  const [menuScores, setMenuScores] = useState<MenuScore[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!cafeId) {
      setMenuScores([])
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    supabase
      .from('menu_scores')
      .select('id, cafe_id, menu_id, positive_count, neutral_count, negative_count, weighted_score, bayesian_score, is_signature, updated_at')
      .eq('cafe_id', cafeId)
      .order('bayesian_score', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          setError(new Error(err.message))
        } else {
          setMenuScores((data ?? []) as MenuScore[])
        }
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [cafeId])

  return { menuScores, isLoading, error }
}
