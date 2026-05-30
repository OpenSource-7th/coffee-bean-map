import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Menu } from '@/lib/types'

interface UseMenusResult {
  menus: Menu[]
  isLoading: boolean
  error: Error | null
}

const menuCache = new Map<string, Menu[]>()

export function useMenus(cafeId: string | null): UseMenusResult {
  const [menus, setMenus] = useState<Menu[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!cafeId) {
      setMenus([])
      return
    }

    if (menuCache.has(cafeId)) {
      setMenus(menuCache.get(cafeId)!)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    supabase
      .from('menus')
      .select('id, cafe_id, menu_name, is_verified, created_at')
      .eq('cafe_id', cafeId)
      .eq('is_verified', true)
      .order('menu_name')
      .then(({ data, error: rpcError }) => {
        if (cancelled) return
        if (rpcError) {
          setError(new Error(rpcError.message))
          setIsLoading(false)
          return
        }
        const result = (data ?? []) as Menu[]
        menuCache.set(cafeId, result)
        setMenus(result)
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [cafeId])

  return { menus, isLoading, error }
}
