import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { MenuScore } from '@/lib/types'

export function useAllCafeMenuScores(cafeIds: string[]) {
  const [menuScores, setMenuScores] = useState<MenuScore[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (cafeIds.length === 0) {
      setMenuScores([])
      return
    }

    let cancelled = false
    setIsLoading(true)

    supabase
      .from('menu_scores')
      .select('id, cafe_id, menu_id, positive_count, neutral_count, negative_count, weighted_score, bayesian_score, is_signature, updated_at')
      .in('cafe_id', cafeIds)
      .order('bayesian_score', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setMenuScores((data ?? []) as MenuScore[])
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [cafeIds.join(',')])

  return { menuScores, isLoading }
}