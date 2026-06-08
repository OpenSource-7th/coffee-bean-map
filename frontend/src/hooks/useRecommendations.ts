import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  getRecommendations,
  normalizeTasteVector,
  type RecommendationWeights,
  type RecommendationItem,
  type RecommendationReview,
  type RecommendationResult,
  type TasteVector,
  type UserPreference,
} from '@/lib/recommendations'

interface UseRecommendationsParams {
  userId: string | null
  limit?: number
  enabled?: boolean
  userVector?: TasteVector | null
  weights?: RecommendationWeights | null
}

interface UseRecommendationsResult {
  recommendations: RecommendationResult[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

interface RawUserTasteProfile {
  user_id: string
  acidity: number | null
  sweetness: number | null
  bitterness: number | null
  nutty: number | null
  body: number | null
  aroma: number | null
  decaf: number | null
  taste_match_weight?: number | null
  similar_user_weight?: number | null
  sentiment_weight?: number | null
  popularity_weight?: number | null
}

interface RawMenuTasteProfile {
  menu_id: string
  cafe_id: string
  acidity_score: number | null
  sweetness_score: number | null
  bitterness_score: number | null
  nutty_score: number | null
  body_score: number | null
  aroma_score: number | null
  decaf_score: number | null
}

interface RawMenu {
  id: string
  cafe_id: string
  menu_name: string
  cafes?: { name?: string | null } | { name?: string | null }[] | null
}

interface RawMenuScore {
  cafe_id: string
  menu_id: string
  positive_count: number | null
  neutral_count: number | null
  negative_count: number | null
  bayesian_score: number | null
  weighted_score: number | null
}

interface RawReview {
  user_id: string
  cafe_id: string
  menu_id: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  confidence_score: number | null
}

interface QueryResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

function isMissingSchemaError(error: { message: string; code?: string } | null | undefined): boolean {
  if (!error) return false
  return (
    error.code === 'PGRST205'
    || error.message.includes("Could not find the table")
    || error.message.includes("Could not find the '")
  )
}

function tasteVectorFromUserProfile(profile: RawUserTasteProfile): TasteVector {
  return normalizeTasteVector({
    acidity: profile.acidity ?? 0,
    sweetness: profile.sweetness ?? 0,
    bitterness: profile.bitterness ?? 0,
    nutty: profile.nutty ?? 0,
    body: profile.body ?? 0,
    aroma: profile.aroma ?? 0,
    decaf: profile.decaf ?? 0,
  })
}

function weightsFromUserProfile(profile: RawUserTasteProfile | null): RecommendationWeights | null {
  if (
    profile?.taste_match_weight == null
    || profile.similar_user_weight == null
    || profile.sentiment_weight == null
    || profile.popularity_weight == null
  ) {
    return null
  }

  return {
    tasteMatch: profile.taste_match_weight,
    similarUser: profile.similar_user_weight,
    sentiment: profile.sentiment_weight,
    popularity: profile.popularity_weight,
  }
}

function tasteVectorFromMenuProfile(profile: RawMenuTasteProfile): TasteVector {
  return normalizeTasteVector({
    acidity: profile.acidity_score ?? 0,
    sweetness: profile.sweetness_score ?? 0,
    bitterness: profile.bitterness_score ?? 0,
    nutty: profile.nutty_score ?? 0,
    body: profile.body_score ?? 0,
    aroma: profile.aroma_score ?? 0,
    decaf: profile.decaf_score ?? 0,
  })
}

function cafeNameFromMenu(menu: RawMenu | undefined): string | null {
  const cafes = menu?.cafes
  if (Array.isArray(cafes)) return cafes[0]?.name ?? null
  return cafes?.name ?? null
}

function inferTasteVectorFromMenuName(menuName: string): TasteVector {
  const name = menuName.toLowerCase()

  if (name.includes('라떼') || name.includes('latte') || name.includes('flat') || name.includes('카푸치노')) {
    return normalizeTasteVector({
      acidity: 0.25,
      sweetness: 0.72,
      bitterness: 0.35,
      nutty: 0.68,
      body: 0.75,
      aroma: 0.55,
      decaf: 0,
    })
  }

  if (name.includes('콜드브루') || name.includes('cold')) {
    return normalizeTasteVector({
      acidity: 0.32,
      sweetness: 0.64,
      bitterness: 0.45,
      nutty: 0.58,
      body: 0.62,
      aroma: 0.58,
      decaf: 0,
    })
  }

  if (name.includes('핸드드립') || name.includes('드립') || name.includes('필터') || name.includes('싱글')) {
    return normalizeTasteVector({
      acidity: 0.72,
      sweetness: 0.58,
      bitterness: 0.38,
      nutty: 0.45,
      body: 0.42,
      aroma: 0.82,
      decaf: 0,
    })
  }

  if (name.includes('에스프레소') || name.includes('espresso')) {
    return normalizeTasteVector({
      acidity: 0.38,
      sweetness: 0.28,
      bitterness: 0.85,
      nutty: 0.58,
      body: 0.88,
      aroma: 0.78,
      decaf: 0,
    })
  }

  return normalizeTasteVector({
    acidity: 0.42,
    sweetness: 0.38,
    bitterness: 0.62,
    nutty: 0.56,
    body: 0.58,
    aroma: 0.62,
    decaf: 0,
  })
}

export function useRecommendations({
  userId,
  limit = 20,
  enabled = true,
  userVector,
  weights,
}: UseRecommendationsParams): UseRecommendationsResult {
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchRecommendations = useCallback(async () => {
    if ((!userId && !userVector) || !enabled) {
      setRecommendations([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [
        userProfileResult,
        allProfilesResult,
        menuProfilesResult,
        menusResult,
        menuScoresResult,
        reviewsResult,
      ] = await Promise.all([
        userId
          ? supabase.from('user_taste_profiles').select('*').eq('user_id', userId).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.from('user_taste_profiles').select('*'),
        supabase.from('menu_taste_profiles').select('*'),
        supabase.from('menus').select('id, cafe_id, menu_name, cafes(name)').eq('is_verified', true),
        supabase
          .from('menu_scores')
          .select('cafe_id, menu_id, positive_count, neutral_count, negative_count, bayesian_score, weighted_score'),
        supabase
          .from('reviews')
          .select('user_id, cafe_id, menu_id, sentiment, confidence_score')
          .not('menu_id', 'is', null)
          .not('sentiment', 'is', null),
      ]) as [
        QueryResult<RawUserTasteProfile>,
        QueryResult<RawUserTasteProfile[]>,
        QueryResult<RawMenuTasteProfile[]>,
        QueryResult<RawMenu[]>,
        QueryResult<RawMenuScore[]>,
        QueryResult<RawReview[]>,
      ]

      const firstError =
        (isMissingSchemaError(userProfileResult.error) ? null : userProfileResult.error)
        ?? (isMissingSchemaError(allProfilesResult.error) ? null : allProfilesResult.error)
        ?? (isMissingSchemaError(menuProfilesResult.error) ? null : menuProfilesResult.error)
        ?? menusResult.error
        ?? menuScoresResult.error
        ?? reviewsResult.error

      if (firstError) throw new Error(firstError.message)
      if (!userVector && !userProfileResult.data) {
        setRecommendations([])
        return
      }

      const userProfile = userProfileResult.data as RawUserTasteProfile | null
      const currentUserVector = userVector ? normalizeTasteVector(userVector) : tasteVectorFromUserProfile(userProfile!)
      const recommendationWeights = weights ?? weightsFromUserProfile(userProfile)
      const menusById = new Map(
        ((menusResult.data ?? []) as unknown as RawMenu[]).map((menu) => [menu.id, menu])
      )
      const menuScoresById = new Map(
        ((menuScoresResult.data ?? []) as RawMenuScore[]).map((score) => [score.menu_id, score])
      )

      const itemByMenuId = new Map<string, RecommendationItem>()

      ;((menuProfilesResult.data ?? []) as RawMenuTasteProfile[])
        .filter((profile) => menusById.has(profile.menu_id))
        .forEach((profile) => {
          const menu = menusById.get(profile.menu_id)
          const score = menuScoresById.get(profile.menu_id)
          const reviewCount =
            (score?.positive_count ?? 0) + (score?.neutral_count ?? 0) + (score?.negative_count ?? 0)

          itemByMenuId.set(profile.menu_id, {
            cafeId: profile.cafe_id,
            menuId: profile.menu_id,
            cafeName: cafeNameFromMenu(menu),
            menuName: menu?.menu_name ?? null,
            tasteVector: tasteVectorFromMenuProfile(profile),
            sentimentScore: score?.bayesian_score ?? score?.weighted_score ?? null,
            reviewCount,
          })
        })

      ;((menusResult.data ?? []) as RawMenu[]).forEach((menu) => {
        if (itemByMenuId.has(menu.id)) return

        const score = menuScoresById.get(menu.id)
        const reviewCount =
          (score?.positive_count ?? 0) + (score?.neutral_count ?? 0) + (score?.negative_count ?? 0)

        itemByMenuId.set(menu.id, {
          cafeId: menu.cafe_id,
          menuId: menu.id,
          cafeName: cafeNameFromMenu(menu),
          menuName: menu.menu_name,
          tasteVector: inferTasteVectorFromMenuName(menu.menu_name),
          sentimentScore: score?.bayesian_score ?? score?.weighted_score ?? null,
          reviewCount,
        })
      })

      const items = Array.from(itemByMenuId.values())

      const userPreferences: UserPreference[] = ((allProfilesResult.data ?? []) as RawUserTasteProfile[]).map(
        (profile) => ({
          userId: profile.user_id,
          vector: tasteVectorFromUserProfile(profile),
        })
      )

      const reviews: RecommendationReview[] = ((reviewsResult.data ?? []) as RawReview[])
        .filter((review): review is RawReview & { menu_id: string } => review.menu_id !== null)
        .map((review) => ({
          userId: review.user_id,
          cafeId: review.cafe_id,
          menuId: review.menu_id,
          sentiment: review.sentiment,
          confidenceScore: review.confidence_score,
        }))

      setRecommendations(
        getRecommendations({
          userId: userId ?? 'local-taste-test-user',
          userVector: currentUserVector,
          items,
          reviews,
          userPreferences,
          weights: recommendationWeights ?? undefined,
        }).slice(0, limit)
      )
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setRecommendations([])
    } finally {
      setIsLoading(false)
    }
  }, [enabled, limit, userId, userVector, weights])

  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  return { recommendations, isLoading, error, refetch: fetchRecommendations }
}
