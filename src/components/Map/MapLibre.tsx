/**
 * Map + cycling route with geolocation tracking.
 *
 * Routing state (start, end, route, metadata) lives in useRoute hook.
 * Geolocation, route tracking, long-press interaction, and markers live here.
 *
 * Interaction (mobile-first, Waze-style):
 *  1. Long-press (400ms hold) on map → popup with start / destination pin choices
 *  2. When both start and destination are set → route auto-calculates via useRoute
 *  3. GPS-granted users: start pre-filled with GPS position (can be overridden via popup)
 *  4. While riding: Waze-style snap-with-leash, auto re-route if off-track
 *  5. Desktop: right-click works as long-press alternative
 *
 * Coordinate convention:
 *  - All named params (latitude/longitude, lat/lon) — never positional arrays
 *  - useRoute/fetchRoute(startLat, startLon, endLat, endLon) matches the Java backend
 *  - The backend converts to BRouter's lon,lat format internally
 */
import bbox from '@turf/bbox'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import Map, { Layer, Marker, NavigationControl, Popup, Source } from 'react-map-gl/maplibre'

import 'maplibre-gl/dist/maplibre-gl.css'
import {
  BikeEmoji,
  LocationPin,
  MapContainer,
  MapFrame,
  MapHint,
  PinDot,
  PinTip,
  PopupChoice,
  PopupContent,
  PopupPinDot,
  PopupPinIcon,
  PopupPinTip,
  WaypointIcon,
  WaypointPinDot,
  WaypointPinTip,
} from './Map.styled'
import { useGeolocation } from './useGeolocation'
import { useRoute } from './useRoute'
import { useRouteTracking } from './useRouteTracking'

const TALLINN_CENTER = {
  latitude: 59.4372,
  longitude: 24.7535,
  zoom: 12,
}

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright'

const LONG_PRESS_MS = 400
const LONG_PRESS_MOVE_THRESHOLD = 10

const START_COLOR = '#16a34a'
const DESTINATION_COLOR = '#dc2626'

export type LatLon = { lat: number; lon: number }

const lineLayerStyle = {
  id: 'route-line',
  type: 'line' as const,
  paint: {
    'line-color': '#dc2626',
    'line-width': 4,
    'line-opacity': 0.9,
  },
  layout: {
    'line-cap': 'round' as const,
    'line-join': 'round' as const,
  },
}

// TODO: review if all hints are accurate based on our flow; might be adjusted later
function getHint(
  permission: string,
  hasRoute: boolean,
  isOffRoute: boolean,
  loading: boolean,
  hasStart: boolean,
): string {
  if (loading) return 'Loading route…'
  if (isOffRoute) return 'You are off route. Re-routing...'
  if (hasRoute) return 'Following your route. Long-press map to plan a new one.'
  if (hasStart && permission !== 'granted') return 'Long-press map to set destination'
  if (permission === 'granted') return 'Long-press map to set destination'
  if (permission === 'prompt')
    return 'Allow location, or long-press map to set start and destination'
  return 'Long-press map to set start and destination'
}

