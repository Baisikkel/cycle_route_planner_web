import { Marker } from 'react-map-gl/maplibre'

import { LocationPin, WaypointIcon, WaypointPinDot, WaypointPinTip } from './Map.styled'
import type { AppMapMarker } from './mapTypes'

type WaypointMarkersProps = {
  markers: AppMapMarker[]
}

export function WaypointMarkers({ markers }: WaypointMarkersProps) {
  if (markers.length === 0) return null

  return (
    <>
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          latitude={marker.latitude}
          longitude={marker.longitude}
          anchor="bottom"
        >
          <LocationPin>
            <WaypointPinDot $color={marker.color}>
              <WaypointIcon>{marker.label}</WaypointIcon>
            </WaypointPinDot>
            <WaypointPinTip $color={marker.color} />
          </LocationPin>
        </Marker>
      ))}
    </>
  )
}
