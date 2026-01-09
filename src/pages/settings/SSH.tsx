import { useState } from 'react'
import { useRouteParams } from '../../utils/hooks'
import { accessToken } from '../../utils/helpers'
import { env } from '../../utils/env'
import { Icon } from '../../components/Icon'
import { toast } from 'sonner'

const getProvider = (mode: string) => (mode === 'konik' ? 'konik' : mode === 'comma' ? 'comma' : 'asius')

export const SSH = () => {
  const { dongleId } = useRouteParams()
  const token = accessToken()
  const [showToken, setShowToken] = useState(false)

  if (!dongleId) return null

  const provider = getProvider(env.MODE)
  const needsToken = provider !== 'asius'
  // For comma/konik, the hostname includes the token: provider-dongleId-token
  const hostname = needsToken && token ? `${provider}-${dongleId}-${token}` : `${provider}-${dongleId}`
  const hostnameHidden = needsToken && token ? `${provider}-${dongleId}-***` : `${provider}-${dongleId}`

  // SSH config uses %n to pass the full hostname (including token) as the proxy username
  // ProxyCommand is used instead of ProxyJump because %n expands correctly in ProxyCommand
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
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold px-2">SSH Remote Access</h2>
      <div className="bg-background-alt rounded-xl p-4 flex flex-col gap-4">
        <p className="text-sm text-white/70">
          SSH into your device from anywhere using{' '}
          <a href="https://ssh.asius.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            ssh.asius.ai
          </a>
        </p>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Quick connect:</p>
          <div className="relative">
            <pre className="bg-black/30 p-3 rounded-lg text-xs font-mono overflow-x-auto">{showToken || !needsToken ? quickCommand : quickCommandHidden}</pre>
            <div className="absolute top-2 right-2 flex gap-1">
              {needsToken && token && (
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors"
                  title={showToken ? 'Hide token' : 'Show token'}
                >
                  <Icon name={showToken ? 'visibility_off' : 'visibility'} className="text-sm" />
                </button>
              )}
              <button
                onClick={() => copyToClipboard(quickCommand, 'SSH command')}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors"
                title="Copy to clipboard"
              >
                <Icon name="file_copy" className="text-sm" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            Or add to <code className="bg-white/10 px-1 rounded">~/.ssh/config</code>:
          </p>
          <div className="relative">
            <pre className="bg-black/30 p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre">{sshConfig}</pre>
            <button
              onClick={() => copyToClipboard(sshConfig, 'SSH config')}
              className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors"
              title="Copy to clipboard"
            >
              <Icon name="file_copy" className="text-sm" />
            </button>
          </div>
          <p className="text-xs text-white/50">
            Then connect with: <code className="bg-white/10 px-1 rounded">ssh {showToken || !needsToken ? hostname : hostnameHidden}</code>
          </p>
        </div>

        {needsToken && <p className="text-xs text-yellow-400/80">Include your auth token in the hostname when connecting.</p>}
      </div>
    </div>
  )
}
