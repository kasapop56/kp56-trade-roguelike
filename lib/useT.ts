'use client'

import { useGameStore } from '@/store/gameStore'
import { translate } from './i18n'
import { useCallback } from 'react'

export function useT() {
  const lang = useGameStore(s => s.settings.language)
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(lang, key, params),
    [lang],
  )
  return { t, lang }
}
