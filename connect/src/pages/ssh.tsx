import { useState } from 'react'
import { TopAppBar } from '../components/TopAppBar'
import { BackButton } from '../components/BackButton'
import { useRouteParams } from '../utils/hooks'
import { accessToken } from '../utils/helpers'
import { env } from '../utils/env'
import { Icon } from '../components/Icon'
import { toast } from 'sonner'

const getProvider = (mode: string) => (mode === 'konik' ? 'konik' : mode === 'comma' ? 'comma' : 'asius')

export const Component = () => {
  const { dongleId } = useRouteParams()
  const token = accessToken()
  const [showToken, setShowToken] = useState(false)

  if (!dongleId) return null

  const provider = getProvider(env.MODE)
  const needsToken = provider !== 'asius'
  const hostname = needsToken && token ? `${provider}-${dongleId}-${token}` : `${provider}-${dongleId}`
  const hostnameHidden = needsToken && token ? `${provider}-${dongleId}-****` : `${provider}-${dongleId}`

  const sshConfig = `Host ${provider}-*
  HostName localhost
  User comma
  ProxyCommand ssh -W %h:%p %n@ssh.asius.ai -p 2222
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null`

  const quickCommand = `ssh -J ${hostname}@ssh.asius.ai:2222 comma@localhost`
  const quickCommandHidden = `ssh -J ${hostnameHidden}@ssh.asius.ai:2222 comma@localhost`

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TopAppBar leading={<BackButton href={`/${dongleId}`} />}>SSH Access</TopAppBar>

      <div className="flex flex-col gap-6 px-4 py-6 pb-20 max-w-2xl mx-auto w-full">
        <div className="flex flex-col gap-2 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
            <Icon name="terminal" className="text-3xl text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Remote SSH Access</h1>
          <p className="text-white/60">
            Connect to your device from anywhere using{' '}
            <a href="https://ssh.asius.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              ssh.asius.ai
            </a>
          </p>
        </div>

        <div className="bg-background-alt rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
              <Icon name="bolt" className="text-xl text-green-400" />
            </div>
            <div>
              <h2 className="font-semibold">Quick Connect</h2>
              <p className="text-xs text-white/50">One-line command to connect instantly</p>
            </div>
          </div>

          <div className="relative">
            <pre className="bg-black/40 p-4 rounded-lg text-sm font-mono overflow-x-auto border border-white/5">
              {showToken || !needsToken ? quickCommand : quickCommandHidden}
            </pre>
            <div className="absolute top-2.5 right-2.5 flex gap-1.5">
              {needsToken && token && (
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  title={showToken ? 'Hide token' : 'Show token'}
                >
                  <Icon name={showToken ? 'visibility_off' : 'visibility'} className="text-base" />
                </button>
              )}
              <button
                onClick={() => copyToClipboard(quickCommand, 'SSH command')}
                className="p-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
                title="Copy to clipboard"
              >
                <Icon name="file_copy" className="text-base" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-background-alt rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
              <Icon name="settings" className="text-xl text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold">SSH Config</h2>
              <p className="text-xs text-white/50">
                Add to <code className="bg-white/10 px-1.5 py-0.5 rounded text-white/70">~/.ssh/config</code> for easier access
              </p>
            </div>
          </div>

          <div className="relative">
            <pre className="bg-black/40 p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre border border-white/5">
              {sshConfig}
            </pre>
            <button
              onClick={() => copyToClipboard(sshConfig, 'SSH config')}
              className="absolute top-2.5 right-2.5 p-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              <Icon name="file_copy" className="text-base" />
            </button>
          </div>

          <div className="relative">
            <div className="bg-black/20 rounded-lg p-3 pr-12 flex items-center gap-2">
              <span className="text-sm text-white/60">Then connect with:</span>
              <code className="text-sm font-mono text-white/80">ssh {showToken || !needsToken ? hostname : hostnameHidden}</code>
            </div>
            <button
              onClick={() => copyToClipboard(`ssh ${hostname}`, 'SSH command')}
              className="absolute top-1/2 -translate-y-1/2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              <Icon name="file_copy" className="text-sm" />
            </button>
          </div>
        </div>

        {needsToken && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
            <Icon name="warning" className="text-yellow-400 text-xl shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-400">Authentication Required</p>
              <p className="text-yellow-400/70 mt-1">Your auth token must be included in the hostname when connecting. The token is automatically included in the commands above.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
