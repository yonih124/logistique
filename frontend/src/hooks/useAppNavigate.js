import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { HOME_PATH, PAGES } from '@/app/routes'

/** Navigue vers une page à partir de son identifiant (ex. `'requests'`). */
export function useAppNavigate() {
  const navigate = useNavigate()
  return useCallback(id => navigate(PAGES[id]?.path || HOME_PATH), [navigate])
}
