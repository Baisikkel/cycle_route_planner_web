/**
 * HTTP client for cycle routing - calls our backend only.
 *
 * Path `/routes/calculate` is relative to `VITE_API_BASE_URL` (see `.env.development`). Example:
 * base `http://localhost:8080/api` + this path -> `http://localhost:8080/api/routes/calculate`.
 */
import type { FeatureCollection } from 'geojson'

import { apiClient } from '../client'

export type RouteWaypointRequest = {
  lat: number
  lon: number
}

export type RouteResponseMetadata = {
  distanceMeters?: number
  etaSeconds?: number
  elevationGainMeters?: number
  elevationLossMeters?: number
}

export type RouteCalculationResult = {
  geojson: FeatureCollection
  metadata?: RouteResponseMetadata
}

type RawRouteCalculationResponse =
  | FeatureCollection
  | {
      route?: FeatureCollection
      geojson?: FeatureCollection
      metadata?: RouteResponseMetadata
      distanceMeters?: number
      etaSeconds?: number
      elevationGainMeters?: number
      elevationLossMeters?: number
    }

const isFeatureCollection = (value: unknown): value is FeatureCollection =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  (value as { type?: unknown }).type === 'FeatureCollection' &&
  'features' in value &&
  Array.isArray((value as { features?: unknown }).features)

const normalizeRouteResponse = (data: RawRouteCalculationResponse): RouteCalculationResult => {
  if (isFeatureCollection(data)) {
    return { geojson: data }
  }

  const geojson = data.geojson ?? data.route
  if (!isFeatureCollection(geojson)) {
    throw new Error('Invalid route response')
  }

  const metadata =
    data.metadata ??
    (typeof data.distanceMeters === 'number' || typeof data.etaSeconds === 'number'
      ? {
          distanceMeters: data.distanceMeters,
          etaSeconds: data.etaSeconds,
          elevationGainMeters: data.elevationGainMeters,
          elevationLossMeters: data.elevationLossMeters,
        }
      : undefined)

  return { geojson, metadata }
}

export async function fetchRouteWaypoints(
  waypoints: RouteWaypointRequest[],
  profile = 'fastbike',
): Promise<RouteCalculationResult> {
  const response = await apiClient.post<RawRouteCalculationResponse>(
    '/routes/calculate',
    { waypoints, profile },
    { timeout: 30000 },
  )
  return normalizeRouteResponse(response.data)
}

export async function fetchRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
): Promise<FeatureCollection> {
  const result = await fetchRouteWaypoints([
    { lat: startLat, lon: startLon },
    { lat: endLat, lon: endLon },
  ])
  return result.geojson
}
