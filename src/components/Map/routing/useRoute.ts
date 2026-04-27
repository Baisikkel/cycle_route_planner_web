import type { FeatureCollection } from 'geojson'
import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchRouteWaypoints, type RouteWaypointRequest } from '@api/routing'

import {
  calculateFallbackMetadata,
  createInitialWaypoints,
  createWaypoint,
  getValidRouteWaypoints,
  normalizeServerMetadata,
  reorderStopsById,
  toLatLon,
} from './routeUtils'
import type {
  LatLon,
  RouteContextValue,
  RouteMetadata,
  RouteStatus,
  RouteWaypoint,
  WaypointRole,
  WaypointSource,
} from './types'

const PROFILE = 'fastbike'

export function useRoute(): RouteContextValue {
  const [route, setRoute] = useState<FeatureCollection | null>(null)
  const [metadata, setMetadata] = useState<RouteMetadata | null>(null)
  const [status, setStatus] = useState<RouteStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>(createInitialWaypoints)

  const stopCounterRef = useRef(0)
  const fetchIdRef = useRef(0)

  const startWaypoint = waypoints.find((waypoint) => waypoint.role === 'start')
  const destinationWaypoint = waypoints.find((waypoint) => waypoint.role === 'destination')
  const stops = waypoints.filter((waypoint) => waypoint.role === 'stop')
  const start = toLatLon(startWaypoint)
  const end = toLatLon(destinationWaypoint)
  const routeSignature =
    start && end
      ? JSON.stringify(getValidRouteWaypoints(startWaypoint, stops, destinationWaypoint))
      : ''

  const clearRoute = useCallback(() => {
    setRoute(null)
    setMetadata(null)
    setStatus('idle')
    setError(null)
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

  useEffect(() => {
    if (!routeSignature) return

    const routeWaypoints = JSON.parse(routeSignature) as RouteWaypointRequest[]
    if (routeWaypoints.length < 2) return

    const fetchId = ++fetchIdRef.current
    let cancelled = false

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('loading')
    setError(null)

    fetchRouteWaypoints(routeWaypoints, PROFILE)
      .then(({ geojson, metadata: serverMetadata }) => {
        if (cancelled || fetchId !== fetchIdRef.current) return

        const routeMetadata =
          normalizeServerMetadata(serverMetadata) ?? calculateFallbackMetadata(geojson)

        if (!routeMetadata) {
          failFetching('Invalid route response')
          return
        }

        finishFetching(geojson, routeMetadata)
      })
      .catch((err: unknown) => {
        if (cancelled || fetchId !== fetchIdRef.current) return
        failFetching(err instanceof Error ? err.message : 'Failed to load route')
      })

    return () => {
      cancelled = true
    }
  }, [failFetching, finishFetching, routeSignature])

  const updateEndpoint = useCallback(
    (
      role: Extract<WaypointRole, 'start' | 'destination'>,
      point: LatLon | null,
      label = '',
      source: WaypointSource = 'map',
    ) => {
      if (!point) clearRoute()

      setWaypoints((current) =>
        current.map((waypoint) =>
          waypoint.role === role
            ? {
                ...waypoint,
                label: point ? label : '',
                lat: point?.lat ?? null,
                lon: point?.lon ?? null,
                source: point ? source : 'address',
              }
            : waypoint,
        ),
      )
    },
    [clearRoute],
  )

  const setStart = useCallback(
    (point: LatLon | null, label?: string, source?: WaypointSource) => {
      updateEndpoint('start', point, label, source)
    },
    [updateEndpoint],
  )

  const setEnd = useCallback(
    (point: LatLon | null, label?: string, source?: WaypointSource) => {
      updateEndpoint('destination', point, label, source)
    },
    [updateEndpoint],
  )

  const setWaypointAddress = useCallback(
    (waypointId: string, point: LatLon, label: string, source: WaypointSource = 'address') => {
      setWaypoints((current) =>
        current.map((waypoint) =>
          waypoint.id === waypointId
            ? {
                ...waypoint,
                label,
                lat: point.lat,
                lon: point.lon,
                source,
              }
            : waypoint,
        ),
      )
    },
    [],
  )

  const clearWaypoint = useCallback(
    (waypointId: string) => {
      const waypoint = waypoints.find((item) => item.id === waypointId)
      if (waypoint?.role === 'start' || waypoint?.role === 'destination') {
        clearRoute()
      }

      setWaypoints((current) =>
        current.map((item) =>
          item.id === waypointId
            ? { ...item, label: '', lat: null, lon: null, source: 'address' }
            : item,
        ),
      )
    },
    [clearRoute, waypoints],
  )

  const addStop = useCallback(() => {
    stopCounterRef.current += 1
    const stop = createWaypoint('stop', `stop-${Date.now()}-${stopCounterRef.current}`)

    setWaypoints((current) => {
      const destinationIndex = current.findIndex((waypoint) => waypoint.role === 'destination')
      if (destinationIndex < 0) return [...current, stop]

      return [...current.slice(0, destinationIndex), stop, ...current.slice(destinationIndex)]
    })
  }, [])

  const removeStop = useCallback((waypointId: string) => {
    setWaypoints((current) =>
      current.filter((waypoint) => waypoint.role !== 'stop' || waypoint.id !== waypointId),
    )
  }, [])

  const reorderStops = useCallback((activeId: string, overId: string) => {
    setWaypoints((current) => reorderStopsById(current, activeId, overId))
  }, [])

  const moveStop = useCallback(
    (waypointId: string, direction: 'up' | 'down') => {
      const currentStops = waypoints.filter((waypoint) => waypoint.role === 'stop')
      const currentIndex = currentStops.findIndex((waypoint) => waypoint.id === waypointId)
      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      const overWaypoint = currentStops[nextIndex]

      if (!overWaypoint) return
      reorderStops(waypointId, overWaypoint.id)
    },
    [reorderStops, waypoints],
  )

  return {
    route,
    metadata,
    status,
    error,
    waypoints,
    start,
    end,
    stops,
    hasStart: start !== null,
    hasEnd: end !== null,
    isLoading: status === 'loading',
    hasRoute: status === 'success' && route !== null,
    setStart,
    setEnd,
    setWaypointAddress,
    clearWaypoint,
    addStop,
    removeStop,
    moveStop,
    reorderStops,
    clearRoute,
    startFetching: () => setStatus('loading'),
    finishFetching,
    failFetching,
  }
}
