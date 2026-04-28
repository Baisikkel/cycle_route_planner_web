import { useEffect, useMemo, useRef } from 'react'

import { fetchRouteWaypoints, type RouteWaypointRequest } from '@api/routing'

import {
  selectDestinationWaypoint,
  selectStartWaypoint,
  useRouteStore,
} from '../routing/routeStore'
import {
  calculateFallbackMetadata,
  getValidRouteWaypoints,
  normalizeServerMetadata,
} from '../routing/routeUtils'

const PROFILE = 'fastbike'

export function useRouteCalculation() {
  const startWaypoint = useRouteStore(selectStartWaypoint)
  const destinationWaypoint = useRouteStore(selectDestinationWaypoint)
  const waypoints = useRouteStore((state) => state.waypoints)
  const startFetching = useRouteStore((state) => state.startFetching)
  const finishFetching = useRouteStore((state) => state.finishFetching)
  const failFetching = useRouteStore((state) => state.failFetching)
  const fetchIdRef = useRef(0)

  const routeSignature = useMemo(() => {
    if (!startWaypoint || !destinationWaypoint) return ''

    const stops = waypoints.filter((waypoint) => waypoint.role === 'stop')
    return JSON.stringify(getValidRouteWaypoints(startWaypoint, stops, destinationWaypoint))
  }, [destinationWaypoint, startWaypoint, waypoints])

  useEffect(() => {
    if (!routeSignature) return

    const routeWaypoints = JSON.parse(routeSignature) as RouteWaypointRequest[]
    if (routeWaypoints.length < 2) return

    const fetchId = ++fetchIdRef.current
    let cancelled = false

    startFetching()

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
  }, [failFetching, finishFetching, routeSignature, startFetching])
}
