import { point } from '@turf/helpers'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import type { FeatureCollection, LineString } from 'geojson'
import { useEffect, useRef, useState } from 'react'

type Position = { latitude: number; longitude: number }

// TODO: review if meters and seconds are appropriate for biking and our use case
/** Within this distance the bike is "snapped" onto the route line for clean display. */
const SNAP_LEASH_METERS = 30
/** Beyond this distance the user is considered off-route. */
const OFF_ROUTE_METERS = 50
/** How many seconds the user must stay off-route before auto re-routing fires. */
const OFF_ROUTE_SECONDS = 10

export type RouteTrackingState = {
  /** Where to render the bike — snapped to route when close, raw GPS when far. */
  displayPosition: Position | null
  /** How far the raw GPS is from the nearest point on the route, in meters. */
  distanceFromRoute: number | null
  /** True when user is beyond OFF_ROUTE_METERS from the route. */
  isOffRoute: boolean
  /** True when user has been off-route for OFF_ROUTE_SECONDS — MapLibre triggers re-route. */
  shouldReroute: boolean
}

/**
 * BRouter returns a FeatureCollection (GeoJSON spec's container holding one or more features).
 * This pulls out the first LineString (a series of connected points forming a line; we need this for turf's math)
 * geometry from it, which is the actual route path.
 */
function extractLineString(route: FeatureCollection): LineString | null {
  for (const feature of route.features) {
    if (feature.geometry.type === 'LineString') {
      return feature.geometry as LineString
    }
  }
  return null
}

/**
 * Waze-style "snap with leash" tracking: sometimes location shows smth random,
 * then we snap to route; if user's location off-route for some secs, we reroute
 * automatically.
 *
 * Three zones:
 *  0–30 m : bike displayed on the route line (snapped via Turf.js)
 *  30–50 m: bike displayed at raw GPS (maybe GPS drift, a nearby street)
 *  50 m+  : off-route — after 10 s of staying here, shouldReroute = true
 *
 * Coordinate convention:
 *  - Turf.js point() takes [longitude, latitude] (GeoJSON standard)
 *  - snapped.geometry.coordinates returns [longitude, latitude]
 *  - We convert back to { latitude, longitude } for react-map-gl Marker props
 */
export function useRouteTracking(
  rawPosition: Position | null,
  route: FeatureCollection | null,
): RouteTrackingState {
  const [displayPosition, setDisplayPosition] = useState<Position | null>(null)
  const [distanceFromRoute, setDistanceFromRoute] = useState<number | null>(null)
  const [isOffRoute, setIsOffRoute] = useState(false)
  const [shouldReroute, setShouldReroute] = useState(false)

  /** Timestamp when user first crossed OFF_ROUTE_METERS — used for the 10 s countdown. */
  const offRouteStartRef = useRef<number | null>(null)
  /** Interval that checks if 10 s have passed (fires between GPS updates). */
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /** Runs on every GPS position change — recalculates distance and decides snap vs raw. */
  useEffect(() => {
    // No GPS yet — nothing to show
    if (!rawPosition) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayPosition(null)
      setDistanceFromRoute(null)
      setIsOffRoute(false)
      setShouldReroute(false)
      offRouteStartRef.current = null
      return
    }

    // GPS available but no route — just show bike at real position, no snapping
    if (!route) {
      setDisplayPosition(rawPosition)
      setDistanceFromRoute(null)
      setIsOffRoute(false)
      setShouldReroute(false)
      offRouteStartRef.current = null
      return
    }

    const line = extractLineString(route)
    if (!line) {
      setDisplayPosition(rawPosition)
      setDistanceFromRoute(null)
      return
    }

    // Turf.js: find the closest point on the route to the user's GPS position
    // point() takes [lon, lat] — GeoJSON convention (NOT lat, lon)
    const gpsPoint = point([rawPosition.longitude, rawPosition.latitude])
    const snapped = nearestPointOnLine(line, gpsPoint, { units: 'meters' })
    const dist = snapped.properties.dist ?? 0

    setDistanceFromRoute(dist)

    if (dist < SNAP_LEASH_METERS) {
      // Close to route — snap bike to the route line for clean display
      // coordinates are [lon, lat] in GeoJSON, destructure accordingly
      const [lng, lat] = snapped.geometry.coordinates
      setDisplayPosition({ latitude: lat, longitude: lng })
      setIsOffRoute(false)
      setShouldReroute(false)
      offRouteStartRef.current = null
    } else {
      // Beyond leash — show bike at actual GPS position
      setDisplayPosition(rawPosition)

      if (dist >= OFF_ROUTE_METERS) {
        // User is off-route — start or continue the re-route countdown
        setIsOffRoute(true)
        if (offRouteStartRef.current === null) {
          offRouteStartRef.current = Date.now()
        } else if (Date.now() - offRouteStartRef.current >= OFF_ROUTE_SECONDS * 1000) {
          setShouldReroute(true)
        }
      } else {
        // Between leash and off-route threshold — show real GPS, but don't re-route
        setIsOffRoute(false)
        offRouteStartRef.current = null
      }
    }
  }, [rawPosition, route])

  /**
   * GPS updates aren't continuous — there can be seconds between callbacks.
   * This timer checks every 1 s whether the 10 s off-route window has elapsed,
   * so we don't miss the re-route trigger between two GPS updates.
   */
  useEffect(() => {
    if (!isOffRoute || shouldReroute) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    timerRef.current = setInterval(() => {
      if (
        offRouteStartRef.current &&
        Date.now() - offRouteStartRef.current >= OFF_ROUTE_SECONDS * 1000
      ) {
        setShouldReroute(true)
      }
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isOffRoute, shouldReroute])

  return { displayPosition, distanceFromRoute, isOffRoute, shouldReroute }
}
