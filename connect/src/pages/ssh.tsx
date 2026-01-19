import { useState } from 'react'
import { TopAppBar } from '../components/TopAppBar'
import { BackButton } from '../components/BackButton'
import { useRouteParams } from '../utils/hooks'
import { accessToken } from '../utils/helpers'
import { env } from '../utils/env'
import { Icon } from '../components/Icon'
import { Button } from '../components/Button'
import { toast } from 'sonner'
import { useDeviceParams } from './device/useDeviceParams'

const getProvider = (mode: string) => (mode === 'konik' ? 'konik' : mode === 'comma' ? 'comma' : 'asius')

export const Component = () => {
  const { dongleId } = useRouteParams()
  const token = accessToken()
  const [showToken, setShowToken] = useState(false)
  const [settingKey, setSettingKey] = useState(false)
  const { get, setSSHKey } = useDeviceParams()
  const sshKeys = get('GithubUsername')

  if (!dongleId) return null

  const hasOuasius = sshKeys?.toLowerCase().includes('ouasius')

  const setOuasiusKey = async () => {
    if (!dongleId || settingKey) return
    setSettingKey(true)
    try {
      const res = await setSSHKey('ouasius')
      if (res?.error) {
        toast.error(res.error.message || 'Failed to set SSH key')
      } else {
        toast.success('SSH key set to ouasius')
        window.location.reload()
      }
    } catch {
      toast.error('Failed to set SSH key')
    } finally {
      setSettingKey(false)
    }
  }

  const provider = getProvider(env.MODE)
  const hostname = token ? `${provider}-${dongleId}-${token}` : `${provider}-${dongleId}`
  const hostnameHidden = token ? `${provider}-${dongleId}-****` : `${provider}-${dongleId}`

  const sshConfig = `Host ${provider}-*
  HostName localhost
  User comma
  ProxyCommand ssh -W %h:%p %n@ssh.asius.ai -p 2222
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null`

  const sshOpts = '-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null'
  const quickCommand = `ssh ${sshOpts} -o ProxyCommand="ssh ${sshOpts} -W %h:%p ${hostname}@ssh.asius.ai -p 2222" comma@localhost`
  const quickCommandHidden = `ssh ${sshOpts} -o ProxyCommand="ssh ${sshOpts} -W %h:%p ${hostnameHidden}@ssh.asius.ai -p 2222" comma@localhost`
  const shortCommand = `ssh ${hostname}`
  const shortCommandHidden = `ssh ${hostnameHidden}`

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

        <div className={`bg-background-alt rounded-xl p-4 md:p-5 flex flex-col gap-3 md:gap-4 ${hasOuasius ? 'ring-1 ring-green-500/30' : ''}`}>
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0 ${hasOuasius ? 'bg-green-500/20' : 'bg-cyan-500/20'}`}
            >
              <Icon name="terminal" className={`text-lg md:text-xl ${hasOuasius ? 'text-green-400' : 'text-cyan-400'}`} />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-sm md:text-base">Browser Terminal</h2>
              <p className="text-xs md:text-sm text-white/50">Connect directly from your browser</p>
            </div>
            <Button href={`/${dongleId}/terminal`} leading={<Icon name="open_in_new" />}>
              Open
            </Button>
          </div>
          {sshKeys !== undefined && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white/40">Device SSH Keys:</span>
              {sshKeys ? <span className="text-white/60 font-mono">{sshKeys}</span> : <span className="text-white/40 italic">not set</span>}
              {hasOuasius ? (
                <span className="text-green-400 flex items-center gap-1">
                  <Icon name="check" className="text-sm" /> Ready
                </span>
              ) : (
                <span className="text-yellow-400 flex items-center gap-1">
                  <Icon name="warning" className="text-sm" /> Add ouasius
                </span>
              )}
            </div>
          )}
          {sshKeys !== undefined && !hasOuasius && (
            <Button color="secondary" onClick={setOuasiusKey} loading={settingKey}>
              Set SSH key to ouasius
            </Button>
          )}
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

          <div className="group relative">
            <pre className="bg-black/40 px-3 py-2 md:px-4 md:py-3 rounded-lg text-xs md:text-sm font-mono overflow-x-auto border border-white/5">
              {showToken ? quickCommand : quickCommandHidden}
            </pre>
            <div className="absolute top-1 right-1 md:top-2 md:right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {token && (
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded transition-colors"
                  title={showToken ? 'Hide token' : 'Show token'}
                >
                  <Icon name={showToken ? 'visibility_off' : 'visibility'} className="text-xs md:text-sm" />
                </button>
              )}
              <button
                onClick={() => copyToClipboard(quickCommand, 'Command')}
                className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded transition-colors"
                title="Copy"
              >
                <Icon name="file_copy" className="text-xs md:text-sm" />
              </button>
            </div>
          </div>
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

          <div className="group relative">
            <pre className="bg-black/40 px-3 py-2 md:px-4 md:py-3 rounded-lg text-xs md:text-sm font-mono overflow-x-auto whitespace-pre border border-white/5">
              {sshConfig}
            </pre>
            <button
              onClick={() => copyToClipboard(sshConfig, 'Config')}
              className="absolute top-1 right-1 md:top-2 md:right-2 w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Copy"
            >
              <Icon name="file_copy" className="text-xs md:text-sm" />
            </button>
          </div>

          <p className="text-xs md:text-sm text-white/50">Then connect with:</p>
          <div className="group relative">
            <code className="block bg-black/40 px-3 py-2 md:px-4 md:py-3 rounded-lg text-xs md:text-sm font-mono border border-white/5">
              {showToken ? shortCommand : shortCommandHidden}
            </code>
            <button
              onClick={() => copyToClipboard(shortCommand, 'Command')}
              className="absolute top-1 right-1 md:top-2 md:right-2 w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Copy"
            >
              <Icon name="file_copy" className="text-xs md:text-sm" />
            </button>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
          <Icon name="warning" className="text-yellow-400 text-xl shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-yellow-400">Authentication Required</p>
            <p className="text-yellow-400/70 mt-1">Your auth token is included in the commands above. Keep it private.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