const MapLibre = () => {
  const { permission, position, heading, error: geoError } = useGeolocation()
  const { route, start, end, status, error: routeError, setStart, setEnd, clearRoute } = useRoute()

  const [popupPoint, setPopupPoint] = useState<LatLon | null>(null)
  const [manualStart, setManualStart] = useState(false)
  const [loading, setLoading] = useState(false)

  const { displayPosition, isOffRoute, shouldReroute } = useRouteTracking(position, route)

  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const mapRef = useRef<MapRef>(null)
  const reroutingRef = useRef(false)

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartGeoRef = useRef<LatLon | null>(null)
  const touchStartPointRef = useRef<{ x: number; y: number } | null>(null)

  /**
   * useRoute's setEnd uses a closure over start: calling setStart then setEnd
   * in the same handler means setEnd sees the OLD start. This ref queues a
   * destination so an effect can call setEnd after start has updated.
   */
  const pendingEndRef = useRef<LatLon | null>(null)

  const initialViewState = position
    ? { latitude: position.latitude, longitude: position.longitude, zoom: 14 }
    : TALLINN_CENTER

  // When useRoute finishes (success or error), clear our loading flag
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      reroutingRef.current = false
    }
  }, [status])

  // Zoom to show the full route when it arrives
  useEffect(() => {
    if (!route || !mapRef.current) return
    const [minLng, minLat, maxLng, maxLat] = bbox(route)
    mapRef.current.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 60, duration: 500 },
    )
  }, [route])

  // Deferred setEnd: after setStart updates the closure, trigger the queued fetch
  useEffect(() => {
    if (start && pendingEndRef.current) {
      const dest = pendingEndRef.current
      pendingEndRef.current = null
      setEnd(dest)
    }
  }, [start, setEnd])

  // Auto-set start from GPS when it first becomes available
  useEffect(() => {
    if (position && !start && !manualStart) {
      setStart({ lat: position.latitude, lon: position.longitude })
    }
  }, [position, start, manualStart, setStart])

  // Keep GPS start in sync while no route is active
  useEffect(() => {
    if (position && !route && !manualStart) {
      setStart({ lat: position.latitude, lon: position.longitude })
    }
  }, [position, route, manualStart, setStart])

  // Wake Lock: keep screen on while route is active
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

  // Auto-reroute when off route: reset start to current GPS, re-queue destination
  useEffect(() => {
    if (!shouldReroute || !position || !end || reroutingRef.current) return
    reroutingRef.current = true

    const dest = { lat: end.lat, lon: end.lon }
    clearRoute()
    setStart({ lat: position.latitude, lon: position.longitude })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setManualStart(false)
    setLoading(true)
    pendingEndRef.current = dest
  }, [shouldReroute, position, end, clearRoute, setStart])

  const handleSetStart = useCallback(() => {
    if (!popupPoint) return
    const prevEnd = end
    clearRoute()
    setStart(popupPoint)
    setManualStart(true)
    setPopupPoint(null)

    if (prevEnd) {
      setLoading(true)
      pendingEndRef.current = prevEnd
    }
  }, [popupPoint, end, clearRoute, setStart])

  const handleSetDestination = useCallback(() => {
    if (!popupPoint) return
    setPopupPoint(null)
    setLoading(true)

    if (!start && position && !manualStart) {
      setStart({ lat: position.latitude, lon: position.longitude })
      pendingEndRef.current = popupPoint
    } else {
      setEnd(popupPoint)
    }
  }, [popupPoint, position, manualStart, start, setStart, setEnd])

  /** Store lat/lon, center map on it, show popup. */
  const openPopup = useCallback((point: LatLon) => {
    setPopupPoint(point)
    mapRef.current?.flyTo({ center: [point.lon, point.lat], duration: 300 })
  }, [])

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    touchStartGeoRef.current = null
    touchStartPointRef.current = null
  }, [])

  /**
   * Long-press detection via MapLibre's own event system.
   * MapLibre provides lngLat directly — no manual unproject or getBoundingClientRect.
   * These callbacks are registered through map.on(), not DOM events,
   * so they don't interfere with MapLibre's internal pinch-zoom handling.
   */
  const onMapTouchStart = useCallback(
    (e: {
      lngLat: { lat: number; lng: number }
      point: { x: number; y: number }
      originalEvent: TouchEvent
    }) => {
      if (e.originalEvent.touches.length !== 1) {
        cancelLongPress()
        return
      }
      const geo = { lat: e.lngLat.lat, lon: e.lngLat.lng }
      touchStartGeoRef.current = geo
      touchStartPointRef.current = { x: e.point.x, y: e.point.y }

      longPressTimerRef.current = setTimeout(() => {
        if (touchStartGeoRef.current) openPopup(touchStartGeoRef.current)
        longPressTimerRef.current = null
      }, LONG_PRESS_MS)
    },
    [openPopup, cancelLongPress],
  )

  const onMapTouchMove = useCallback(
    (e: { point: { x: number; y: number }; originalEvent: TouchEvent }) => {
      if (e.originalEvent.touches.length !== 1) {
        cancelLongPress()
        return
      }
      if (!touchStartPointRef.current) return
      const dx = e.point.x - touchStartPointRef.current.x
      const dy = e.point.y - touchStartPointRef.current.y
      if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_MOVE_THRESHOLD) cancelLongPress()
    },
    [cancelLongPress],
  )

  const onMapTouchEnd = useCallback(() => {
    cancelLongPress()
  }, [cancelLongPress])

  /** Right-click: MapLibre gives us lngLat directly. */
  const onMapContextMenu = useCallback(
    (e: { lngLat: { lat: number; lng: number }; originalEvent: Event }) => {
      e.originalEvent.preventDefault()
      openPopup({ lat: e.lngLat.lat, lon: e.lngLat.lng })
    },
    [openPopup],
  )

  const closePopup = useCallback(() => setPopupPoint(null), [])

  const onMapClick = useCallback(() => {
    if (popupPoint) closePopup()
  }, [popupPoint, closePopup])

  useEffect(() => {
    if (!popupPoint) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePopup()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [popupPoint, closePopup])

  const hint = getHint(permission, !!route, isOffRoute && !shouldReroute, loading, !!start)
  const errorHint = geoError && !position ? ` — ${geoError}` : ''
  const markerPos = displayPosition ?? position

  return (
    <MapContainer>
      <MapHint>
        {hint}
        {routeError ? ` — ${routeError}` : errorHint}
      </MapHint>
      <MapFrame>
        <Map
          ref={mapRef}
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAP_STYLE}
          initialViewState={initialViewState}
          onClick={onMapClick}
          onContextMenu={onMapContextMenu}
          onTouchStart={onMapTouchStart}
          onTouchMove={onMapTouchMove}
          onTouchEnd={onMapTouchEnd}
        >
          <NavigationControl position="top-right" />

          {markerPos && (
            <Marker latitude={markerPos.latitude} longitude={markerPos.longitude} anchor="bottom">
              <LocationPin>
                <PinDot>
                  <BikeEmoji $heading={heading}>🚲</BikeEmoji>
                </PinDot>
                <PinTip />
              </LocationPin>
            </Marker>
          )}

          {start && manualStart && (
            <Marker latitude={start.lat} longitude={start.lon} anchor="bottom">
              <LocationPin>
                <WaypointPinDot $color={START_COLOR}>
                  <WaypointIcon>🟢</WaypointIcon>
                </WaypointPinDot>
                <WaypointPinTip $color={START_COLOR} />
              </LocationPin>
            </Marker>
          )}

          {end && (
            <Marker latitude={end.lat} longitude={end.lon} anchor="bottom">
              <LocationPin>
                <WaypointPinDot $color={DESTINATION_COLOR}>
                  <WaypointIcon>🏁</WaypointIcon>
                </WaypointPinDot>
                <WaypointPinTip $color={DESTINATION_COLOR} />
              </LocationPin>
            </Marker>
          )}

          {popupPoint && (
            <Popup
              latitude={popupPoint.lat}
              longitude={popupPoint.lon}
              anchor="bottom"
              closeButton={false}
              closeOnClick={false}
              onClose={closePopup}
            >
              <PopupContent>
                <PopupChoice $color={START_COLOR} onClick={handleSetStart} title="Set as start">
                  <PopupPinDot $color={START_COLOR}>
                    <PopupPinIcon>🟢</PopupPinIcon>
                  </PopupPinDot>
                  <PopupPinTip $color={START_COLOR} />
                </PopupChoice>
                <PopupChoice
                  $color={DESTINATION_COLOR}
                  onClick={handleSetDestination}
                  title="Set as destination"
                >
                  <PopupPinDot $color={DESTINATION_COLOR}>
                    <PopupPinIcon>🏁</PopupPinIcon>
                  </PopupPinDot>
                  <PopupPinTip $color={DESTINATION_COLOR} />
                </PopupChoice>
              </PopupContent>
            </Popup>
          )}

          {route && (
            <Source id="cycle-route" type="geojson" data={route}>
              <Layer {...lineLayerStyle} />
            </Source>
          )}
        </Map>
      </MapFrame>
    </MapContainer>
  )
}

export default MapLibre
