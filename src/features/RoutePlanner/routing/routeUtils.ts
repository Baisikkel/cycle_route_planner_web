import { length as turfLength } from '@turf/length'
import type { Feature, FeatureCollection, LineString, MultiLineString } from 'geojson'

import type { RouteResponseMetadata, RouteWaypointRequest } from '@api/routing'

import type { LatLon, RouteMetadata, RouteWaypoint, WaypointRole } from './types'

const AVG_SPEED_KMH = 20

export const START_ID = 'start'
export const DESTINATION_ID = 'destination'

export const createWaypoint = (role: WaypointRole, id: string): RouteWaypoint => ({
  id,
  role,
  label: '',
  lat: null,
  lon: null,
  source: 'address',
})

export const createInitialWaypoints = (): RouteWaypoint[] => [
  createWaypoint('start', START_ID),
  createWaypoint('destination', DESTINATION_ID),
]

export const hasPoint = (
  waypoint: RouteWaypoint,
): waypoint is RouteWaypoint & { lat: number; lon: number } =>
  typeof waypoint.lat === 'number' &&
  Number.isFinite(waypoint.lat) &&
  typeof waypoint.lon === 'number' &&
  Number.isFinite(waypoint.lon)

export const toLatLon = (waypoint: RouteWaypoint | undefined): LatLon | null =>
  waypoint && hasPoint(waypoint) ? { lat: waypoint.lat, lon: waypoint.lon } : null

export const getValidRouteWaypoints = (
  startWaypoint: RouteWaypoint | undefined,
  stops: RouteWaypoint[],
  destinationWaypoint: RouteWaypoint | undefined,
): RouteWaypointRequest[] =>
  [startWaypoint, ...stops, destinationWaypoint].reduce<RouteWaypointRequest[]>(
    (routePoints, waypoint) => {
      if (waypoint && hasPoint(waypoint)) {
        routePoints.push({ lat: waypoint.lat, lon: waypoint.lon })
      }
      return routePoints
    },
    [],
  )

export const normalizeServerMetadata = (
  metadata: RouteResponseMetadata | undefined,
): RouteMetadata | null => {
  if (
    !metadata ||
    typeof metadata.distanceMeters !== 'number' ||
    typeof metadata.etaSeconds !== 'number'
  ) {
    return null
  }

  return {
    distanceMeters: Math.round(metadata.distanceMeters),
    etaSeconds: Math.round(metadata.etaSeconds),
    elevationGainMeters: metadata.elevationGainMeters,
    elevationLossMeters: metadata.elevationLossMeters,
  }
}

export const calculateFallbackMetadata = (geojson: FeatureCollection): RouteMetadata | null => {
  const lineFeatures = geojson.features.filter(
    (feature): feature is Feature<LineString | MultiLineString> =>
      feature.type === 'Feature' &&
      (feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString'),
  )

  if (lineFeatures.length === 0) return null

  const distanceKm = lineFeatures.reduce(
    (total, feature) => total + turfLength(feature, { units: 'kilometers' }),
    0,
  )
  const etaSeconds = (distanceKm / AVG_SPEED_KMH) * 3600

  return {
    distanceMeters: Math.round(distanceKm * 1000),
    etaSeconds: Math.round(etaSeconds),
  }
}

export const reorderStopsById = (
  current: RouteWaypoint[],
  activeId: string,
  overId: string,
): RouteWaypoint[] => {
  if (activeId === overId) return current

  const fixedStart = current.find((waypoint) => waypoint.role === 'start')
  const fixedDestination = current.find((waypoint) => waypoint.role === 'destination')
  const currentStops = current.filter((waypoint) => waypoint.role === 'stop')
  const fromIndex = currentStops.findIndex((waypoint) => waypoint.id === activeId)
  const toIndex = currentStops.findIndex((waypoint) => waypoint.id === overId)

  if (fromIndex < 0 || toIndex < 0) return current

  const orderedStops = [...currentStops]
  const [movedStop] = orderedStops.splice(fromIndex, 1)
  if (!movedStop) return current
  orderedStops.splice(toIndex, 0, movedStop)

  return [fixedStart, ...orderedStops, fixedDestination].filter(
    (waypoint): waypoint is RouteWaypoint => Boolean(waypoint),
  )
}
