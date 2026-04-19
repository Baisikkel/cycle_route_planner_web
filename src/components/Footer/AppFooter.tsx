import { useAppTranslation } from '@lib/i18n'

import { Inner, Shell } from './Footer.styled'

export function AppFooter() {
  const year = new Date().getFullYear()

  const { t } = useAppTranslation()
  return (
    <Shell>
      <Inner>
        © {year} {t('Baisikkel Route Planner. All rights reserved.')}
      </Inner>
    </Shell>
  )
}
