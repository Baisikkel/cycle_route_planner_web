import { Marker } from 'react-map-gl/maplibre'

import { LocationPin, WaypointIcon, WaypointPinDot, WaypointPinTip } from './Map.styled'
import { DESTINATION_COLOR, START_COLOR, STOP_COLOR } from './mapConfig'
import type { LatLon, RouteWaypoint } from './routing/types'

type WaypointMarkersProps = {
  start: LatLon | null
  end: LatLon | null
  stops: RouteWaypoint[]
  visible: boolean
}

export function WaypointMarkers({ start, end, stops, visible }: WaypointMarkersProps) {
  if (!visible) return null

  return (
    <>
      {start && (
        <Marker latitude={start.lat} longitude={start.lon} anchor="bottom">
          <LocationPin>
            <WaypointPinDot $color={START_COLOR}>
              <WaypointIcon>S</WaypointIcon>
            </WaypointPinDot>
            <WaypointPinTip $color={START_COLOR} />
          </LocationPin>
        </Marker>
      )}

      {stops.map((stop, index) =>
        stop.lat !== null && stop.lon !== null ? (
          <Marker key={stop.id} latitude={stop.lat} longitude={stop.lon} anchor="bottom">
            <LocationPin>
              <WaypointPinDot $color={STOP_COLOR}>
                <WaypointIcon>{index + 1}</WaypointIcon>
              </WaypointPinDot>
              <WaypointPinTip $color={STOP_COLOR} />
            </LocationPin>
          </Marker>
        ) : null,
      )}

      {end && (
        <Marker latitude={end.lat} longitude={end.lon} anchor="bottom">
          <LocationPin>
            <WaypointPinDot $color={DESTINATION_COLOR}>
              <WaypointIcon>F</WaypointIcon>
            </WaypointPinDot>
            <WaypointPinTip $color={DESTINATION_COLOR} />
          </LocationPin>
        </Marker>
      )}
    </>
  )
}
