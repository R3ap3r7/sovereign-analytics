import { useEffect, useState } from 'react'

export const useAsyncResource = <T,>(load: () => Promise<T>, deps: React.DependencyList) => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    void load()
      .then((result) => {
        if (!mounted) return
        setData(result)
      })
      .catch((reason: unknown) => {
        if (!mounted) return
        setError(reason instanceof Error ? reason.message : 'Failed to load resource.')
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, deps)

  return { data, loading, error, setData }
}
