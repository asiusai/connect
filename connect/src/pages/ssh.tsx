import { ReactNode, useMemo } from 'react'
import { TopAppBar } from '../components/TopAppBar'
import { BackButton } from '../components/BackButton'
import { useRouteParams } from '../utils/hooks'
import { accessToken } from '../utils/helpers'
import { encryptToken } from '../utils/encryption'
import { env } from '../../../shared/env'
import { Icon } from '../components/Icon'
import { Button } from '../components/Button'
import { toast } from 'sonner'
import { useDevice } from './device/useDevice'
import clsx from 'clsx'

const Copy = ({ value, children }: { value: string; children?: ReactNode }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`Copied to clipboard`)
  }
  return (
    <div className="group relative">
      <pre className="bg-black/40 px-3 py-2 md:px-4 md:py-3 rounded-lg text-xs md:text-sm font-mono overflow-x-auto whitespace-pre border border-white/5">
        {value}
      </pre>
      <div className="absolute top-1 right-1 md:top-2 md:right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {children}
        <button
          onClick={() => copyToClipboard(value)}
          className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded transition-colors"
          title="Copy"
        >
          <Icon name="file_copy" className="text-xs md:text-sm" />
        </button>
      </div>
    </div>
  )
}

export const Component = () => {
  const { dongleId } = useRouteParams()
  const { get } = useDevice()

  const token = accessToken()!
  const encToken = useMemo(() => encryptToken(token, env.ENCRYPTION_KEY), [token])

  if (!dongleId || !encToken) return null

  const githubUsername = get('GithubUsername')
  const isSharedKey = githubUsername === env.SSH_USERNAME

  const sshConfig = `Host ${env.MODE}-*
  HostName localhost
  User comma
  ProxyCommand ssh -W %h:%p %n-${encToken}@ssh.asius.ai -p 2222`

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

        <div className="bg-background-alt rounded-xl p-4 md:p-5 flex flex-col gap-3 md:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
              <Icon name="terminal" className="text-lg md:text-xl text-cyan-400" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-sm md:text-base">Browser Terminal</h2>
              <p className="text-xs md:text-sm text-white/50">Connect directly from your browser</p>
            </div>
            <Button href={`/${dongleId}/terminal`} leading={<Icon name="open_in_new" />}>
              Open
            </Button>
          </div>
          <div
            className={clsx(isSharedKey ? 'bg-green-500/5 border-green-500/15' : 'bg-white/5 border-white/10', 'border rounded-lg p-2 flex items-center gap-2')}
          >
            <Icon name={isSharedKey ? 'check' : 'info'} className={clsx(isSharedKey ? 'text-green-500' : 'text-white/50', 'text-lg shrink-0 mt-0.5')} />
            {isSharedKey ? (
              <p className="text-xs text-green-400/80">
                Key set to <code className="bg-white/10 px-1 rounded">{env.SSH_USERNAME}</code>, good to go!
              </p>
            ) : (
              <p className="text-xs text-white/50">
                To use browser terminal, set the key to <code className="bg-white/10 px-1 rounded">{env.SSH_USERNAME}</code> on your device, current key:{' '}
                <code className="bg-white/10 px-1 rounded">{githubUsername}</code>
              </p>
            )}
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-center gap-2">
            <Icon name="warning" className="text-yellow-400 text-lg shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-400/80">
              Browser terminal requires setting your device's SSH key to <code className="bg-white/10 px-1 rounded">{env.SSH_USERNAME}</code>. This reduces
              security as it relies only on connect authentication, for maximum security, use CLI access with your own SSH keys.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/40 uppercase">CLI access</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="bg-background-alt rounded-xl p-4 md:p-5 flex flex-col gap-3 md:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
              <Icon name="bolt" className="text-lg md:text-xl text-green-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm md:text-base">Quick Connect</h2>
              <p className="text-xs md:text-sm text-white/50">One-line command to connect instantly</p>
            </div>
          </div>
          <Copy value={`ssh -o ProxyCommand="ssh -W %h:%p ${env.MODE}-${dongleId}-${encToken}@ssh.asius.ai -p 2222" comma@localhost`} />
        </div>

        <div className="bg-background-alt rounded-xl p-4 md:p-5 flex flex-col gap-3 md:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
              <Icon name="settings" className="text-lg md:text-xl text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm md:text-base">SSH Config</h2>
              <p className="text-xs md:text-sm text-white/50">
                Add to <code className="bg-white/10 px-1 rounded text-white/70">~/.ssh/config</code>
              </p>
            </div>
          </div>

          <Copy value={sshConfig} />
          <p className="text-xs md:text-sm text-white/50">Then connect with:</p>
          <Copy value={`ssh ${env.MODE}-${dongleId}`} />
        </div>
      </div>
    </div>
  )
}
