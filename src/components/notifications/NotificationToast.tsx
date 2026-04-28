import React from 'react'
import { useTranslation } from 'react-i18next'

import * as S from './NotificationToast.styled'

export type ErrorType = 'gps_lost' | 'off_course' | 'server_error' | 'rerouting' | 'offline'

interface Props {
  errorType: ErrorType | null
  onClose: () => void
}

export const NotificationToast: React.FC<Props> = ({ errorType, onClose }) => {
  const { t } = useTranslation()

  if (!errorType) return null

  return (
    <S.ToastContainer $isVisible={!!errorType} $errorType={errorType}>
      <span>{t(`notifications.${errorType}`)}</span>
      <S.CloseButton onClick={onClose}>{t('notifications.close')}</S.CloseButton>
    </S.ToastContainer>
  )
}
