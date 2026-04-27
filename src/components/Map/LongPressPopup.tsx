import { Popup } from 'react-map-gl/maplibre'

import { useAppTranslation } from '@lib/i18n'

import { PopupChoice, PopupContent, PopupPinDot, PopupPinIcon, PopupPinTip } from './Map.styled'
import { DESTINATION_COLOR, START_COLOR } from './mapConfig'
import type { LatLon } from './routing/types'

type LongPressPopupProps = {
  point: LatLon
  onClose: () => void
  onSetStart: () => void
  onSetDestination: () => void
}

export function LongPressPopup({
  point,
  onClose,
  onSetStart,
  onSetDestination,
}: LongPressPopupProps) {
  const { t } = useAppTranslation()

  return (
    <Popup
      latitude={point.lat}
      longitude={point.lon}
      anchor="bottom"
      closeButton={false}
      closeOnClick={false}
      onClose={onClose}
    >
      <PopupContent>
        <PopupChoice
          $color={START_COLOR}
          onClick={onSetStart}
          title={t('Set as start')}
          aria-label={t('Set as start')}
        >
          <PopupPinDot $color={START_COLOR}>
            <PopupPinIcon>S</PopupPinIcon>
          </PopupPinDot>
          <PopupPinTip $color={START_COLOR} />
        </PopupChoice>
        <PopupChoice
          $color={DESTINATION_COLOR}
          onClick={onSetDestination}
          title={t('Set as destination')}
          aria-label={t('Set as destination')}
        >
          <PopupPinDot $color={DESTINATION_COLOR}>
            <PopupPinIcon>F</PopupPinIcon>
          </PopupPinDot>
          <PopupPinTip $color={DESTINATION_COLOR} />
        </PopupChoice>
      </PopupContent>
    </Popup>
  )
}
