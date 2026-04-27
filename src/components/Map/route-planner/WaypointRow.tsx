import type { CSSProperties, ReactNode } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { AddressSuggestion } from '@api/address'
import { useAppTranslation } from '@lib/i18n'

import * as S from './RoutePlanner.styled'
import { useAddressAutocomplete } from './useAddressAutocomplete'
import { getSuggestionMeta } from './utils'
import type { RouteWaypoint } from '../routing/types'

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

  const fieldRef = useRef<HTMLDivElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  useLayoutEffect(() => {
    if (autocomplete.showSuggestions && fieldRef.current) {
      const rect = fieldRef.current.getBoundingClientRect()
      setDropdownStyle({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    } else {
      setDropdownStyle(null)
    }
  }, [autocomplete.showSuggestions])

  const handleClear = () => {
    autocomplete.clear()
    onClearWaypoint(waypoint.id)
  }

  return (
    <S.WaypointRowShell ref={shellRef} style={shellStyle} $dragging={dragging}>
      <S.RoleBadge $color={badgeColor}>{badge}</S.RoleBadge>
      <S.FieldColumn ref={fieldRef}>
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
        {autocomplete.showSuggestions &&
          dropdownStyle &&
          createPortal(
            <S.SuggestionList
              role="listbox"
              aria-label={t('Address suggestions')}
              style={{
                position: 'fixed',
                top: dropdownStyle.top,
                left: dropdownStyle.left,
                width: dropdownStyle.width,
                right: 'auto',
              }}
            >
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
            </S.SuggestionList>,
            document.body,
          )}
      </S.FieldColumn>
      {controls ?? <span />}
    </S.WaypointRowShell>
  )
}
