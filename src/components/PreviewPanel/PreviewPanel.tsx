import { useCallback, useEffect } from 'react'

import { useAppTranslation } from '@lib/i18n'

import {
  BackdropOverlay,
  CloseButton,
  ErrorMessage,
  InfoItem,
  InfoLabel,
  InfoValue,
  PanelContent,
  PanelHandle,
  PanelHeader,
  PreviewPanelContainer,
  RouteInfo,
  Spinner,
  SpinnerWrapper,
} from './PreviewPanel.styled'
import { formatDistance, formatETA } from '../Map/routeFormatters'
import type { RouteMetadata, RouteStatus } from '../Map/useRoute'

type Props = {
  metadata: RouteMetadata | null
  status: RouteStatus
  error: string | null
  collapsed: boolean
  onCollapse: () => void
}

export function PreviewPanel({ metadata, status, error, collapsed, onCollapse }: Props) {
  const { t } = useAppTranslation()

  // Panel is visible when status is success, loading, or error (not idle)
  const isVisible = status !== 'idle'
  // Panel slides up only when visible AND not collapsed
  const slideUp = isVisible && !collapsed

  // Handle backdrop tap to dismiss
  const handleBackdropClick = useCallback(() => {
    onCollapse()
  }, [onCollapse])

  // Collapse on scroll
  useEffect(() => {
    if (!slideUp) return
    const handleScroll = () => {
      onCollapse()
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [slideUp, onCollapse])

  return (
    <>
      <BackdropOverlay $visible={slideUp} onClick={handleBackdropClick} />
      <PreviewPanelContainer $visible={slideUp}>
        <PanelHeader>
          <PanelHandle onClick={onCollapse} title={t('Collapse panel')} />
          <CloseButton onClick={onCollapse} title={t('Close')} aria-label={t('Close')}>
            ✕
          </CloseButton>
        </PanelHeader>
        <PanelContent>
          {status === 'loading' && (
            <SpinnerWrapper>
              <Spinner />
            </SpinnerWrapper>
          )}

          {status === 'error' && error && <ErrorMessage>{error}</ErrorMessage>}

          {status === 'success' && metadata && (
            <RouteInfo>
              <InfoItem>
                <InfoLabel>{t('Distance')}</InfoLabel>
                <InfoValue>{formatDistance(metadata.distanceMeters)}</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>{t('ETA')}</InfoLabel>
                <InfoValue>{formatETA(metadata.etaSeconds)}</InfoValue>
              </InfoItem>
            </RouteInfo>
          )}
        </PanelContent>
      </PreviewPanelContainer>
    </>
  )
}
