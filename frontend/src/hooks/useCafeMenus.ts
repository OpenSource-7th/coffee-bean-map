import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface CafeMenuItem {
  id: string
  cafe_id: string
  menu_name: string
}

// Module-level cache: cafeId -> verified menu name list
const globalMenuCache = new Map<string, string[]>()
const globalMenuItemCache = new Map<string, CafeMenuItem[]>()

export function useCafeMenus(cafeIds: string[]) {
  const [cafeMenuMap, setCafeMenuMap] = useState<Map<string, string[]>>(new Map())
  const [cafeMenuItemsMap, setCafeMenuItemsMap] = useState<Map<string, CafeMenuItem[]>>(new Map())

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (cafeIds.length === 0) {
      setCafeMenuMap(new Map())
      setCafeMenuItemsMap(new Map())
      return
    }

    const uncached = cafeIds.filter(id => !globalMenuCache.has(id) || !globalMenuItemCache.has(id))

    if (uncached.length === 0) {
      const nameMap = new Map<string, string[]>()
      const itemMap = new Map<string, CafeMenuItem[]>()
      cafeIds.forEach(id => {
        nameMap.set(id, globalMenuCache.get(id) ?? [])
        itemMap.set(id, globalMenuItemCache.get(id) ?? [])
      })
      setCafeMenuMap(nameMap)
      setCafeMenuItemsMap(itemMap)
      return
    }

    let cancelled = false

    supabase
      .from('menus')
      .select('id, cafe_id, menu_name')
      .in('cafe_id', uncached)
      .eq('is_verified', true)
      .then(({ data }) => {
        if (cancelled) return

        uncached.forEach(id => {
          if (!globalMenuCache.has(id)) globalMenuCache.set(id, [])
          if (!globalMenuItemCache.has(id)) globalMenuItemCache.set(id, [])
        })
        ;((data ?? []) as CafeMenuItem[]).forEach((row) => {
          const arr = globalMenuCache.get(row.cafe_id)!
          if (!arr.includes(row.menu_name)) arr.push(row.menu_name)

          const itemArr = globalMenuItemCache.get(row.cafe_id)!
          if (!itemArr.some(item => item.id === row.id)) itemArr.push(row)
        })

        const nameMap = new Map<string, string[]>()
        const itemMap = new Map<string, CafeMenuItem[]>()
        cafeIds.forEach(id => {
          nameMap.set(id, globalMenuCache.get(id) ?? [])
          itemMap.set(id, globalMenuItemCache.get(id) ?? [])
        })
        setCafeMenuMap(nameMap)
        setCafeMenuItemsMap(itemMap)
      })

    return () => { cancelled = true }
  }, [cafeIds.join(',')]) // stable string key for array equality

  return { cafeMenuMap, cafeMenuItemsMap }
}
