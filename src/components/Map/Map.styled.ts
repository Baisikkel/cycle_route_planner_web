import styled from 'styled-components'

/**
 * Map layout wrapper (VAN-60 + route drawing).
 *
 * Why flex column + fixed height: the PR originally used a single block at 75vh. When we added
 * a short instruction line above the map (MapHint), the map needed to keep filling the *remaining*
 * space — flex lets MapFrame take "the rest" after the hint. Safe to simplify back to a single
 * div + Map only if you remove MapHint and want the original layout.
 */
export const MapContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: auto;
  height: 75vh;
`

/**
 * Fills remaining vertical space inside MapContainer so the WebGL map has non-zero height.
 *
 * Why min-height: 0: flex children default to min-height:auto, which can prevent shrinking and
 * clip the map — common flex gotcha. Do not remove if MapHint stays above the map.
 *
 * Popup style overrides: MapLibre's default .maplibregl-popup-content has padding and
 * box-shadow that conflict with our custom popup. We reset them here.
 */
export const MapFrame = styled.div`
  flex: 1;
  min-height: 0;

  .maplibregl-popup-content {
    padding: 0;
    background: transparent;
    box-shadow: none;
    border-radius: 20px;
  }

  .maplibregl-popup-tip {
    display: none;
  }
`

/**
 * Optional UX copy for the two-click route flow (not required for the API).
 * Safe to delete if product/design prefers no inline instructions — then remove MapHint usage and
 * consider dropping MapFrame/MapContainer flex (see MapContainer comment).
 */
export const MapHint = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing(2)};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textMuted};
`

/**
 * Location pin: white circle with drop shadow + triangular tip at the bottom.
 * The tip is the exact GPS coordinate (Marker anchor="bottom" aligns it).
 * Heading rotates only the bike emoji inside, not the whole pin.
 */
export const LocationPin = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
`

/** White circle that holds the bike emoji. */
export const PinDot = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid ${({ theme }) => theme.colors.primary};
`

/** Small triangle pointing down — the precise location indicator. */
export const PinTip = styled.div`
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid ${({ theme }) => theme.colors.primary};
  margin-top: -1px;
`

export const BikeEmoji = styled.span<{ $heading: number | null }>`
  font-size: 1.1rem;
  display: inline-block;
  line-height: 1;
  transform: rotate(${({ $heading }) => ($heading != null ? $heading : 0)}deg);
  transition: transform 0.5s ease;
`

/**
 * Long-press popup: white rounded card with two mini-pin buttons.
 * MapLibre's popup chrome is reset in MapFrame — this is the visible container.
 */
export const PopupContent = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 14px;
  padding: 10px 14px 6px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
`

/** One tappable mini-pin in the popup (start or destination). */
export const PopupChoice = styled.button<{ $color: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.1s ease;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));

  &:active {
    transform: scale(0.9);
  }
`

export const PopupPinDot = styled.div<{ $color: string }>`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid ${({ $color }) => $color};
`

export const PopupPinTip = styled.div<{ $color: string }>`
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 7px solid ${({ $color }) => $color};
  margin-top: -1px;
`

export const PopupPinIcon = styled.span`
  font-size: 0.95rem;
  line-height: 1;
`

/**
 * Start / destination markers on the map — reuse pin structure with custom colors.
 * Green for start, red/danger for destination.
 */
export const WaypointPinDot = styled.div<{ $color: string }>`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid ${({ $color }) => $color};
`

export const WaypointPinTip = styled.div<{ $color: string }>`
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 7px solid ${({ $color }) => $color};
  margin-top: -1px;
`

export const WaypointIcon = styled.span`
  font-size: 0.85rem;
  line-height: 1;
`
