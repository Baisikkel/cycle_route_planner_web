import styled, { css } from 'styled-components'

export const MapContainer = styled.div<{ $navigationActive?: boolean }>`
  display: flex;
  flex-direction: column;
  width: auto;
  height: 90vh;

  ${({ $navigationActive }) =>
    $navigationActive &&
    css`
      position: fixed;
      inset: 0;
      z-index: 1000;
      height: 100vh;
      width: 100vw;
    `}
`

export const MapFrame = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;

  .maplibregl-popup {
    z-index: 20;
  }

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

export const MapHint = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing(2)};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textMuted};
`

export const NavigationArrowOverlay = styled.div`
  position: absolute;
  bottom: 155px;
  left: calc(50% - 30px);
  z-index: 5;
  width: 60px;
  height: 60px;
  pointer-events: none;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
`

export const LoadingBikeOverlay = styled.div`
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 15;
  font-size: 2rem;
  animation: map-loading-bike-spin 1s linear infinite;

  @keyframes map-loading-bike-spin {
    to {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }
`
