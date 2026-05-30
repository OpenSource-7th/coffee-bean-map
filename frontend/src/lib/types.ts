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

export interface PendingReview {
  id: string
  cafeId: string
  userId: string
  menuId: string
  reviewText: string
  savedAt: string
}
