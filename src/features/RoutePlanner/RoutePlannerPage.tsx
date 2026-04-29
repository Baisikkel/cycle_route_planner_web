import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AppMapCanvas, type AppMapHandle, type AppMapMarker } from '@components/Map'
import { TALLINN_CENTER } from '@components/Map/mapConfig'
import { useAppTranslation } from '@lib/i18n'

import { DESTINATION_COLOR, START_COLOR, STOP_COLOR } from './components/planner/config'
import { RoutePlanner } from './components/planner/RoutePlanner'
import { ActiveRide, LetsRide } from './components/ride/ActiveRide'
import { NavigationArrow } from './components/ride/NavigationArrow'
import { useDeviceHeading } from './hooks/useDeviceHeading'
import { useGeolocation } from './hooks/useGeolocation'
import { useLongPressPopup } from './hooks/useLongPressPopup'
import { useMapRouteEffects } from './hooks/useMapRouteEffects'
import { useNavigationMode } from './hooks/useNavigationMode'
import { useRouteCalculation } from './hooks/useRouteCalculation'
import { useRouteTracking } from './hooks/useRouteTracking'
import * as S from './RoutePlanner.styled'
import { formatDistance, formatETA } from './routing/routeFormatters'
import { selectDestinationWaypoint, selectStartWaypoint, useRouteStore } from './routing/routeStore'
import { toLatLon } from './routing/routeUtils'

