import { useState, useCallback } from 'react'

export function useFilter() {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])

  const toggleFilter = useCallback((menu: string) => {
    setSelectedFilters(prev =>
      prev.includes(menu) ? prev.filter(f => f !== menu) : [...prev, menu]
    )
  }, [])

  const clearFilters = useCallback(() => setSelectedFilters([]), [])

  return { selectedFilters, toggleFilter, clearFilters }
}
