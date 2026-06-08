export interface Cafe {
  id: string
  name: string
  address: string | null
  lat: number
  lng: number
  created_at: string
}

export interface MapCenter {
  lat: number
  lng: number
}

export type AIAnalyzeSentiment = 'positive' | 'neutral' | 'negative'
export type AIAnalyzeStatus = 'success' | 'error'

export interface AIAnalyzeResponse {
  status: AIAnalyzeStatus
  sentiment: AIAnalyzeSentiment
  confidence: number
  menu_relevance: number
  latency_ms: number
}

export interface Profile {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface Menu {
  id: string
  cafe_id: string
  menu_name: string
  is_verified: boolean
  created_at: string
}

export interface MenuScore {
  id: string
  cafe_id: string
  menu_id: string
  positive_count: number
  neutral_count: number
  negative_count: number
  weighted_score: number | null
  bayesian_score: number | null
  is_signature: boolean
  updated_at: string
}

export interface UserTasteProfile {
  user_id: string
  acidity: number
  sweetness: number
  bitterness: number
  nutty: number
  body: number
  aroma: number
  decaf: number
  taste_match_weight: number
  similar_user_weight: number
  sentiment_weight: number
  popularity_weight: number
  created_at: string
  updated_at: string
}

export interface MenuTasteProfile {
  menu_id: string
  cafe_id: string
  acidity_score: number
  sweetness_score: number
  bitterness_score: number
  nutty_score: number
  body_score: number
  aroma_score: number
  decaf_score: number
  created_at: string
  updated_at: string
}

export interface PendingReview {
  id: string
  cafeId: string
  userId: string
  menuId: string
  reviewText: string
  savedAt: string
}
