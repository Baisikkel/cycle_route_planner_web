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
 */
export const MapFrame = styled.div`
  flex: 1;
  min-height: 0;
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
