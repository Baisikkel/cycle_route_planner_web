/**
 * Active Ride overlay — renders the navigation UI on top of the fullscreen map.
 *
 * Two panels:
 *  - Top: turn-by-turn instruction when following, progress bar when in route overview
 *  - Bottom: action buttons (cancel, recenter, route overview) + distance/time metadata
 *
 * Turn-by-turn data and remaining distance/time are optional props — another developer
 * provides the real values later. When absent, placeholder content is shown.
 *
 * All user-facing strings are translated via useAppTranslation (i18n).
 */
import { useAppTranslation } from '@lib/i18n'

import {
  BottomPanel,
  ButtonRow,
  CircleButton,
  LetsRideButton,
  MetadataText,
  ProgressBike,
  ProgressLabel,
  ProgressBar,
  ProgressTrack,
  TopPanel,
  TopPanelContent,
  TurnDistance,
  TurnIconContainer,
  TurnInfo,
  TurnStreet,
} from './ActiveRide.styled'

// ─── SVG Icons (inline to avoid external dependencies) ───────────────────────

/**
 * Turn arrow icon — points in the direction of the next turn.
 * Rotation maps: straight = up, right = right, left = left, uturn = down.
 * Default is 'straight' when no turn data is provided.
 */
function TurnArrowIcon({ direction }: { direction?: string }) {
  const rotation: Record<string, number> = {
    straight: -90,
    right: 0,
    left: 180,
    uturn: 90,
  }
  const deg = rotation[direction ?? 'straight'] ?? -90

  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: `rotate(${deg}deg)` }}
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** X mark icon for the cancel/stop button. Red stroke for danger action. */
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="#dc2626"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** GPS/location pin icon for the recenter button. Centers map back on user. */
function LocationPinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill="#dc2626"
        stroke="#dc2626"
        strokeWidth="1"
      />
      <circle cx="12" cy="9" r="2.5" fill="white" />
    </svg>
  )
}

/** "Zoom to fit" icon for the route overview button — four expanding corners. */
function RouteOverviewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"
        stroke="#475569"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

export type ActiveRideProps = {
  /** Whether the map is auto-following the user. When false, top panel shows progress line. */
  autoFollow: boolean
  /** Total route distance formatted (e.g. "1,85 km"). Shown in progress line. */
  totalDistance?: string
  /** Total route time formatted (e.g. "8 min"). Shown in progress line. */
  totalTime?: string
  /** How far along the route the user is (0-100%). Another dev provides real value. */
  progress?: number
  /** Turn direction icon — filled in by another dev's turn-by-turn engine later. */
  turnIcon?: 'straight' | 'left' | 'right' | 'uturn'
  /** Distance to the next turn (e.g. "50 m") — filled in by another dev later. */
  turnDistance?: string
  /** Street name for the next turn (e.g. "Puhke tänav") — filled in by another dev later. */
  turnStreet?: string
  /** Remaining distance to destination — filled in by another dev later. */
  remainingDistance?: string
  /** Remaining time to destination — filled in by another dev later. */
  remainingTime?: string
  /** Exit navigation mode. */
  onCancel: () => void
  /** Re-enable map auto-following after user panned away. */
  onRecenter: () => void
  /** Zoom out to show the full route. */
  onRouteOverview: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Navigation overlay rendered on top of the fullscreen map during active ride.
 * Top panel switches between turn-by-turn (when following) and progress bar (when in overview).
 */
export function ActiveRide({
  autoFollow,
  totalDistance,
  totalTime,
  progress,
  turnIcon,
  turnDistance,
  turnStreet,
  remainingDistance,
  remainingTime,
  onCancel,
  onRecenter,
  onRouteOverview,
}: ActiveRideProps) {
  const { t } = useAppTranslation()

  return (
    <>
      <TopPanel>
        <TopPanelContent>
          {autoFollow ? (
            /* Turn-by-turn instruction — shown while following the user */
            <>
              <TurnIconContainer>
                <TurnArrowIcon direction={turnIcon} />
              </TurnIconContainer>
              <TurnInfo>
                <TurnDistance>{turnDistance ?? '—'}</TurnDistance>
                <TurnStreet>{turnStreet ?? t('Follow the route')}</TurnStreet>
              </TurnInfo>
            </>
          ) : (
            /* Progress line — shown in route overview (zoomed out to full route) */
            <ProgressBar>
              <ProgressLabel>{totalDistance ?? '-- km'}</ProgressLabel>
              <ProgressTrack>
                <ProgressBike $progress={progress}>🚲</ProgressBike>
              </ProgressTrack>
              <ProgressLabel>{totalTime ?? '-- min'}</ProgressLabel>
            </ProgressBar>
          )}
        </TopPanelContent>
      </TopPanel>

      {/* Bottom panel with action buttons and route metadata */}
      <BottomPanel>
        <ButtonRow>
          <CircleButton onClick={onCancel} title={t('Cancel ride')} aria-label={t('Cancel ride')}>
            <CloseIcon />
          </CircleButton>
          <CircleButton onClick={onRecenter} title={t('Recenter')} aria-label={t('Recenter')}>
            <LocationPinIcon />
          </CircleButton>
          <CircleButton
            onClick={onRouteOverview}
            title={t('Route overview')}
            aria-label={t('Route overview')}
          >
            <RouteOverviewIcon />
          </CircleButton>
        </ButtonRow>

        {/* Distance + time — placeholder until another dev provides real values */}
        <MetadataText>
          <span>{remainingDistance ?? '-- km'}</span>
          <span>{remainingTime ?? '-- min'}</span>
        </MetadataText>
      </BottomPanel>
    </>
  )
}

// ─── "Let's ride" button (exported separately for use in planning mode) ──────

export type LetsRideProps = {
  onClick: () => void
}

/**
 * Green "Let's ride" button — shown in planning mode when a route is ready.
 * Tapping it enters navigation mode (fullscreen map following).
 */
export function LetsRide({ onClick }: LetsRideProps) {
  const { t } = useAppTranslation()

  return <LetsRideButton onClick={onClick}>{t("Let's ride")}</LetsRideButton>
}
