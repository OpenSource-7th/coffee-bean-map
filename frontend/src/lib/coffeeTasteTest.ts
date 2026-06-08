import type { RecommendationWeights, TasteVector } from './recommendations'

const DEFAULT_TEST_RECOMMENDATION_WEIGHTS: RecommendationWeights = {
  tasteMatch: 0.5,
  similarUser: 0.3,
  sentiment: 0.15,
  popularity: 0.05,
}

export const COFFEE_TASTE_TEST_STORAGE_KEY = 'coffee_taste_test_result'

export interface CoffeeTasteOption {
  label: string
  value: number
}

export interface CoffeeTasteQuestion {
  id: string
  question: string
  options: CoffeeTasteOption[]
}

export type CoffeeTasteAnswers = Record<string, number>

export interface CoffeeTasteTestResult {
  answers: CoffeeTasteAnswers
  vector: TasteVector
  weights: RecommendationWeights
  completedAt: string
}

export const COFFEE_TASTE_QUESTIONS: CoffeeTasteQuestion[] = [
  {
    id: 'acidity',
    question: '커피에서 과일처럼 상큼한 산미가 느껴지는 걸 좋아하나요?',
    options: [
      { label: '매우 싫어요', value: -1 },
      { label: '별로예요', value: -0.5 },
      { label: '상관없어요', value: 0 },
      { label: '좋아해요', value: 0.5 },
      { label: '매우 좋아해요', value: 1 },
    ],
  },
  {
    id: 'sweetness',
    question: '커피에서 자연스러운 단맛이 느껴지는 걸 좋아하나요?',
    options: [
      { label: '싫어요', value: -1 },
      { label: '약하면 괜찮아요', value: -0.5 },
      { label: '상관없어요', value: 0 },
      { label: '좋아해요', value: 0.5 },
      { label: '매우 좋아해요', value: 1 },
    ],
  },
  {
    id: 'bitterness',
    question: '쌉싸름하고 진한 커피를 좋아하나요?',
    options: [
      { label: '매우 싫어요', value: -1 },
      { label: '약한 게 좋아요', value: -0.5 },
      { label: '상관없어요', value: 0 },
      { label: '좋아해요', value: 0.5 },
      { label: '매우 좋아해요', value: 1 },
    ],
  },
  {
    id: 'nutty',
    question: '고소하거나 견과류 같은 맛이 나는 커피를 좋아하나요?',
    options: [
      { label: '싫어요', value: -1 },
      { label: '약간이면 좋아요', value: -0.5 },
      { label: '상관없어요', value: 0 },
      { label: '좋아해요', value: 0.5 },
      { label: '매우 좋아해요', value: 1 },
    ],
  },
  {
    id: 'body',
    question: '커피의 질감은 어떤 쪽을 선호하나요?',
    options: [
      { label: '가볍고 깔끔함', value: -1 },
      { label: '약간 가벼움', value: -0.5 },
      { label: '중간', value: 0 },
      { label: '묵직하고 진함', value: 0.5 },
      { label: '매우 묵직함', value: 1 },
    ],
  },
  {
    id: 'aroma',
    question: '커피를 고를 때 향이 얼마나 중요한가요?',
    options: [
      { label: '신경 안 써요', value: -1 },
      { label: '조금 중요해요', value: -0.5 },
      { label: '보통이에요', value: 0 },
      { label: '중요해요', value: 0.5 },
      { label: '매우 중요해요', value: 1 },
    ],
  },
  {
    id: 'milk',
    question: '블랙커피와 우유가 들어간 커피 중 어느 쪽을 더 좋아하나요?',
    options: [
      { label: '블랙커피', value: -1 },
      { label: '약간 블랙', value: -0.5 },
      { label: '둘 다', value: 0 },
      { label: '약간 라떼', value: 0.5 },
      { label: '라떼류', value: 1 },
    ],
  },
  {
    id: 'exploration',
    question: '새로운 원두나 독특한 메뉴를 시도하는 걸 좋아하나요?',
    options: [
      { label: '익숙한 것만', value: -1 },
      { label: '거의 익숙한 것', value: -0.5 },
      { label: '가끔 시도', value: 0 },
      { label: '자주 시도', value: 0.5 },
      { label: '적극적으로 시도', value: 1 },
    ],
  },
]

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

function answerToScore(value: number | undefined): number {
  return clamp01(((value ?? 0) + 1) / 2)
}

function normalizeWeights(weights: RecommendationWeights): RecommendationWeights {
  const total = weights.tasteMatch + weights.similarUser + weights.sentiment + weights.popularity
  if (total <= 0) return DEFAULT_TEST_RECOMMENDATION_WEIGHTS

  return {
    tasteMatch: weights.tasteMatch / total,
    similarUser: weights.similarUser / total,
    sentiment: weights.sentiment / total,
    popularity: weights.popularity / total,
  }
}

export function buildCoffeeTasteVector(answers: CoffeeTasteAnswers): TasteVector {
  const milk = answers.milk ?? 0
  const exploration = answers.exploration ?? 0

  return normalizeVector({
    acidity: answerToScore(answers.acidity) + Math.max(0, exploration) * 0.08,
    sweetness: answerToScore(answers.sweetness) + Math.max(0, milk) * 0.08,
    bitterness: answerToScore(answers.bitterness) + Math.max(0, -milk) * 0.08,
    nutty: answerToScore(answers.nutty),
    body: answerToScore(answers.body) + Math.max(0, milk) * 0.05,
    aroma: answerToScore(answers.aroma) + Math.max(0, exploration) * 0.06,
    decaf: 0,
  })
}

export function buildCoffeeRecommendationWeights(answers: CoffeeTasteAnswers): RecommendationWeights {
  const tasteAnswerIds = ['acidity', 'sweetness', 'bitterness', 'nutty', 'body', 'aroma']
  const preferenceStrength =
    tasteAnswerIds.reduce((sum, id) => sum + Math.abs(answers[id] ?? 0), 0) / tasteAnswerIds.length
  const explorationScore = answerToScore(answers.exploration)

  return normalizeWeights({
    tasteMatch: 0.45 + preferenceStrength * 0.14,
    similarUser: 0.26 + explorationScore * 0.08,
    sentiment: 0.17,
    popularity: 0.12 - explorationScore * 0.06,
  })
}

export function buildCoffeeTasteTestResult(answers: CoffeeTasteAnswers): CoffeeTasteTestResult {
  return {
    answers,
    vector: buildCoffeeTasteVector(answers),
    weights: buildCoffeeRecommendationWeights(answers),
    completedAt: new Date().toISOString(),
  }
}

export function loadCoffeeTasteTestResult(): CoffeeTasteTestResult | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(COFFEE_TASTE_TEST_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CoffeeTasteTestResult
    return {
      ...parsed,
      vector: normalizeVector(parsed.vector),
      weights: normalizeWeights(parsed.weights),
    }
  } catch {
    return null
  }
}

export function saveCoffeeTasteTestResult(result: CoffeeTasteTestResult) {
  window.localStorage.setItem(COFFEE_TASTE_TEST_STORAGE_KEY, JSON.stringify(result))
}
