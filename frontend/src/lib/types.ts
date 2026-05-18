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
