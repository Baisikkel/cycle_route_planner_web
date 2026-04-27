import type { CSSProperties, ReactNode } from 'react'

import type { AddressSuggestion } from '@api/address'
import { useAppTranslation } from '@lib/i18n'

import * as S from './RoutePlanner.styled'
import { useAddressAutocomplete } from './useAddressAutocomplete'
import { getSuggestionMeta } from './utils'
import type { RouteWaypoint } from '../useRoute'

type WaypointRowProps = {
  waypoint: RouteWaypoint
  badge: string
  badgeColor: string
  placeholder: string
  onSelectAddress: (waypointId: string, suggestion: AddressSuggestion) => void
  onClearWaypoint: (waypointId: string) => void
  controls?: ReactNode
  leftControl?: ReactNode
  shellRef?: (element: HTMLDivElement | null) => void
  shellStyle?: CSSProperties
  dragging?: boolean
}

export function WaypointRow({
  waypoint,
  badge,
  badgeColor,
  placeholder,
  onSelectAddress,
  onClearWaypoint,
  controls,
  leftControl,
  shellRef,
  shellStyle,
  dragging,
}: WaypointRowProps) {
  const { t } = useAppTranslation()
  const autocomplete = useAddressAutocomplete({
    initialLabel: waypoint.label,
    selectedLabel: waypoint.label,
    hasSelectedPoint: waypoint.lat !== null && waypoint.lon !== null,
  })

  const handleClear = () => {
    autocomplete.clear()
    onClearWaypoint(waypoint.id)
  }

  return (
    <S.WaypointRowShell ref={shellRef} style={shellStyle} $dragging={dragging}>
      <S.RoleBadge $color={badgeColor}>{badge}</S.RoleBadge>
      <S.FieldColumn>
        {leftControl && <S.InlineLeftControl>{leftControl}</S.InlineLeftControl>}
        <S.AddressInput
          value={autocomplete.query}
          placeholder={placeholder}
          $hasLeftControl={Boolean(leftControl)}
          autoComplete="off"
          inputMode="search"
          onBlur={autocomplete.handleBlur}
          onChange={(event) => autocomplete.updateQuery(event.target.value)}
          onFocus={autocomplete.handleFocus}
        />
        {(autocomplete.query || waypoint.lat !== null || waypoint.lon !== null) && (
          <S.ClearButton
            type="button"
            onClick={handleClear}
            aria-label={t('Clear address')}
            title={t('Clear address')}
          >
            x
          </S.ClearButton>
        )}
        {autocomplete.showSuggestions && (
          <S.SuggestionList role="listbox" aria-label={t('Address suggestions')}>
            {autocomplete.status === 'loading' && (
              <S.SuggestionState>{t('Searching addresses...')}</S.SuggestionState>
            )}
            {autocomplete.status === 'error' && (
              <S.SuggestionState>{t('Address search failed')}</S.SuggestionState>
            )}
            {autocomplete.status === 'success' && autocomplete.suggestions.length === 0 && (
              <S.SuggestionState>{t('No address results')}</S.SuggestionState>
            )}
            {autocomplete.suggestions.map((suggestion) => {
              const meta = getSuggestionMeta(suggestion)
              return (
                <S.SuggestionButton
                  key={suggestion.id}
                  type="button"
                  role="option"
                  onPointerDown={(event) => {
                    event.preventDefault()
                    autocomplete.selectSuggestion(suggestion)
                    onSelectAddress(waypoint.id, suggestion)
                  }}
                >
                  <S.SuggestionLabel>{suggestion.label}</S.SuggestionLabel>
                  {meta && <S.SuggestionMeta>{meta}</S.SuggestionMeta>}
                </S.SuggestionButton>
              )
            })}
          </S.SuggestionList>
        )}
      </S.FieldColumn>
      {controls ?? <span />}
    </S.WaypointRowShell>
  )
}
