import { useCallback, useMemo, useRef, useState } from 'react'

import { AppMapCanvas, type AppMapHandle, type AppMapMarker } from '@components/Map'
import { TALLINN_CENTER } from '@components/Map/mapConfig'
import { useAppTranslation } from '@lib/i18n'

import { DESTINATION_COLOR, START_COLOR, STOP_COLOR } from './components/planner/config'
import { RoutePlanner } from './components/planner/RoutePlanner'
import { PreviewPanel } from './components/preview/PreviewPanel'
import { ActiveRide, LetsRide } from './components/ride/ActiveRide'
import { NavigationArrow } from './components/ride/NavigationArrow'
import { useGeolocation } from './hooks/useGeolocation'
import { useLongPressPopup } from './hooks/useLongPressPopup'
import { useMapRouteEffects } from './hooks/useMapRouteEffects'
import { useNavigationMode } from './hooks/useNavigationMode'
import { useRouteCalculation } from './hooks/useRouteCalculation'
import { useRouteTracking } from './hooks/useRouteTracking'
import { getMapHint } from './mapHints'
import * as S from './RoutePlanner.styled'
import { formatDistance, formatETA } from './routing/routeFormatters'
import { selectDestinationWaypoint, selectStartWaypoint, useRouteStore } from './routing/routeStore'
import { toLatLon } from './routing/routeUtils'

export function RoutePlannerPage() {
  const { t } = useAppTranslation()
  const { permission, position, heading, error: geoError } = useGeolocation()
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

  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const mapRef = useRef<AppMapHandle>(null)

  const longPressPopup = useLongPressPopup()

  const {
    isNavigating,
    autoFollow,
    startRide,
    stopRide,
    recenter,
    handleUserInteraction,
    showRouteOverview,
  } = useNavigationMode(mapRef, position, heading, route)

  const { displayPosition, isOffRoute, shouldReroute } = useRouteTracking(
    position,
    route,
    isNavigating,
  )

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
    setEnd(longPressPopup.popupPoint, t('Selected on map'), 'map')
    longPressPopup.closePopup()
  }, [clearRoute, longPressPopup, setEnd, t])

  const markerPos = displayPosition ?? position
  const showLetsRide = !!route && status === 'success' && !isNavigating
  const showWaypointMarkers = !isNavigating || !autoFollow
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

  const hint = getMapHint(t, permission, !!route, isOffRoute && !shouldReroute, isLoading, !!start)
  const errorHint = geoError && !position ? ` - ${geoError}` : ''

  return (
    <S.MapContainer $navigationActive={isNavigating}>
      {!isNavigating && (
        <S.MapHint>
          {hint}
          {routeError ? ` - ${routeError}` : errorHint}
        </S.MapHint>
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
            onRemoveStop={removeStop}
            onReorderStops={reorderStops}
          />
        )}

        {isNavigating && isLoading && <S.LoadingBikeOverlay>🚲</S.LoadingBikeOverlay>}

        {isNavigating && autoFollow && (
          <S.NavigationArrowOverlay $heading={heading}>
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
      {!isNavigating && (
        <PreviewPanel
          metadata={metadata}
          status={status}
          error={routeError}
          collapsed={panelCollapsed}
          onCollapse={() => setPanelCollapsed(true)}
        />
      )}
    </S.MapContainer>
  )
}
