import { useState, useEffect } from 'react'

const STORAGE_KEY = 'preferred_menus'

export function usePreferredMenus() {
  const [preferredMenus, setPreferredMenus] = useState<string[]>([])
  const [hasInitialized, setHasInitialized] = useState<boolean | null>(null)
  // null = 아직 localStorage 읽기 전, false = 미설정, true = 설정 완료

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setPreferredMenus(JSON.parse(stored))
      setHasInitialized(true)
    } else {
      setHasInitialized(false)
    }
  }, [])

  const save = (menus: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(menus))
    setPreferredMenus(menus)
    setHasInitialized(true)
  }

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY)
    setPreferredMenus([])
    setHasInitialized(false)
  }

  return { preferredMenus, hasInitialized, save, reset }
}