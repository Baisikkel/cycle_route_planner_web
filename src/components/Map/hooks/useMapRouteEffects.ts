import bbox from '@turf/bbox'
import type { FeatureCollection } from 'geojson'
import { useEffect, useRef, type RefObject } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'

import type { LatLon, RouteStatus, WaypointSource } from '../useRoute'

type Position = { latitude: number; longitude: number }

type UseMapRouteEffectsOptions = {
  clearRoute: () => void
  end: LatLon | null
  isNavigating: boolean
  mapRef: RefObject<MapRef | null>
  position: Position | null
  route: FeatureCollection | null
  setPanelCollapsed: (collapsed: boolean) => void
  setStart: (point: LatLon | null, label?: string, source?: WaypointSource) => void
  shouldReroute: boolean
  status: RouteStatus
  t: (key: string) => string
}

export function useMapRouteEffects({
  clearRoute,
  end,
  isNavigating,
  mapRef,
  position,
  route,
  setPanelCollapsed,
  setStart,
  shouldReroute,
  status,
  t,
}: UseMapRouteEffectsOptions) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const reroutingRef = useRef(false)

  useEffect(() => {
    if (status === 'success' || status === 'loading') {
      setPanelCollapsed(false)
    }
  }, [setPanelCollapsed, status])

  useEffect(() => {
    if (status === 'success' || status === 'error') {
      reroutingRef.current = false
    }
  }, [status])

  useEffect(() => {
    if (!route || !mapRef.current || isNavigating) return
    const timer = setTimeout(() => {
      if (!mapRef.current) return
      const [minLng, minLat, maxLng, maxLat] = bbox(route)
      mapRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 60, duration: 500 },
      )
    }, 400)
    return () => clearTimeout(timer)
  }, [isNavigating, mapRef, route])

  useEffect(() => {
    if (!route) {
      wakeLockRef.current?.release()
      wakeLockRef.current = null
      return
    }

    const acquireWakeLock = () => {
      navigator.wakeLock
        ?.request('screen')
        .then((lock) => {
          wakeLockRef.current = lock
        })
        .catch(() => {})
    }

    acquireWakeLock()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquireWakeLock()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      wakeLockRef.current?.release()
      wakeLockRef.current = null
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [route])

  useEffect(() => {
    if (!shouldReroute || !position || !end || reroutingRef.current) return
    reroutingRef.current = true

    clearRoute()
    setStart({ lat: position.latitude, lon: position.longitude }, t('Current location'), 'gps')
  }, [clearRoute, end, position, setStart, shouldReroute, t])
}
