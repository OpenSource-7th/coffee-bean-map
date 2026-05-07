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
