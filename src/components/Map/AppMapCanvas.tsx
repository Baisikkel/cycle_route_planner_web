import 'maplibre-gl/dist/maplibre-gl.css'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import Map, { Layer, Marker, NavigationControl, Source } from 'react-map-gl/maplibre'

import { LongPressPopup } from './LongPressPopup'
import { BikeEmoji, LocationPin, NavigationGpsDot, PinDot, PinTip } from './Map.styled'
import { lineLayerStyle, MAP_STYLE } from './mapConfig'
import type {
  AppMapCanvasProps,
  AppMapHandle,
  AppMapPointerEvent,
  AppMapTouchEvent,
} from './mapTypes'
import { WaypointMarkers } from './WaypointMarkers'

export const AppMapCanvas = forwardRef<AppMapHandle, AppMapCanvasProps>(function AppMapCanvas(
  {
    initialViewState,
    navigationPosition,
    onMapClick,
    onMapContextMenu,
    onMapTouchEnd,
    onMapTouchMove,
    onMapTouchStart,
    onUserMoveStart,
    route,
    selectionPopup,
    showNavigationControl,
    userHeading,
    userPosition,
    waypointMarkers,
  },
  ref,
) {
  const mapRef = useRef<MapRef>(null)

  useImperativeHandle(
    ref,
    () => ({
      fitBounds: (bounds, options) => {
        mapRef.current?.fitBounds(bounds, options)
      },
      easeTo: (options) => {
        mapRef.current?.easeTo(options)
      },
      getContainer: () => mapRef.current?.getContainer() ?? null,
    }),
    [],
  )

  return (
    <Map
      ref={mapRef}
      style={{ width: '100%', height: '100%' }}
      mapStyle={MAP_STYLE}
      initialViewState={initialViewState}
      onClick={onMapClick}
      onContextMenu={(event) => {
        onMapContextMenu({
          lngLat: { lat: event.lngLat.lat, lon: event.lngLat.lng },
          point: event.point,
          originalEvent: event.originalEvent,
        } satisfies AppMapPointerEvent)
      }}
      onTouchStart={(event) => {
        onMapTouchStart({
          lngLat: { lat: event.lngLat.lat, lon: event.lngLat.lng },
          point: event.point,
          originalEvent: event.originalEvent,
        } satisfies AppMapTouchEvent)
      }}
      onTouchMove={(event) => {
        onMapTouchMove({
          lngLat: { lat: event.lngLat.lat, lon: event.lngLat.lng },
          point: event.point,
          originalEvent: event.originalEvent,
        } satisfies AppMapTouchEvent)
      }}
      onTouchEnd={onMapTouchEnd}
      onMoveStart={(event) => {
        if (event.originalEvent) onUserMoveStart()
      }}
    >
      {showNavigationControl && <NavigationControl position="top-right" />}

      {userPosition && (
        <Marker latitude={userPosition.latitude} longitude={userPosition.longitude} anchor="bottom">
          <LocationPin>
            <PinDot>
              <BikeEmoji $heading={userHeading}>Ã°Å¸Å¡Â²</BikeEmoji>
            </PinDot>
            <PinTip />
          </LocationPin>
        </Marker>
      )}

      {navigationPosition && (
        <Marker
          latitude={navigationPosition.latitude}
          longitude={navigationPosition.longitude}
          anchor="center"
        >
          <NavigationGpsDot />
        </Marker>
      )}

      <WaypointMarkers markers={waypointMarkers} />

      {selectionPopup && (
        <LongPressPopup
          point={selectionPopup.point}
          onClose={selectionPopup.onClose}
          onSetStart={selectionPopup.onSetStart}
          onSetDestination={selectionPopup.onSetDestination}
        />
      )}

      {route && (
        <Source id="cycle-route" type="geojson" data={route}>
          <Layer {...lineLayerStyle} />
        </Source>
      )}
    </Map>
  )
})
