import styled from 'styled-components'

// Panel container - fixed at bottom, slides up
export const PreviewPanelContainer = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 90vh;
  background: ${({ theme }) => theme.colors.surface};
  border-top-left-radius: ${({ theme }) => theme.radius.lg};
  border-top-right-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.md};
  transform: translateY(${({ $visible }) => ($visible ? '0' : '100%')});
  transition: transform 300ms ease;
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`

// Semi-transparent backdrop above panel (tap to dismiss)
export const BackdropOverlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 300ms ease;
  pointer-events: none;
  z-index: 999;
`

// Drag handle at top of panel
export const PanelHandle = styled.div`
  width: 40px;
  height: 4px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 2px;
  margin: ${({ theme }) => theme.spacing(2)} auto;
  cursor: pointer;
`

// Header row with handle and close button
export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `0 ${theme.spacing(3)} ${theme.spacing(1)}`};
`

// Close button
export const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing(1)};
  font-size: 1.25rem;
  color: ${({ theme }) => theme.colors.textMuted};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }
`

// Content wrapper
export const PanelContent = styled.div`
  flex: 1;
  padding: 0 ${({ theme }) => theme.spacing(4)} ${({ theme }) => theme.spacing(4)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  overflow-y: auto;
`

// Flex row for distance and ETA
export const RouteInfo = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(6)};
  justify-content: center;
`

// Individual info item
export const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
`

export const InfoLabel = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textMuted};
`

export const InfoValue = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

// Loading spinner wrapper
export const SpinnerWrapper = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`

// Spinner using CSS animation
export const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: spin 800ms linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

// Error message
export const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.colors.danger};
  text-align: center;
  font-size: 0.95rem;
  margin: 0;
`

// CTA Button - full width at bottom
export const CTAButton = styled.button`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing(3)} ${theme.spacing(4)}`};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition:
    transform 120ms ease,
    box-shadow 120ms ease;
  box-shadow: ${({ theme }) => theme.shadow.sm};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadow.md};
  }

  &:active {
    transform: translateY(0);
  }
`
