export const TASTE_VECTOR_KEYS = [
  'acidity',
  'sweetness',
  'bitterness',
  'nutty',
  'body',
  'aroma',
  'milk',
] as const

export type TasteVectorKey = (typeof TASTE_VECTOR_KEYS)[number]
export type TasteVector = Record<TasteVectorKey, number>

export interface RecommendationWeights {
  tasteMatch: number
  similarUser: number
  sentiment: number
  popularity: number
}

export const DEFAULT_RECOMMENDATION_WEIGHTS: RecommendationWeights = {
  tasteMatch: 0.5,
  similarUser: 0.3,
  sentiment: 0.15,
  popularity: 0.05,
}

export interface UserPreference {
  userId: string
  vector: TasteVector
}

export type RecommendationSentiment = 'positive' | 'neutral' | 'negative'

export interface RecommendationReview {
  userId: string
  cafeId: string
  menuId: string
  sentiment: RecommendationSentiment | null
  confidenceScore?: number | null
}

export interface RecommendationItem {
  cafeId: string
  menuId: string
  cafeName?: string | null
  menuName?: string | null
  tasteVector: TasteVector
  sentimentScore?: number | null
  reviewCount?: number | null
}

export interface RecommendationResult {
  cafe_id: string
  menu_id: string
  cafe_name?: string | null
  menu_name?: string | null
  final_score: number
  taste_match_score: number
  similar_user_score: number
  sentiment_score: number
  popularity_score: number
  reasons: string[]
}

export interface RecommendationInput {
  userId: string
  userVector: TasteVector
  items: RecommendationItem[]
  reviews?: RecommendationReview[]
  userPreferences?: UserPreference[]
  weights?: RecommendationWeights
}

const TASTE_LABELS: Record<TasteVectorKey, string> = {
  acidity: '산미',
  sweetness: '단맛',
  bitterness: '쌉쌀함',
  nutty: '고소함',
  body: '바디감',
  aroma: '향',
  milk: '우유가 들어간 커피 선호',
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function normalizeTasteVector(vector: Partial<TasteVector>): TasteVector {
  return TASTE_VECTOR_KEYS.reduce((acc, key) => {
    acc[key] = clamp01(Number(vector[key] ?? 0))
    return acc
  }, {} as TasteVector)
}

export function cosineSimilarity(a: TasteVector, b: TasteVector): number {
  let dot = 0
  let aSize = 0
  let bSize = 0

  for (const key of TASTE_VECTOR_KEYS) {
    dot += a[key] * b[key]
    aSize += a[key] ** 2
    bSize += b[key] ** 2
  }

  if (aSize === 0 || bSize === 0) return 0
  return clamp01(dot / (Math.sqrt(aSize) * Math.sqrt(bSize)))
}

export function sentimentToScore(sentiment: RecommendationSentiment | null | undefined): number {
  if (sentiment === 'positive') return 1
  if (sentiment === 'neutral') return 0.5
  if (sentiment === 'negative') return 0
  return 0.5
}

export function calculatePopularityScore(reviewCount: number | null | undefined): number {
  const count = Math.max(0, Number(reviewCount ?? 0))
  return clamp01(Math.log1p(count) / Math.log1p(50))
}

export function calculateSimilarUserScore(params: {
  userId: string
  userVector: TasteVector
  menuId: string
  reviews: RecommendationReview[]
  userPreferences: UserPreference[]
}): number {
  const preferenceByUser = new Map(params.userPreferences.map((pref) => [pref.userId, pref.vector]))
  let weightedScoreSum = 0
  let similaritySum = 0

  for (const review of params.reviews) {
    if (review.userId === params.userId || review.menuId !== params.menuId) continue

    const otherVector = preferenceByUser.get(review.userId)
    if (!otherVector) continue

    const similarity = cosineSimilarity(params.userVector, otherVector)
    if (similarity < 0.6) continue

    weightedScoreSum += similarity * sentimentToScore(review.sentiment)
    similaritySum += similarity
  }

  if (similaritySum === 0) return 0
  return clamp01(weightedScoreSum / similaritySum)
}

export function calculateRecommendationScore(params: {
  tasteMatchScore: number
  similarUserScore: number
  sentimentScore: number
  popularityScore: number
  weights?: RecommendationWeights
}): number {
  const weights = params.weights ?? DEFAULT_RECOMMENDATION_WEIGHTS

  return clamp01(
    weights.tasteMatch * clamp01(params.tasteMatchScore)
      + weights.similarUser * clamp01(params.similarUserScore)
      + weights.sentiment * clamp01(params.sentimentScore)
      + weights.popularity * clamp01(params.popularityScore)
  )
}

function buildReasons(params: {
  userVector: TasteVector
  itemVector: TasteVector
  tasteMatchScore: number
  similarUserScore: number
  sentimentScore: number
  popularityScore: number
}): string[] {
  const matchedTasteKeys = TASTE_VECTOR_KEYS
    .filter((key) => params.userVector[key] >= 0.6 && Math.abs(params.userVector[key] - params.itemVector[key]) <= 0.25)
    .sort((a, b) => params.userVector[b] - params.userVector[a])
    .slice(0, 2)

  const reasons = matchedTasteKeys.map((key) => `사용자가 선호하는 ${TASTE_LABELS[key]}과 잘 맞습니다.`)

  if (params.similarUserScore >= 0.65) {
    reasons.push('비슷한 취향의 사용자들이 긍정적으로 평가했습니다.')
  }
  if (params.sentimentScore >= 0.7) {
    reasons.push('리뷰 감성이 긍정적입니다.')
  }
  if (params.popularityScore >= 0.55) {
    reasons.push('많은 리뷰를 바탕으로 신뢰도가 높습니다.')
  }
  if (reasons.length === 0 && params.tasteMatchScore >= 0.6) {
    reasons.push('전체적인 맛 선호 벡터가 사용자 취향과 유사합니다.')
  }

  return reasons
}

export function getRecommendations(input: RecommendationInput): RecommendationResult[] {
  const userVector = normalizeTasteVector(input.userVector)
  const reviews = input.reviews ?? []
  const userPreferences = input.userPreferences ?? []

  return input.items
    .map((item) => {
      const itemVector = normalizeTasteVector(item.tasteVector)
      const tasteMatchScore = cosineSimilarity(userVector, itemVector)
      const similarUserScore = calculateSimilarUserScore({
        userId: input.userId,
        userVector,
        menuId: item.menuId,
        reviews,
        userPreferences,
      })
      const sentimentScore = clamp01(Number(item.sentimentScore ?? 0.5))
      const popularityScore = calculatePopularityScore(item.reviewCount)
      const finalScore = calculateRecommendationScore({
        tasteMatchScore,
        similarUserScore,
        sentimentScore,
        popularityScore,
        weights: input.weights,
      })

      return {
        cafe_id: item.cafeId,
        menu_id: item.menuId,
        cafe_name: item.cafeName ?? null,
        menu_name: item.menuName ?? null,
        final_score: Number(finalScore.toFixed(4)),
        taste_match_score: Number(tasteMatchScore.toFixed(4)),
        similar_user_score: Number(similarUserScore.toFixed(4)),
        sentiment_score: Number(sentimentScore.toFixed(4)),
        popularity_score: Number(popularityScore.toFixed(4)),
        reasons: buildReasons({
          userVector,
          itemVector,
          tasteMatchScore,
          similarUserScore,
          sentimentScore,
          popularityScore,
        }),
      }
    })
    .sort((a, b) => b.final_score - a.final_score)
}
