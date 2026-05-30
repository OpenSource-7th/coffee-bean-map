import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Module-level cache: cafeId -> verified menu name list
const globalMenuCache = new Map<string, string[]>()

export function useCafeMenus(cafeIds: string[]) {
  const [cafeMenuMap, setCafeMenuMap] = useState<Map<string, string[]>>(new Map())

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (cafeIds.length === 0) {
      setCafeMenuMap(new Map())
      return
    }

    const uncached = cafeIds.filter(id => !globalMenuCache.has(id))

    if (uncached.length === 0) {
      const map = new Map<string, string[]>()
      cafeIds.forEach(id => map.set(id, globalMenuCache.get(id) ?? []))
      setCafeMenuMap(map)
      return
    }

    let cancelled = false

    supabase
      .from('menus')
      .select('cafe_id, menu_name')
      .in('cafe_id', uncached)
      .eq('is_verified', true)
      .then(({ data }) => {
        if (cancelled) return

        uncached.forEach(id => {
          if (!globalMenuCache.has(id)) globalMenuCache.set(id, [])
        })
        ;(data ?? []).forEach((row: { cafe_id: string; menu_name: string }) => {
          const arr = globalMenuCache.get(row.cafe_id)!
          if (!arr.includes(row.menu_name)) arr.push(row.menu_name)
        })

        const map = new Map<string, string[]>()
        cafeIds.forEach(id => map.set(id, globalMenuCache.get(id) ?? []))
        setCafeMenuMap(map)
      })

    return () => { cancelled = true }
  }, [cafeIds.join(',')]) // stable string key for array equality

  return { cafeMenuMap }
}
