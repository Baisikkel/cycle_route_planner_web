export type LatLon = { lat: number; lon: number }

export type WaypointRole = 'start' | 'stop' | 'destination'

export type WaypointSource = 'gps' | 'address' | 'map'

export type RouteWaypoint = {
  id: string
  role: WaypointRole
  label: string
  lat: number | null
  lon: number | null
  source: WaypointSource
}

export interface RouteMetadata {
  distanceMeters: number
  etaSeconds: number
  elevationGainMeters?: number
  elevationLossMeters?: number
}

export type RouteStatus = 'idle' | 'loading' | 'success' | 'error'
