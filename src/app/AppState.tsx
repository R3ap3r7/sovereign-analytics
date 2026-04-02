import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { appApi } from '../domain/services/api'
import type { AdminMarketMutation, Settings, Simulation, User } from '../domain/types'

interface AppStateValue {
  user: User | null
  loading: boolean
  activeSimulation: Simulation | null
  setActiveSimulation: (simulation: Simulation | null) => void
  refreshUser: () => Promise<void>
  saveSettings: (settings: Settings) => Promise<void>
  adminMutation: AdminMarketMutation
  setAdminMutation: (mutation: AdminMarketMutation) => Promise<void>
}

const AppStateContext = createContext<AppStateValue | null>(null)

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSimulation, setActiveSimulation] = useState<Simulation | null>(null)
  const [adminMutation, setMutationState] = useState<AdminMarketMutation>(appApi.getAdminMutation())

  const refreshUser = async () => {
    setLoading(true)
    try {
      await appApi.hydrate()
      setUser(appApi.getCurrentUser())
      setMutationState(appApi.getAdminMutation())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshUser()
  }, [])

  const value = useMemo<AppStateValue>(
    () => ({
      user,
      loading,
      activeSimulation,
      setActiveSimulation,
      refreshUser,
      saveSettings: async (settings) => {
        await appApi.saveSettings(settings)
        await refreshUser()
      },
      adminMutation,
      setAdminMutation: async (mutation) => {
        setMutationState(mutation)
        await appApi.applyAdminMutation(mutation)
      },
    }),
    [user, loading, activeSimulation, adminMutation],
  )

  if (loading) return null

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export const useAppState = () => {
  const value = useContext(AppStateContext)
  if (!value) throw new Error('useAppState must be used within AppStateProvider')
  return value
}
