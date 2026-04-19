/**
 * Map + cycling route with geolocation tracking and active navigation mode.
 *
 * Routing state (start, end, route, metadata) lives in useRoute hook.
 * Navigation mode (fullscreen, map following, bearing rotation) lives in useNavigationMode hook.
 * Geolocation, route tracking, long-press interaction, and markers live here.
 *
 * Two modes:
 *  1. Planning mode (default): browse map, long-press to set start/destination, view route.
 *     This is the original behavior — everything before "Let's ride".
 *  2. Navigation mode: fullscreen map follows user, rotates with heading, shows ride controls.
 *     Entered by tapping "Let's ride" when a route is ready.
 *
 * Interaction (mobile-first, Waze-style):
 *  1. Long-press (400ms hold) on map → popup with start / destination pin choices
 *  2. When both start and destination are set → route auto-calculates via useRoute
 *  3. GPS-granted users: start pre-filled with GPS position (can be overridden via popup)
 *  4. While riding: Waze-style snap-with-leash, auto re-route if off-track
 *  5. Desktop: right-click works as long-press alternative
 *  6. Long-press works in both planning and navigation mode
 *
 * Coordinate convention:
 *  - All named params (latitude/longitude, lat/lon) — never positional arrays
 *  - useRoute/fetchRoute(startLat, startLon, endLat, endLon) matches the Java backend
 *  - The backend converts to BRouter's lon,lat format internally
 */
import bbox from '@turf/bbox'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MapRef, ViewStateChangeEvent } from 'react-map-gl/maplibre'
import Map, { Layer, Marker, NavigationControl, Popup, Source } from 'react-map-gl/maplibre'

import { PreviewPanel } from '@components/PreviewPanel'
import { useAppTranslation } from '@lib/i18n'

import { ActiveRide, LetsRide } from './ActiveRide'
import {
  BikeEmoji,
  LocationPin,
  MapContainer,
  MapFrame,
  MapHint,
  NavigationArrowOverlay,
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
import { formatDistance, formatETA } from './routeFormatters'
import { useGeolocation } from './useGeolocation'
import { useNavigationMode } from './useNavigationMode'
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
    'line-color': '#2563eb',
    'line-width': 4,
    'line-opacity': 0.9,
  },
  layout: {
    'line-cap': 'round' as const,
    'line-join': 'round' as const,
  },
}

/**
 * Returns contextual hint text for the map overlay (shown in planning mode only).
 * Each hint guides the user through the route-planning flow.
 *
 * @param t — i18n translation function for all user-facing strings
 */
function getHint(
  t: (key: string) => string,
  permission: string,
  hasRoute: boolean,
  isOffRoute: boolean,
  loading: boolean,
  hasStart: boolean,
): string {
  if (loading) return t('Loading route…')
  if (isOffRoute) return t('You are off route. Re-routing…')
  if (hasRoute) return t('Following your route. Long-press map to plan a new one.')
  if (hasStart && permission !== 'granted') return t('Long-press map to set destination')
  if (permission === 'granted') return t('Long-press map to set destination')
  if (permission === 'prompt')
    return t('Allow location, or long-press map to set start and destination')
  return t('Long-press map to set start and destination')
}

/**
 * Navigation arrow SVG — the large white chevron shown as a fixed overlay at the
 * bottom-center of the screen during navigation mode. Points upward and rotates
 * with GPS heading to show the direction of travel.
 */
