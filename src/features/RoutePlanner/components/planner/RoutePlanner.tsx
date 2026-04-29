import { useMemo } from 'react'

import type { AddressSuggestion } from '@api/address'
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  SortableContext,
  sortableKeyboardCoordinates,
  TouchSensor,
  useSensor,
  useSensors,
  verticalListSortingStrategy,
} from '@lib/dnd'
import { useAppTranslation } from '@lib/i18n'

import { DESTINATION_COLOR, START_COLOR, STOP_COLOR } from './config'
import * as S from './RoutePlanner.styled'
import { SortableStopRow } from './SortableStopRow'
import { WaypointRow } from './WaypointRow'
import { formatDistance, formatETA } from '../../routing/routeFormatters'
import type { RouteMetadata, RouteStatus, RouteWaypoint } from '../../routing/types'

type RoutePlannerProps = {
  waypoints: RouteWaypoint[]
  stops: RouteWaypoint[]
  metadata: RouteMetadata | null
  status: RouteStatus
  error: string | null
  onSelectAddress: (waypointId: string, suggestion: AddressSuggestion) => void
  onClearWaypoint: (waypointId: string) => void
  onAddStop: () => void
  onClearAll: () => void
  onRemoveStop: (waypointId: string) => void
  onReorderStops: (activeId: string, overId: string) => void
}

export function RoutePlanner({
  waypoints,
  stops,
  metadata,
  status,
  error,
  onSelectAddress,
  onClearWaypoint,
  onAddStop,
  onClearAll,
  onRemoveStop,
  onReorderStops,
}: RoutePlannerProps) {
  const { t } = useAppTranslation()
  const start = waypoints.find((waypoint) => waypoint.role === 'start')
  const destination = waypoints.find((waypoint) => waypoint.role === 'destination')
  const stopIds = useMemo(() => stops.map((stop) => stop.id), [stops])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    onReorderStops(String(active.id), String(over.id))
  }

  if (!start || !destination) return null

  return (
    <S.PlannerPanel aria-label={t('Route planner')}>
      <S.PlannerHeader>
        <S.PlannerTitle>{t('Plan route')}</S.PlannerTitle>
        <S.HeaderActions>
          <S.AddStopButton
            type="button"
            onClick={onAddStop}
            title={t('Add stop')}
            aria-label={t('Add stop')}
          >
            +
          </S.AddStopButton>
          <S.ClearAllButton
            type="button"
            onClick={onClearAll}
            title={t('Clear all')}
            aria-label={t('Clear all')}
          >
            x
          </S.ClearAllButton>
        </S.HeaderActions>
      </S.PlannerHeader>
      <S.WaypointList>
        <WaypointRow
          key={`${start.id}:${start.label}:${start.lat}:${start.lon}`}
          waypoint={start}
          badge="S"
          badgeColor={START_COLOR}
          placeholder={t('Start address')}
          onSelectAddress={onSelectAddress}
          onClearWaypoint={onClearWaypoint}
        />
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stopIds} strategy={verticalListSortingStrategy}>
            {stops.map((stop, index) => (
              <SortableStopRow
                key={stop.id}
                waypoint={stop}
                index={index}
                badge={`${index + 1}`}
                badgeColor={STOP_COLOR}
                placeholder={t('Next stop')}
                onSelectAddress={onSelectAddress}
                onClearWaypoint={onClearWaypoint}
                onRemoveStop={onRemoveStop}
              />
            ))}
          </SortableContext>
        </DndContext>
        <WaypointRow
          key={`${destination.id}:${destination.label}:${destination.lat}:${destination.lon}`}
          waypoint={destination}
          badge="F"
          badgeColor={DESTINATION_COLOR}
          placeholder={t('Destination address')}
          onSelectAddress={onSelectAddress}
          onClearWaypoint={onClearWaypoint}
        />
      </S.WaypointList>
      {(status !== 'idle' || error) && (
        <S.EstimationPanel>
          {status === 'loading' && <S.EstimationState>{t('Loading route…')}</S.EstimationState>}
          {status === 'error' && error && <S.EstimationError>{error}</S.EstimationError>}
          {status === 'success' && metadata && (
            <S.EstimationGrid>
              <S.EstimationItem>
                <S.EstimationLabel>{t('Distance')}</S.EstimationLabel>
                <S.EstimationValue>{formatDistance(metadata.distanceMeters)}</S.EstimationValue>
              </S.EstimationItem>
              <S.EstimationItem>
                <S.EstimationLabel>{t('ETA')}</S.EstimationLabel>
                <S.EstimationValue>{formatETA(metadata.etaSeconds)}</S.EstimationValue>
              </S.EstimationItem>
            </S.EstimationGrid>
          )}
        </S.EstimationPanel>
      )}
    </S.PlannerPanel>
  )
}