export function RoutePlannerPage() {
  const { t } = useAppTranslation()
  const { position, heading: gpsHeading, error: geoError } = useGeolocation()
  const route = useRouteStore((state) => state.route)
  const metadata = useRouteStore((state) => state.metadata)
  const status = useRouteStore((state) => state.status)
  const routeError = useRouteStore((state) => state.error)
  const waypoints = useRouteStore((state) => state.waypoints)
  const startWaypoint = useRouteStore(selectStartWaypoint)
  const destinationWaypoint = useRouteStore(selectDestinationWaypoint)
  const setStart = useRouteStore((state) => state.setStart)
  const setEnd = useRouteStore((state) => state.setEnd)
  const setWaypointAddress = useRouteStore((state) => state.setWaypointAddress)
  const clearWaypoint = useRouteStore((state) => state.clearWaypoint)
  const addStop = useRouteStore((state) => state.addStop)
  const removeStop = useRouteStore((state) => state.removeStop)
  const reorderStops = useRouteStore((state) => state.reorderStops)
  const clearRoute = useRouteStore((state) => state.clearRoute)

  useRouteCalculation()

  const start = useMemo(() => toLatLon(startWaypoint), [startWaypoint])
  const end = useMemo(() => toLatLon(destinationWaypoint), [destinationWaypoint])
  const stops = useMemo(() => waypoints.filter((waypoint) => waypoint.role === 'stop'), [waypoints])
  const isLoading = status === 'loading'

  const [, setPanelCollapsed] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const mapRef = useRef<AppMapHandle>(null)
  const arrowRef = useRef<HTMLDivElement>(null)
  const displayedHeadingRef = useRef(0)
  const targetHeadingRef = useRef(0)
  const rafRef = useRef(0)
  const { heading } = useDeviceHeading(gpsHeading, isNavigating)

  const longPressPopup = useLongPressPopup()

  const { autoFollow, startRide, stopRide, recenter, handleUserInteraction, showRouteOverview } =
    useNavigationMode(mapRef, position, heading, route, isNavigating, setIsNavigating)

  const { displayPosition, shouldReroute } = useRouteTracking(position, route, isNavigating)

  useMapRouteEffects({
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
  })

  const initialViewState = position
    ? { latitude: position.latitude, longitude: position.longitude, zoom: 14 }
    : TALLINN_CENTER

  const handleSetStart = useCallback(() => {
    if (!longPressPopup.popupPoint) return
    clearRoute()
    setStart(longPressPopup.popupPoint, t('Selected on map'), 'map')
    longPressPopup.closePopup()
  }, [clearRoute, longPressPopup, setStart, t])

  const handleSetDestination = useCallback(() => {
    if (!longPressPopup.popupPoint) return

    clearRoute()
    if (!start && position) {
      setStart({ lat: position.latitude, lon: position.longitude }, t('Current location'), 'gps')
    }
    setEnd(longPressPopup.popupPoint, t('Selected on map'), 'map')
    longPressPopup.closePopup()
  }, [clearRoute, longPressPopup, position, setEnd, setStart, start, t])

  const handleClearAll = useCallback(() => {
    waypoints.forEach((waypoint) => {
      clearWaypoint(waypoint.id)
    })
  }, [clearWaypoint, waypoints])

  const markerPos = displayPosition ?? position
  const showLetsRide = !!route && status === 'success' && !isNavigating
  const showWaypointMarkers = !isNavigating || !autoFollow

  useEffect(() => {
    if (!isNavigating) {
      if (arrowRef.current) arrowRef.current.style.transform = 'rotate(0deg)'
      return
    }

    const animate = () => {
      const target = targetHeadingRef.current
      const current = displayedHeadingRef.current

      let diff = target - current
      if (diff > 180) diff -= 360
      if (diff < -180) diff += 360

      displayedHeadingRef.current = current + diff * 0.03

      if (arrowRef.current && mapRef.current) {
        const mapBearing = mapRef.current.getBearing()
        let offset = displayedHeadingRef.current - mapBearing
        offset = (((offset % 360) + 540) % 360) - 180
        arrowRef.current.style.transform = `rotate(${offset}deg)`
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isNavigating])

  useEffect(() => {
    if (heading != null) {
      targetHeadingRef.current = heading
    }
  }, [heading])
  const waypointMarkers = useMemo<AppMapMarker[]>(() => {
    if (!showWaypointMarkers) return []

    const markers: AppMapMarker[] = []
    // ~1 m at the equator — enough to treat GPS-set start as "same point" while
    // ignoring any real movement
    const SAME_POINT_DEG = 1e-5
    const startMatchesPosition =
      !!start &&
      !!position &&
      Math.abs(start.lat - position.latitude) < SAME_POINT_DEG &&
      Math.abs(start.lon - position.longitude) < SAME_POINT_DEG
    if (start && !startMatchesPosition) {
      markers.push({
        id: 'start',
        latitude: start.lat,
        longitude: start.lon,
        label: 'S',
        color: START_COLOR,
      })
    }

    stops.forEach((stop, index) => {
      if (stop.lat === null || stop.lon === null) return

      markers.push({
        id: stop.id,
        latitude: stop.lat,
        longitude: stop.lon,
        label: `${index + 1}`,
        color: STOP_COLOR,
      })
    })

    if (end) {
      markers.push({
        id: 'destination',
        latitude: end.lat,
        longitude: end.lon,
        label: 'F',
        color: DESTINATION_COLOR,
      })
    }

    return markers
  }, [end, position, showWaypointMarkers, start, stops])

  const errorHint = geoError && !position ? ` - ${geoError}` : ''

  return (
    <S.MapContainer $navigationActive={isNavigating}>
      {!isNavigating && routeError && (
        <S.MapHint>{errorHint ? `${routeError}${errorHint}` : routeError}</S.MapHint>
      )}
      <S.MapFrame>
        <AppMapCanvas
          ref={mapRef}
          initialViewState={initialViewState}
          route={route}
          waypointMarkers={waypointMarkers}
          selectionPopup={
            longPressPopup.popupPoint
              ? {
                  point: longPressPopup.popupPoint,
                  onClose: longPressPopup.closePopup,
                  onSetStart: handleSetStart,
                  onSetDestination: handleSetDestination,
                }
              : null
          }
          showNavigationControl={!isNavigating}
          userPosition={markerPos}
          userHeading={heading}
          navigationPosition={null}
          onMapClick={longPressPopup.onMapClick}
          onMapContextMenu={longPressPopup.onMapContextMenu}
          onMapTouchStart={longPressPopup.onMapTouchStart}
          onMapTouchMove={longPressPopup.onMapTouchMove}
          onMapTouchEnd={longPressPopup.onMapTouchEnd}
          onUserMoveStart={() => {
            if (isNavigating) handleUserInteraction()
          }}
        />

        {!isNavigating && (
          <RoutePlanner
            waypoints={waypoints}
            stops={stops}
            metadata={metadata}
            status={status}
            error={routeError}
            onSelectAddress={(waypointId, suggestion) =>
              setWaypointAddress(
                waypointId,
                { lat: suggestion.lat, lon: suggestion.lon },
                suggestion.label,
                'address',
              )
            }
            onClearWaypoint={clearWaypoint}
            onAddStop={addStop}
            onClearAll={handleClearAll}
            onRemoveStop={removeStop}
            onReorderStops={reorderStops}
          />
        )}

        {isNavigating && isLoading && <S.LoadingBikeOverlay>🚲</S.LoadingBikeOverlay>}

        {isNavigating && autoFollow && (
          <S.NavigationArrowOverlay ref={arrowRef}>
            <NavigationArrow />
          </S.NavigationArrowOverlay>
        )}

        {showLetsRide && <LetsRide onClick={startRide} />}

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
      </S.MapFrame>
    </S.MapContainer>
  )
}
