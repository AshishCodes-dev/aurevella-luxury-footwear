import { useEffect, useState } from 'react'

export default function App() {
  const [backendStatus, setBackendStatus] = useState('checking...')

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
        const res = await fetch(`${apiUrl}/api/health`)
        if (res.ok) {
          const data = await res.json()
          if (data && data.status === 'ok') {
            setBackendStatus('connected')
          } else {
            setBackendStatus('not reachable')
          }
        } else {
          setBackendStatus('not reachable')
        }
      } catch {
        setBackendStatus('not reachable')
      }
    }

    checkHealth()
  }, [])

  return (
    <div className="min-h-screen bg-[#0F0A09] text-[#CFC9BA] flex flex-col items-center justify-center px-4 select-none">
      <header className="text-center space-y-4">
        <h1 className="text-5xl md:text-7xl font-serif tracking-widest uppercase text-[#CFC9BA]">
          AUREVELLA
        </h1>
        <p className="text-lg md:text-xl text-[#CFC9BA]/80 tracking-wide font-light">
          Luxury, Reimagined. Website coming soon.
        </p>
      </header>

      <footer className="mt-16 text-sm text-[#CFC9BA]/60 tracking-wider">
        <span>Backend: </span>
        <span
          className={
            backendStatus === 'connected'
              ? 'text-emerald-400 font-medium'
              : backendStatus === 'not reachable'
              ? 'text-rose-400 font-medium'
              : 'text-amber-300 font-medium'
          }
        >
          {backendStatus}
        </span>
      </footer>
    </div>
  )
}
