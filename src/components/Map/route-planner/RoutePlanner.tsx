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
import type { RouteWaypoint } from '../routing/types'

type RoutePlannerProps = {
  waypoints: RouteWaypoint[]
  stops: RouteWaypoint[]
  onSelectAddress: (waypointId: string, suggestion: AddressSuggestion) => void
  onClearWaypoint: (waypointId: string) => void
  onAddStop: () => void
  onRemoveStop: (waypointId: string) => void
  onReorderStops: (activeId: string, overId: string) => void
}

export function RoutePlanner({
  waypoints,
  stops,
  onSelectAddress,
  onClearWaypoint,
  onAddStop,
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
        <S.AddStopButton type="button" onClick={onAddStop}>
          {t('Add stop')}
        </S.AddStopButton>
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
                placeholder={t('Stop address')}
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
    </S.PlannerPanel>
  )
}
