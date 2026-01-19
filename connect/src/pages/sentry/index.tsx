import { useRef, useState } from 'react'
import { useRouteParams } from '../../utils/hooks'
import { Icon } from '../../components/Icon'
import { TopAppBar } from '../../components/TopAppBar'
import { BackButton } from '../../components/BackButton'
import { IconButton } from '../../components/IconButton'
import { useStorage } from '../../utils/storage'
import { useDevice } from '../device/useDevice'
import clsx from 'clsx'
import { LiveView } from './live'
import { SnapshotView } from './snapshot'

export const Component = () => {
  const { dongleId } = useRouteParams()
  const [usingCorrectFork] = useStorage('usingCorrectFork')

  // Load device params to check if WebRTC is enabled
  const { get, isError, isLoading } = useDevice()

  const webrtcEnabled =
    usingCorrectFork === undefined ? null : usingCorrectFork && isLoading ? null : usingCorrectFork && !isError && get('EnableWebRTC') === '1'

  const [reconnecting, setReconnecting] = useState(false)
  const setupRTCConnectionRef = useRef<(() => Promise<void>) | null>(null)

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <TopAppBar
        leading={<BackButton href={`/${dongleId}`} />}
        trailing={
          webrtcEnabled && (
            <IconButton
              name="refresh"
              title="Refresh connection"
              className={clsx('p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5', reconnecting && 'animate-spin')}
              onClick={() => setupRTCConnectionRef.current?.()}
              disabled={reconnecting}
            />
          )
        }
      >
        Sentry
      </TopAppBar>

      {/* Content */}
      {webrtcEnabled === null && (
        <div className="flex-1 flex items-center justify-center">
          <Icon name="progress_activity" className="animate-spin text-4xl text-white/40" />
        </div>
      )}
      {webrtcEnabled === true && <LiveView setReconnecting={setReconnecting} setupRTCConnectionRef={setupRTCConnectionRef} />}
      {webrtcEnabled === false && <SnapshotView />}
    </div>
  )
}
