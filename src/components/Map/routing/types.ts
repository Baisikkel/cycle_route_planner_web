import type { FeatureCollection } from 'geojson'

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

export type RouteContextValue = {
  route: FeatureCollection | null
  metadata: RouteMetadata | null
  status: RouteStatus
  error: string | null
  waypoints: RouteWaypoint[]
  start: LatLon | null
  end: LatLon | null
  stops: RouteWaypoint[]
  hasStart: boolean
  hasEnd: boolean
  isLoading: boolean
  hasRoute: boolean
  setStart: (point: LatLon | null, label?: string, source?: WaypointSource) => void
  setEnd: (point: LatLon | null, label?: string, source?: WaypointSource) => void
  setWaypointAddress: (
    waypointId: string,
    point: LatLon,
    label: string,
    source?: WaypointSource,
  ) => void
  clearWaypoint: (waypointId: string) => void
  addStop: () => void
  removeStop: (waypointId: string) => void
  moveStop: (waypointId: string, direction: 'up' | 'down') => void
  reorderStops: (activeId: string, overId: string) => void
  clearRoute: () => void
  startFetching: () => void
  finishFetching: (route: FeatureCollection, metadata: RouteMetadata) => void
  failFetching: (error: string) => void
}