function NavigationArrowSvg() {
  return (
    <svg width="60" height="60" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M24 4L38 40L24 32L10 40L24 4Z"
        fill="white"
        stroke="#1e293b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const MapLibre = () => {
  const { t } = useAppTranslation()
  const { permission, position, heading, error: geoError } = useGeolocation()
  const {
    route,
    start,
    end,
    metadata,
    status,
    error: routeError,
    setStart,
    setEnd,
    clearRoute,
    startFetching,
    isLoading,
  } = useRoute()

  const [popupPoint, setPopupPoint] = useState<LatLon | null>(null)
  // const [manualStart, setManualStart] = useState(false)
  // const [loading, setLoading] = useState(false)

  // const { displayPosition, isOffRoute, shouldReroute } = useRouteTracking(position, route)
  const [panelCollapsed, setPanelCollapsed] = useState(false)

  // Reset panel collapsed state when route loads
  useEffect(() => {
    if (status === 'success' || status === 'loading') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPanelCollapsed(false)
    }
  }, [status])

  const [userSetStartManually, setUserSetStartManually] = useState(false)

  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const mapRef = useRef<MapRef>(null)
  const reroutingRef = useRef(false)

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartGeoRef = useRef<LatLon | null>(null)
  const touchStartPointRef = useRef<{ x: number; y: number } | null>(null)

  /**
   * Why this ref is needed: useRoute's setEnd() captures `start` in a closure.
   * If we call setStart() then setEnd() in the same event handler, setEnd() still
   * sees the OLD start value (before the re-render). This causes the route fetch
   * to use stale coordinates.
   *
   * Solution: store the destination here temporarily. A useEffect watches for
   * `start` to update, then calls setEnd() with the queued destination — at that
   * point the closure has the correct start value.
   */
  const pendingEndRef = useRef<LatLon | null>(null)

  /**
   * Navigation mode hook — manages fullscreen, map following, and bearing rotation.
   * See useNavigationMode.ts for the full implementation.
   */
  const {
    isNavigating,
    autoFollow,
    startRide,
    stopRide,
    recenter,
    handleUserInteraction,
    showRouteOverview,
  } = useNavigationMode(mapRef, position, heading, route)

  // Pass isNavigating so rerouting is immediate during active ride, 10s delay otherwise
  const { displayPosition, isOffRoute, shouldReroute } = useRouteTracking(
    position,
    route,
    isNavigating,
  )

  const initialViewState = position
    ? { latitude: position.latitude, longitude: position.longitude, zoom: 14 }
    : TALLINN_CENTER

  // Reset the rerouting guard when a route fetch completes
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      reroutingRef.current = false
    }
  }, [status])

  /**
   * When a new route arrives, or when exiting navigation mode, zoom out to
   * show the full route on screen. Skipped during navigation because
   * useNavigationMode controls the map view instead.
   *
   * The 400ms delay lets the map container finish resizing (100vh → 75vh)
   * when exiting navigation, so fitBounds calculates for the correct viewport.
   */
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
  }, [route, isNavigating])

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
    if (position && !start && !userSetStartManually) {
      setStart({ lat: position.latitude, lon: position.longitude })
    }
  }, [position, start, userSetStartManually, setStart])

  // Keep GPS start in sync while no route is active
  useEffect(() => {
    if (position && !route && !userSetStartManually) {
      setStart({ lat: position.latitude, lon: position.longitude })
    }
  }, [position, route, userSetStartManually, setStart])

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

  /**
   * Auto-reroute: when useRouteTracking determines the user has been off-route
   * (>50m from route for >10s), it sets shouldReroute=true. This effect reacts
   * by clearing the old route, setting the current GPS as the new start, and
   * re-fetching a route to the same destination.
   *
   * The distance/time thresholds and snap-to-route logic all live in
   * useRouteTracking — this effect only handles the "what to do about it" part.
   * reroutingRef prevents this from firing multiple times for the same off-route event.
   */
  useEffect(() => {
    if (!shouldReroute || !position || !end || reroutingRef.current) return
    reroutingRef.current = true

    const destination = { lat: end.lat, lon: end.lon }
    clearRoute()
    setStart({ lat: position.latitude, lon: position.longitude })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserSetStartManually(false)
    startFetching()
    pendingEndRef.current = destination
  }, [shouldReroute, position, end, clearRoute, setStart, startFetching])

  const handleSetStart = useCallback(() => {
    if (!popupPoint) return
    const existingDestination = end
    clearRoute()
    setStart(popupPoint)
    setUserSetStartManually(true)
    setPopupPoint(null)

    // If a destination was already set, re-fetch the route with the new start point
    if (existingDestination) {
      startFetching()
      pendingEndRef.current = existingDestination
    }
  }, [popupPoint, end, clearRoute, setStart, startFetching])

  const handleSetDestination = useCallback(() => {
    if (!popupPoint) return
    setPopupPoint(null)
    startFetching()

    if (!start && position && !userSetStartManually) {
      setStart({ lat: position.latitude, lon: position.longitude })
      pendingEndRef.current = popupPoint
    } else {
      clearRoute()
      setEnd(popupPoint)
    }
  }, [
    popupPoint,
    position,
    start,
    setStart,
    setEnd,
    clearRoute,
    userSetStartManually,
    startFetching,
  ])

  /** Store lat/lon and show popup at that position. No map movement. */
  const openPopup = useCallback((point: LatLon) => {
    setPopupPoint(point)
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

  /**
   * Detect user-initiated map gestures (pan, pinch-zoom) during navigation mode.
   * When the user manually moves the map, we pause auto-follow so they can explore.
   * They can re-enable following by tapping the "recenter" button.
   *
   * How it works: react-map-gl's onMoveStart fires for both user gestures and
   * programmatic moves (easeTo/flyTo). User gestures have an originalEvent
   * (TouchEvent/MouseEvent), programmatic moves don't. We only pause on user gestures.
   */
  const onMapMoveStart = useCallback(
    (e: ViewStateChangeEvent) => {
      if (isNavigating && e.originalEvent) {
        handleUserInteraction()
      }
    },
    [isNavigating, handleUserInteraction],
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

  const hint = getHint(t, permission, !!route, isOffRoute && !shouldReroute, isLoading, !!start)
  const errorHint = geoError && !position ? ` — ${geoError}` : ''
  const markerPos = displayPosition ?? position

  /** Whether the route is ready and the user hasn't entered navigation yet. */
  const showLetsRide = !!route && status === 'success' && !isNavigating

  /**
   * In navigation mode with autoFollow off (user panned away), we still show a small
   * blue dot at the user's GPS position so they can find themselves on the map.
   * When autoFollow is on, the fixed arrow overlay shows the position instead.
   */
  const showGpsDotInNavigation = isNavigating && !autoFollow && markerPos

  return (
    <MapContainer $navigationActive={isNavigating}>
      {/* Planning mode hint — hidden during navigation (ActiveRide panels replace it) */}
      {!isNavigating && (
        <MapHint>
          {hint}
          {routeError ? ` — ${routeError}` : errorHint}
        </MapHint>
      )}
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
          onMoveStart={onMapMoveStart}
        >
          {/* Zoom controls — hidden in navigation mode (map follows user instead) */}
          {!isNavigating && <NavigationControl position="top-right" />}

          {/* Planning mode: bike emoji pin at user position */}
          {!isNavigating && markerPos && (
            <Marker latitude={markerPos.latitude} longitude={markerPos.longitude} anchor="bottom">
              <LocationPin>
                <PinDot>
                  <BikeEmoji $heading={heading}>🚲</BikeEmoji>
                </PinDot>
                <PinTip />
              </LocationPin>
            </Marker>
          )}

          {/*
           * Navigation mode with auto-follow off: show a small blue dot at GPS position
           * so the user can locate themselves on the map after panning away.
           */}
          {showGpsDotInNavigation && (
            <Marker latitude={markerPos.latitude} longitude={markerPos.longitude} anchor="center">
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#2563eb',
                  border: '2px solid white',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }}
              />
            </Marker>
          )}

          {/* Start waypoint pin — only in planning mode when manually set */}
          {!isNavigating && start && userSetStartManually && (
            <Marker latitude={start.lat} longitude={start.lon} anchor="bottom">
              <LocationPin>
                <WaypointPinDot $color={START_COLOR}>
                  <WaypointIcon>🟢</WaypointIcon>
                </WaypointPinDot>
                <WaypointPinTip $color={START_COLOR} />
              </LocationPin>
            </Marker>
          )}

          {/*
           * Destination waypoint pin — shown in planning mode always,
           * and in navigation mode when auto-follow is off (route overview)
           * so the user can see where the route ends.
           */}
          {end && (!isNavigating || !autoFollow) && (
            <Marker latitude={end.lat} longitude={end.lon} anchor="bottom">
              <LocationPin>
                <WaypointPinDot $color={DESTINATION_COLOR}>
                  <WaypointIcon>🏁</WaypointIcon>
                </WaypointPinDot>
                <WaypointPinTip $color={DESTINATION_COLOR} />
              </LocationPin>
            </Marker>
          )}

          {/* Long-press popup — works in both planning and navigation mode */}
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
                <PopupChoice
                  $color={START_COLOR}
                  onClick={handleSetStart}
                  title={t('Set as start')}
                  aria-label={t('Set as start')}
                >
                  <PopupPinDot $color={START_COLOR}>
                    <PopupPinIcon>🟢</PopupPinIcon>
                  </PopupPinDot>
                  <PopupPinTip $color={START_COLOR} />
                </PopupChoice>
                <PopupChoice
                  $color={DESTINATION_COLOR}
                  onClick={handleSetDestination}
                  title={t('Set as destination')}
                  aria-label={t('Set as destination')}
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

        {/* Spinning bike indicator — shown during rerouting in navigation mode */}
        {isNavigating && isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '45%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 15,
              fontSize: '2rem',
              animation: 'spin 1s linear infinite',
            }}
          >
            🚲
            <style>{`@keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }`}</style>
          </div>
        )}

        {/*
         * Navigation arrow — fixed overlay at bottom-center of screen.
         * NOT a map marker: stays at a fixed screen position while the map moves underneath.
         * The map center is offset via easeTo({ padding }) in useNavigationMode so the user's
         * GPS position aligns with this arrow's position on screen.
         * Only visible when auto-follow is active (hidden when user pans away).
         */}
        {isNavigating && autoFollow && (
          <NavigationArrowOverlay $heading={heading}>
            <NavigationArrowSvg />
          </NavigationArrowOverlay>
        )}

        {/* "Let's ride" button — shown in planning mode when route is ready */}
        {showLetsRide && <LetsRide onClick={startRide} />}

        {/* Active navigation overlay — top panel + bottom panel */}
        {isNavigating && (
          <ActiveRide
            autoFollow={autoFollow}
            totalDistance={metadata ? formatDistance(metadata.distanceMeters) : undefined}
            totalTime={metadata ? formatETA(metadata.etaSeconds) : undefined}
            remainingDistance={metadata ? formatDistance(metadata.distanceMeters) : undefined}
            remainingTime={metadata ? formatETA(metadata.etaSeconds) : undefined}
            onCancel={stopRide}
            onRecenter={recenter}
            onRouteOverview={showRouteOverview}
          />
        )}
      </MapFrame>
      {!isNavigating && (
        <PreviewPanel
          metadata={metadata}
          status={status}
          error={routeError}
          collapsed={panelCollapsed}
          onCollapse={() => setPanelCollapsed(true)}
        />
      )}
    </MapContainer>
  )
}

export default MapLibre
