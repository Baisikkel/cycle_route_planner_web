import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useRef, useState } from 'react'
import type { MapRef, ViewStateChangeEvent } from 'react-map-gl/maplibre'
import Map, { Layer, Marker, NavigationControl, Source } from 'react-map-gl/maplibre'

import { PreviewPanel } from '@components/PreviewPanel'
import { useAppTranslation } from '@lib/i18n'

import { ActiveRide, LetsRide } from './ActiveRide'
import { useLongPressPopup } from './hooks/useLongPressPopup'
import { useMapRouteEffects } from './hooks/useMapRouteEffects'
import { LongPressPopup } from './LongPressPopup'
import {
  BikeEmoji,
  LoadingBikeOverlay,
  LocationPin,
  MapContainer,
  MapFrame,
  MapHint,
  NavigationArrowOverlay,
  NavigationGpsDot,
  PinDot,
  PinTip,
} from './Map.styled'
import { lineLayerStyle, MAP_STYLE, TALLINN_CENTER } from './mapConfig'
import { getMapHint } from './mapHints'
import { NavigationArrow } from './NavigationArrow'
import { formatDistance, formatETA } from './routeFormatters'
import { RoutePlanner } from './RoutePlanner'
import { useGeolocation } from './useGeolocation'
import { useNavigationMode } from './useNavigationMode'
import { useRoute } from './useRoute'
import { useRouteTracking } from './useRouteTracking'
import { WaypointMarkers } from './WaypointMarkers'

const MapLibre = () => {
  const { t } = useAppTranslation()
  const { permission, position, heading, error: geoError } = useGeolocation()
  const routeState = useRoute()
  const {
    route,
    start,
    end,
    waypoints,
    stops,
    metadata,
    status,
    error: routeError,
    setStart,
    setEnd,
    setWaypointAddress,
    clearWaypoint,
    addStop,
    removeStop,
    reorderStops,
    clearRoute,
    isLoading,
  } = routeState

  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const mapRef = useRef<MapRef>(null)

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

  const onMapMoveStart = useCallback(
    (event: ViewStateChangeEvent) => {
      if (isNavigating && event.originalEvent) {
        handleUserInteraction()
      }
    },
    [handleUserInteraction, isNavigating],
  )

  const hint = getMapHint(t, permission, !!route, isOffRoute && !shouldReroute, isLoading, !!start)
  const errorHint = geoError && !position ? ` â€” ${geoError}` : ''
  const markerPos = displayPosition ?? position
  const showLetsRide = !!route && status === 'success' && !isNavigating
  const showGpsDotInNavigation = isNavigating && !autoFollow && markerPos
  const showWaypointMarkers = !isNavigating || !autoFollow

  return (
    <MapContainer $navigationActive={isNavigating}>
      {!isNavigating && (
        <MapHint>
          {hint}
          {routeError ? ` â€” ${routeError}` : errorHint}
        </MapHint>
      )}
      <MapFrame>
        <Map
          ref={mapRef}
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAP_STYLE}
          initialViewState={initialViewState}
          onClick={longPressPopup.onMapClick}
          onContextMenu={longPressPopup.onMapContextMenu}
          onTouchStart={longPressPopup.onMapTouchStart}
          onTouchMove={longPressPopup.onMapTouchMove}
          onTouchEnd={longPressPopup.onMapTouchEnd}
          onMoveStart={onMapMoveStart}
        >
          {!isNavigating && <NavigationControl position="top-right" />}

          {!isNavigating && markerPos && (
            <Marker latitude={markerPos.latitude} longitude={markerPos.longitude} anchor="bottom">
              <LocationPin>
                <PinDot>
                  <BikeEmoji $heading={heading}>ðŸš²</BikeEmoji>
                </PinDot>
                <PinTip />
              </LocationPin>
            </Marker>
          )}

          {showGpsDotInNavigation && (
            <Marker latitude={markerPos.latitude} longitude={markerPos.longitude} anchor="center">
              <NavigationGpsDot />
            </Marker>
          )}

          <WaypointMarkers start={start} end={end} stops={stops} visible={showWaypointMarkers} />

          {longPressPopup.popupPoint && (
            <LongPressPopup
              point={longPressPopup.popupPoint}
              onClose={longPressPopup.closePopup}
              onSetStart={handleSetStart}
              onSetDestination={handleSetDestination}
            />
          )}

          {route && (
            <Source id="cycle-route" type="geojson" data={route}>
              <Layer {...lineLayerStyle} />
            </Source>
          )}
        </Map>

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

        {isNavigating && isLoading && <LoadingBikeOverlay>ðŸš²</LoadingBikeOverlay>}

        {isNavigating && autoFollow && (
          <NavigationArrowOverlay $heading={heading}>
            <NavigationArrow />
          </NavigationArrowOverlay>
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
