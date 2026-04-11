import { length as turfLength } from '@turf/length'
import type { Feature, FeatureCollection } from 'geojson'
import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchRoute } from '@api/routing'

import type { LatLon } from './MapLibre'

// ─── Types ─────────────────────────────────────────────────────────────────────

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
  start: LatLon | null
  end: LatLon | null
  hasStart: boolean
  hasEnd: boolean
  isLoading: boolean
  hasRoute: boolean
  setStart: (point: LatLon | null) => void
  setEnd: (point: LatLon | null) => void
  clearRoute: () => void
  startFetching: () => void
  finishFetching: (route: FeatureCollection, metadata: RouteMetadata) => void
  failFetching: (error: string) => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const AVG_SPEED_KMH = 20

export function useRoute(): RouteContextValue {
  const [route, setRoute] = useState<FeatureCollection | null>(null)
  const [metadata, setMetadata] = useState<RouteMetadata | null>(null)
  const [status, setStatus] = useState<RouteStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [start, setStart] = useState<LatLon | null>(null)
  const [end, setEndRaw] = useState<LatLon | null>(null)

  const clearRoute = useCallback(() => {
    setRoute(null)
    setMetadata(null)
    setStatus('idle')
    setError(null)
    setStart(null)
    setEndRaw(null)
  }, [])

  const finishFetching = useCallback(
    (routeData: FeatureCollection, routeMetadata: RouteMetadata) => {
      setRoute(routeData)
      setMetadata(routeMetadata)
      setStatus('success')
      setError(null)
    },
    [],
  )

  const failFetching = useCallback((errorMessage: string) => {
    setRoute(null)
    setMetadata(null)
    setStatus('error')
    setError(errorMessage)
  }, [])

  // Stashed fetch params; updated by setEnd before the effect runs.
  const fetchParamsRef = useRef<{ start: LatLon; end: LatLon } | null>(null)

  // Tracks in-flight fetch so stale responses are discarded.
  const fetchIdRef = useRef(0)

  // Incremented by setEnd to trigger the effect; avoids calling setState inside an effect.
  const [fetchTrigger, setFetchTrigger] = useState(0)

  useEffect(() => {
    const params = fetchParamsRef.current
    if (!params) return

    const fetchId = ++fetchIdRef.current
    let cancelled = false

    fetchRoute(params.start.lat, params.start.lon, params.end.lat, params.end.lon)
      .then((geojson) => {
        if (cancelled || fetchId !== fetchIdRef.current) return
        const line = geojson.features.find(
          (f): f is Feature => f.type === 'Feature' && f.geometry.type === 'LineString',
        )
        if (!line) {
          failFetching('Invalid route response')
          return
        }
        const distanceKm = turfLength(line, { units: 'kilometers' })
        const etaSeconds = (distanceKm / AVG_SPEED_KMH) * 3600
        finishFetching(geojson, {
          distanceMeters: Math.round(distanceKm * 1000),
          etaSeconds: Math.round(etaSeconds),
        })
      })
      .catch((err) => {
        if (cancelled || fetchId !== fetchIdRef.current) return
        failFetching(err instanceof Error ? err.message : 'Failed to load route')
      })

    return () => {
      cancelled = true
    }
  }, [fetchTrigger, finishFetching, failFetching])

  const setEnd = useCallback(
    (point: LatLon | null) => {
      setEndRaw(point)
      if (point && start) {
        fetchParamsRef.current = { start, end: point }
        setFetchTrigger((n) => n + 1)
      } else {
        fetchParamsRef.current = null
      }
    },
    [start],
  )

  return {
    route,
    metadata,
    status,
    error,
    start,
    end,
    hasStart: start !== null,
    hasEnd: end !== null,
    isLoading: status === 'loading',
    hasRoute: status === 'success' && route !== null,
    setStart,
    setEnd,
    clearRoute,
    startFetching: () => setStatus('loading'),
    finishFetching,
    failFetching,
  }
}
