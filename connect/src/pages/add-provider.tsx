import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMemo } from 'react'
import { ProviderInfo } from '../../../shared/provider'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/Button'
import { ShieldAlert, Server, Globe, Key } from 'lucide-react'

const InfoRow = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null
  return (
    <div className="flex flex-col gap-1 py-2 border-b border-white/10">
      <span className="text-xs text-white/40 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-white/80 break-all">{value}</span>
    </div>
  )
}

export const Component = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addProvider, providers, setProvider } = useAuth()

  const providerInfo = useMemo(() => {
    const info = searchParams.get('info')
    if (!info) return null
    try {
      const decoded = JSON.parse(atob(info))
      return ProviderInfo.parse(decoded)
    } catch {
      return null
    }
  }, [searchParams])

  if (!providerInfo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <ShieldAlert className="w-16 h-16 text-red-500" />
          <h1 className="text-2xl font-bold">Invalid Provider</h1>
          <p className="text-white/60">The provider information is missing or invalid.</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    )
  }

  const alreadyExists = providerInfo.name in providers

  const handleAdd = () => {
    addProvider(providerInfo)
    setProvider(providerInfo.name as any)
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="flex flex-col gap-6 max-w-lg w-full">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold">Add Custom Provider</h1>
          <p className="text-white/60">You are about to add a custom provider. Only proceed if you trust the source.</p>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Server className="w-5 h-5" />
            {providerInfo.title}
          </h2>

          <div className="flex flex-col">
            <InfoRow label="Name" value={providerInfo.name} />
            <InfoRow label="API URL" value={providerInfo.apiUrl} />
            <InfoRow label="Athena URL" value={providerInfo.athenaUrl} />
            <InfoRow label="Auth URL" value={providerInfo.authUrl} />
            <InfoRow label="Device Host" value={providerInfo.deviceHost} />
          </div>

          {(providerInfo.googleClientId || providerInfo.githubClientId || providerInfo.appleClientId) && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-white/60">
                <Key className="w-4 h-4" />
                Authentication
              </h3>
              <div className="flex flex-col">
                {providerInfo.googleClientId && <InfoRow label="Google Client ID" value={providerInfo.googleClientId} />}
                {providerInfo.githubClientId && <InfoRow label="GitHub Client ID" value={providerInfo.githubClientId} />}
                {providerInfo.appleClientId && <InfoRow label="Apple Client ID" value={providerInfo.appleClientId} />}
              </div>
            </div>
          )}
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex gap-3">
            <Globe className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-medium text-red-400">Security Warning</span>
              <span className="text-sm text-white/60">This provider will have access to your device data. Only add providers from sources you trust.</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => navigate('/login')}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleAdd}>
            {alreadyExists ? 'Update Provider' : 'Add Provider'}
          </Button>
        </div>
      </div>
    </div>
  )
}
