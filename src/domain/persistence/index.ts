import type { AdminMarketMutation, Session, Settings } from '../types'

const KEY_PREFIX = 'sovereign-analytics'

type StorageKey =
  | 'session'
  | 'settings'
  | 'simulations'
  | 'notes'
  | 'watchlist'
  | 'alerts'
  | 'portfolio'
  | 'visited'
  | 'filters'
  | 'admin-mutation'
  | 'onboarding'

const key = (value: StorageKey) => `${KEY_PREFIX}:${value}`

export const storage = {
  get<T>(storageKey: StorageKey, fallback: T): T {
    const raw = window.localStorage.getItem(key(storageKey))
    if (!raw) return fallback
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },
  set<T>(storageKey: StorageKey, value: T) {
    window.localStorage.setItem(key(storageKey), JSON.stringify(value))
  },
  remove(storageKey: StorageKey) {
    window.localStorage.removeItem(key(storageKey))
  },
  reset() {
    Object.keys(window.localStorage)
      .filter((itemKey) => itemKey.startsWith(KEY_PREFIX))
      .forEach((itemKey) => window.localStorage.removeItem(itemKey))
  },
}

export const sessionStorageApi = {
  read: () => storage.get<Session | null>('session', null),
  write: (session: Session | null) => (session ? storage.set('session', session) : storage.remove('session')),
}

export const settingsStorageApi = {
  read: () => storage.get<Record<string, Settings>>('settings', {}),
  write: (value: Record<string, Settings>) => storage.set('settings', value),
}

export const mutationStorageApi = {
  readAdminMutation: () =>
    storage.get<AdminMarketMutation>('admin-mutation', {
      currencyShifts: {},
      pairVolatilityShifts: {},
      newsToneShifts: {},
      triggeredEventIds: [],
    }),
  writeAdminMutation: (value: AdminMarketMutation) => storage.set('admin-mutation', value),
}
