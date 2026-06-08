import type { RecommendationSentiment, TasteVector } from './recommendations'

export interface TasteReviewInput {
  menuId: string
  reviewText: string
  sentiment?: RecommendationSentiment | null
}

interface KeywordRule {
  keywords: string[]
  scores: Partial<TasteVector>
}

const POSITIVE_RULES: KeywordRule[] = [
  {
    keywords: ['산미', '상큼', '새콤', '시트러스', '과일', '과일향', '베리', '자몽', '레몬', '오렌지', '청량'],
    scores: { acidity: 0.85, aroma: 0.55 },
  },
  {
    keywords: ['달콤', '단맛', '단 향', '꿀', '카라멜', '초콜릿', '초코', '브라운슈가', '시럽'],
    scores: { sweetness: 0.85, body: 0.45 },
  },
  {
    keywords: ['쌉싸름', '진한', '강한', '다크', '카카오', '묵직', '로스티', '스모키'],
    scores: { bitterness: 0.78, body: 0.78 },
  },
  {
    keywords: ['고소', '견과', '너티', '아몬드', '땅콩', '헤이즐넛', '곡물', '구수'],
    scores: { nutty: 0.88, body: 0.55 },
  },
  {
    keywords: ['바디감', '묵직', '크리미', '부드럽', '질감', '밀도', '풍부'],
    scores: { body: 0.82 },
  },
  {
    keywords: ['향', '향미', '아로마', '플로럴', '꽃향', '향긋', '은은', '복합적'],
    scores: { aroma: 0.88 },
  },
  {
    keywords: ['디카페인', '디카페'],
    scores: { decaf: 1 },
  },
]

const NEGATIVE_RULES: KeywordRule[] = [
  {
    keywords: ['시다', '신맛', '너무 셔', '산미가 강', '산미 강', '시큼'],
    scores: { acidity: 0.9 },
  },
  {
    keywords: ['너무 달', '단맛이 강', '달아서', '달기만'],
    scores: { sweetness: 0.9 },
  },
  {
    keywords: ['쓰다', '쓴맛', '탄맛', '탄 맛', '탄내', '떫', '잡미'],
    scores: { bitterness: 0.95 },
  },
  {
    keywords: ['느끼', '무거워', '텁텁', '진해서 부담'],
    scores: { body: 0.9 },
  },
]

const AXES: (keyof TasteVector)[] = ['acidity', 'sweetness', 'bitterness', 'nutty', 'body', 'aroma', 'decaf']

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function normalizeVector(vector: Partial<TasteVector>): TasteVector {
  return {
    acidity: clamp01(Number(vector.acidity ?? 0)),
    sweetness: clamp01(Number(vector.sweetness ?? 0)),
    bitterness: clamp01(Number(vector.bitterness ?? 0)),
    nutty: clamp01(Number(vector.nutty ?? 0)),
    body: clamp01(Number(vector.body ?? 0)),
    aroma: clamp01(Number(vector.aroma ?? 0)),
    decaf: clamp01(Number(vector.decaf ?? 0)),
  }
}

function sentimentToTasteWeight(sentiment: RecommendationSentiment | null | undefined): number {
  if (sentiment === 'positive') return 1
  if (sentiment === 'neutral') return 0.5
  if (sentiment === 'negative') return 0
  return 0.5
}

function includesKeyword(text: string, keyword: string): boolean {
  return text.includes(keyword.toLowerCase())
}

function applyRule(vector: Partial<TasteVector>, weights: Partial<TasteVector>, rule: KeywordRule, amount: number) {
  for (const axis of AXES) {
    const score = rule.scores[axis]
    if (score == null) continue

    vector[axis] = (vector[axis] ?? 0) + score * amount
    weights[axis] = (weights[axis] ?? 0) + amount
  }
}

export function extractTasteVectorFromReview(reviewText: string, sentiment?: RecommendationSentiment | null): TasteVector | null {
  const text = reviewText.trim().toLowerCase()
  if (!text) return null

  const vector: Partial<TasteVector> = {}
  const weights: Partial<TasteVector> = {}
  const sentimentWeight = Math.max(0.35, sentimentToTasteWeight(sentiment))

  for (const rule of POSITIVE_RULES) {
    if (rule.keywords.some((keyword) => includesKeyword(text, keyword))) {
      applyRule(vector, weights, rule, sentimentWeight)
    }
  }

  for (const rule of NEGATIVE_RULES) {
    if (rule.keywords.some((keyword) => includesKeyword(text, keyword))) {
      applyRule(vector, weights, rule, 0.7)
    }
  }

  if (Object.keys(weights).length === 0) return null

  return normalizeVector(
    AXES.reduce((acc, axis) => {
      const weight = weights[axis] ?? 0
      acc[axis] = weight > 0 ? (vector[axis] ?? 0) / weight : 0
      return acc
    }, {} as Partial<TasteVector>)
  )
}

export function buildMenuTasteVectorsFromReviews(reviews: TasteReviewInput[]): Map<string, TasteVector> {
  const sums = new Map<string, Partial<TasteVector>>()
  const counts = new Map<string, Partial<Record<keyof TasteVector, number>>>()

  for (const review of reviews) {
    const vector = extractTasteVectorFromReview(review.reviewText, review.sentiment)
    if (!vector) continue

    const menuSums = sums.get(review.menuId) ?? {}
    const menuCounts = counts.get(review.menuId) ?? {}

    for (const axis of AXES) {
      if (vector[axis] <= 0) continue

      menuSums[axis] = (menuSums[axis] ?? 0) + vector[axis]
      menuCounts[axis] = (menuCounts[axis] ?? 0) + 1
    }

    sums.set(review.menuId, menuSums)
    counts.set(review.menuId, menuCounts)
  }

  const result = new Map<string, TasteVector>()
  sums.forEach((menuSums, menuId) => {
    const menuCounts = counts.get(menuId) ?? {}
    result.set(
      menuId,
      normalizeVector(
        AXES.reduce((acc, axis) => {
          const count = menuCounts[axis] ?? 0
          acc[axis] = count > 0 ? (menuSums[axis] ?? 0) / count : 0
          return acc
        }, {} as Partial<TasteVector>)
      )
    )
  })

  return result
}
