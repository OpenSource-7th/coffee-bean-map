import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Cafe, MapCenter } from '@/lib/types'

const cafeCache = new Map<string, Cafe[]>()

const GRID_UNIT = 0.01
const LARGE_MOVE_THRESHOLD_METERS = 10_000

function snapToGrid(val: number, unit: number): number {
  return Math.floor(val / unit) * unit
}

function makeCacheKey(lat: number, lng: number, radiusMeters: number): string {
  const sLat = snapToGrid(lat, GRID_UNIT).toFixed(2)
  const sLng = snapToGrid(lng, GRID_UNIT).toFixed(2)
  return `${sLat},${sLng},${radiusMeters}`
}

function approxDistanceMeters(a: MapCenter, b: MapCenter): number {
  const latDiff = (a.lat - b.lat) * 111_000
  const lngDiff = (a.lng - b.lng) * 111_000 * Math.cos((a.lat * Math.PI) / 180)
  return Math.sqrt(latDiff ** 2 + lngDiff ** 2)
}

interface UseCafesParams {
  center: MapCenter
  radiusMeters: number
  enabled?: boolean
}

interface UseCafesResult {
  cafes: Cafe[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useCafes({ center, radiusMeters, enabled = true }: UseCafesParams): UseCafesResult {
  const [cafes, setCafes] = useState<Cafe[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const prevCenterRef = useRef<MapCenter | null>(null)
  const requestIdRef = useRef(0)

  const fetchCafes = useCallback(
    async (fetchCenter: MapCenter, bypassCache = false) => {
      const cacheKey = makeCacheKey(fetchCenter.lat, fetchCenter.lng, radiusMeters)

      if (!bypassCache && cafeCache.has(cacheKey)) {
        setCafes(cafeCache.get(cacheKey)!)
        return
      }

      const requestId = ++requestIdRef.current
      setIsLoading(true)
      setError(null)

      try {
        const { data, error: rpcError } = await supabase.rpc('get_cafes_within_radius', {
          lat: fetchCenter.lat,
          lng: fetchCenter.lng,
          radius_meters: radiusMeters,
        })

        if (requestId !== requestIdRef.current) return

        if (rpcError) throw new Error(rpcError.message)

        const result = (data ?? []) as Cafe[]
        cafeCache.set(cacheKey, result)
        setCafes(result)
      } catch (err) {
        if (requestId !== requestIdRef.current) return
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false)
      }
    },
    [radiusMeters]
  )

  useEffect(() => {
    if (!enabled) return

    const prev = prevCenterRef.current

    if (prev !== null && approxDistanceMeters(prev, center) >= LARGE_MOVE_THRESHOLD_METERS) {
      cafeCache.clear()
      prevCenterRef.current = center
      fetchCafes(center, true)
      return
    }

    prevCenterRef.current = center
    fetchCafes(center, false)
  }, [center, enabled, fetchCafes])

  const refetch = useCallback(() => {
    fetchCafes(center, true)
  }, [center, fetchCafes])

  return { cafes, isLoading, error, refetch }
}
