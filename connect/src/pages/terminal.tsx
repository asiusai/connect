import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { TopAppBar } from '../components/TopAppBar'
import { BackButton } from '../components/BackButton'
import { IconButton } from '../components/IconButton'
import { useRouteParams } from '../utils/hooks'
import { accessToken } from '../utils/helpers'
import { encryptToken } from '../utils/encryption'
import { env } from '../utils/env'

const getProvider = (mode: string) => (mode === 'konik' ? 'konik' : mode === 'comma' ? 'comma' : 'asius')

const Terminal = ({ wsUrl, onClose }: { wsUrl: string; onClose?: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0d0d0d',
        foreground: '#e5e5e5',
        cursor: '#22c55e',
        cursorAccent: '#0d0d0d',
        selectionBackground: '#22c55e40',
      },
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    term.writeln('\x1b[90m$ Connecting to SSH server...\x1b[0m')

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      term.writeln('\x1b[90m$ WebSocket connected\x1b[0m')
    }

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        term.write(event.data)
      } else if (event.data instanceof Blob) {
        event.data.arrayBuffer().then((buf) => {
          term.write(new Uint8Array(buf))
        })
      }
    }

    ws.onerror = () => {
      term.writeln('\r\n\x1b[31mWebSocket error\x1b[0m')
    }

    ws.onclose = () => {
      term.writeln('\r\n\x1b[90mConnection closed. Press any key to go back.\x1b[0m')
    }

    term.onKey(() => {
      if (ws.readyState === WebSocket.CLOSED) {
        onClose?.()
      }
    })

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    })

    const handleResize = () => fitAddon.fit()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      ws.close()
      term.dispose()
    }
  }, [wsUrl, onClose])

  return <div ref={containerRef} className="w-full h-full" />
}

export const Component = () => {
  const { dongleId } = useRouteParams()
  const navigate = useNavigate()
  const token = accessToken()
  const encToken = useMemo(() => (token ? encryptToken(token, env.SSH_KEY) : undefined), [token])
  const [key, setKey] = useState(0)

  if (!dongleId || !encToken) return null

  const provider = getProvider(env.MODE)
  const wsUrl = `wss://ssh.asius.ai/browser/${provider}-${dongleId}-${encToken}`

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <TopAppBar
        leading={<BackButton href={`/${dongleId}/ssh`} />}
        trailing={<IconButton name="refresh" title="Reconnect" onClick={() => setKey((k) => k + 1)} />}
      >
        SSH Terminal
      </TopAppBar>
      <div className="flex-1 p-2">
        <Terminal key={key} wsUrl={wsUrl} onClose={() => navigate(`/${dongleId}/ssh`)} />
      </div>
    </div>
  )
}
