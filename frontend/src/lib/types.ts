export interface Cafe {
  id: string
  name: string
  address: string | null
  lat: number
  lng: number
  menu_tags: string[]
  created_at: string
}

export interface MapCenter {
  lat: number
  lng: number
}

export type AIAnalyzeStatus = 'valid' | 'invalid'

export interface AIAnalyzeResponse {
  status: AIAnalyzeStatus
  confidence_score?: number
  latency_ms?: number
  reason?: string
  message?: string
}

export interface Profile {
  id: string
  email: string
  created_at: string
  updated_at: string
}
