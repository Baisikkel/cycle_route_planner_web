import type { AddressSuggestion } from '@api/address'
import { CSS, useSortable } from '@lib/dnd'
import { useAppTranslation } from '@lib/i18n'

import { STOP_COLOR } from './config'
import * as S from './RoutePlanner.styled'
import { WaypointRow } from './WaypointRow'
import type { RouteWaypoint } from '../useRoute'

type SortableStopRowProps = {
  waypoint: RouteWaypoint
  badge: string
  badgeColor: string
  placeholder: string
  index: number
  onSelectAddress: (waypointId: string, suggestion: AddressSuggestion) => void
  onClearWaypoint: (waypointId: string) => void
  onRemoveStop: (waypointId: string) => void
}

export function SortableStopRow(props: SortableStopRowProps) {
  const { t } = useAppTranslation()
  const { waypoint, index, onRemoveStop } = props
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: waypoint.id })

  return (
    <WaypointRow
      {...props}
      badge={`${index + 1}`}
      badgeColor={STOP_COLOR}
      shellRef={setNodeRef}
      shellStyle={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      dragging={isDragging}
      controls={
        <S.IconButton
          type="button"
          onClick={() => onRemoveStop(waypoint.id)}
          aria-label={t('Remove stop')}
          title={t('Remove stop')}
        >
          -
        </S.IconButton>
      }
      leftControl={
        <S.InlineDragHandleButton
          type="button"
          ref={setActivatorNodeRef}
          aria-label={t('Reorder stop')}
          title={t('Reorder stop')}
          {...attributes}
          {...listeners}
        >
          <S.Grip>
            <span />
          </S.Grip>
        </S.InlineDragHandleButton>
      }
    />
  )
}
