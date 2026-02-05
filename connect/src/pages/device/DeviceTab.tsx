import { cn } from '../../../../shared/helpers'
import {
  CpuIcon,
  RulerIcon,
  TerminalIcon,
  GamepadIcon,
  InfoIcon,
  GitBranchIcon,
  TagIcon,
  CarIcon,
  ClockIcon,
  MapPinIcon,
  ApertureIcon,
  Trash2Icon,
  ExternalLinkIcon,
  PlusIcon,
  CircleAlertIcon,
  UsersIcon,
  GlobeIcon,
  BluetoothIcon,
  LoaderIcon,
  SignalIcon,
} from 'lucide-react'
import { api } from '../../api'
import { useRouteParams } from '../../hooks'
import { formatDistance, formatDuration } from '../../utils/format'
import { useSettings } from '../../hooks/useSettings'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useIsDeviceOwner } from '../../hooks/useIsDeviceOwner'
import { useAuth } from '../../hooks/useAuth'
import { getProviderInfo } from '../../../../shared/provider'
import { getDeviceName } from '../../../../shared/types'
import { Card, Row, InfoRow, SectionLabel, IconBadge } from './ControlsTab'
import { useDevice } from '../../hooks/useDevice'
import { Toggle } from '../../components/Toggle'
import type { AthenaStatus } from '../../hooks/useDevice/useAthena'
import type { LucideIcon } from 'lucide-react'

const STATUS_LABEL: Record<AthenaStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting...',
  disconnected: 'Disconnected',
  unauthorized: 'Unauthorized',
  'not-supported': 'Not supported',
}

const ConnectionRow = ({
  icon,
  label,
  status,
  onConnect,
  onDisconnect,
  actions = true,
}: {
  icon: LucideIcon
  label: string
  status: AthenaStatus
  onConnect?: () => void
  onDisconnect?: () => void
  actions?: boolean
}) => (
  <div className="flex items-center gap-3 py-2.5 px-3">
    <IconBadge icon={icon} color={status === 'connected' ? 'bg-green-600' : 'bg-gray-600'} />
    <div className="flex-1 min-w-0">
      <div className="text-[13px] font-medium">{label}</div>
      <div className="text-xs text-white/35">{STATUS_LABEL[status]}</div>
    </div>
    {actions &&
      (status === 'connecting' ? (
        <LoaderIcon className="w-4 h-4 animate-spin text-white/40" />
      ) : status === 'connected' ? (
        <div className="flex gap-2">
          <button onClick={onConnect} className="px-3 py-1 rounded-lg bg-white/10 text-white/60 text-xs font-medium hover:bg-white/15 transition-colors">
            Reconnect
          </button>
          <button onClick={onDisconnect} className="px-3 py-1 rounded-lg bg-white/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">
            Disconnect
          </button>
        </div>
      ) : status !== 'not-supported' ? (
        <button onClick={onConnect} className="px-3 py-1 rounded-lg bg-white/10 text-white/60 text-xs font-medium hover:bg-white/15 transition-colors">
          Connect
        </button>
      ) : null)}
  </div>
)

export const DeviceTab = () => {
  const { dongleId } = useRouteParams()
  const navigate = useNavigate()
  const [device, { refetch }] = api.device.get.useQuery({ params: { dongleId }, enabled: !!dongleId })
  const [_, devices] = api.devices.devices.useQuery({})
  const [routes] = api.routes.routesSegments.useQuery({ params: { dongleId }, query: { limit: 1 } })
  const route = routes?.[0]
  const [stats] = api.device.stats.useQuery({ params: { dongleId } })
  const { ble, athena } = useDevice()
  const { statsTime, unitFormat, timeFormat, usingAsiusPilot, set } = useSettings()
  const currentStats = stats?.[statsTime ?? 'all']
  const isOwner = useIsDeviceOwner()
  const { provider } = useAuth()
  const providerInfo = getProviderInfo(provider)

  const [alias, setAlias] = useState('')
  useEffect(() => setAlias(device?.alias || ''), [device?.alias])

  let [users, { refetch: refetchUsers }] = api.users.get.useQuery({ params: { dongleId } })
  if (users && typeof users === 'object' && 'users' in users) users = users.users as any

  const changeName = api.device.set.useMutation({
    onSuccess: () => {
      refetch()
      devices.refetch()
    },
  })
  const unpair = api.device.unpair.useMutation({
    onSuccess: (data) => {
      if (data.success) navigate('/')
    },
  })
  const addUser = api.users.addUser.useMutation({
    onSuccess: () => {
      setAddEmail('')
      setIsAddingUser(false)
      refetchUsers()
    },
  })
  const deleteUser = api.users.deleteUser.useMutation({
    onSuccess: () => refetchUsers(),
  })
  const [addEmail, setAddEmail] = useState('')
  const [isAddingUser, setIsAddingUser] = useState(false)

  return (
    <div className={cn('flex flex-col gap-3')}>
      <Card>
        <ConnectionRow icon={SignalIcon} label="Athena" status={athena.status} actions={false} />
        {usingAsiusPilot && <ConnectionRow icon={BluetoothIcon} label="Bluetooth" status={ble.status} onConnect={ble.connect} onDisconnect={ble.disconnect} />}
        {isOwner && (
          <>
            <Link to={`/${dongleId}/ssh`} className="flex items-center gap-3 py-2.5 px-3 hover:bg-white/5 transition-colors">
              <IconBadge icon={TerminalIcon} color="bg-gray-600" />
              <span className="text-[13px] font-medium flex-1">SSH Terminal</span>
              <ExternalLinkIcon className="w-4 h-4 text-white/30" />
            </Link>
            <Link to={`/${dongleId}/snapshot`} className="flex items-center gap-3 py-2.5 px-3 hover:bg-white/5 transition-colors">
              <IconBadge icon={ApertureIcon} color="bg-blue-600" />
              <span className="text-[13px] font-medium flex-1">Snapshot</span>
              <ExternalLinkIcon className="w-4 h-4 text-white/30" />
            </Link>
            {usingAsiusPilot && (
              <Link to={`/${dongleId}/live`} className="flex items-center gap-3 py-2.5 px-3 hover:bg-white/5 transition-colors">
                <IconBadge icon={GamepadIcon} color="bg-indigo-600" />
                <span className="text-[13px] font-medium flex-1">Joystick</span>
                <ExternalLinkIcon className="w-4 h-4 text-white/30" />
              </Link>
            )}
          </>
        )}
      </Card>
      <SectionLabel>Preferences</SectionLabel>
      <Card>
        {isOwner && device && (
          <div className="flex items-center gap-3 py-2.5 px-3">
            <IconBadge icon={TagIcon} color="bg-orange-600" />
            <span className="text-[13px] text-white/50 shrink-0">Alias</span>
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className="flex-1 bg-transparent text-[13px] font-medium text-white text-right placeholder-white/30 focus:outline-none min-w-0"
              placeholder={getDeviceName(device)}
            />
            {alias !== (device.alias || '') && (
              <button
                className="px-3 py-1 rounded-lg bg-white text-black text-xs font-bold shrink-0"
                onClick={() => changeName.mutate({ body: { alias }, params: { dongleId } })}
                disabled={changeName.isPending}
              >
                Save
              </button>
            )}
          </div>
        )}
        <Row icon={RulerIcon} iconColor="bg-sky-600" label="Imperial Units" description="Use miles instead of kilometers">
          <Toggle value={unitFormat === 'imperial'} onChange={(v) => set({ unitFormat: v ? 'imperial' : 'metric' })} />
        </Row>
        <Row icon={ClockIcon} iconColor="bg-violet-600" label="12-Hour Clock" description="AM/PM format">
          <Toggle value={timeFormat === '12h'} onChange={(v) => set({ timeFormat: v ? '12h' : '24h' })} />
        </Row>
        <Row icon={CpuIcon} iconColor="bg-green-600" label="Using AsiusPilot" description="Required for all features">
          <Toggle value={!!usingAsiusPilot} onChange={(v) => set({ usingAsiusPilot: v })} />
        </Row>
      </Card>
      <SectionLabel>Vehicle Info</SectionLabel>
      {route && (
        <Card>
          <InfoRow icon={CarIcon} iconColor="bg-slate-600" label="Vehicle" value={route.platform || '-'} />
          <InfoRow icon={GlobeIcon} iconColor="bg-teal-600" label="Repo" value={route.git_remote?.replace(/^https?:\/\/github\.com\//, '') || '-'} />
          <InfoRow icon={GitBranchIcon} iconColor="bg-orange-600" label="Branch" value={route.git_branch || '-'} />
          <InfoRow icon={InfoIcon} iconColor="bg-purple-600" label="Commit" value={route.git_commit?.slice(0, 10) || '-'} />
          <InfoRow icon={TagIcon} iconColor="bg-blue-600" label="Version" value={route.version || '-'} />
        </Card>
      )}
      {currentStats && (
        <>
          <div className="flex items-center justify-between mt-2">
            <h2 className="text-lg font-bold">Statistics</h2>
            <button
              onClick={() => set({ statsTime: statsTime === 'week' ? 'all' : 'week' })}
              className={cn('text-sm font-medium transition-all', statsTime === 'week' ? 'text-white' : 'text-white/30 hover:text-white/50')}
            >
              {statsTime === 'week' ? 'Show all' : 'Weekly'}
            </button>
          </div>
          <Card>
            <InfoRow icon={MapPinIcon} iconColor="bg-green-600" label="Distance" value={formatDistance(currentStats.distance) ?? '-'} />
            <InfoRow icon={ClockIcon} iconColor="bg-sky-600" label="Time" value={formatDuration(currentStats.minutes) ?? '-'} />
            <InfoRow icon={CarIcon} iconColor="bg-amber-600" label="Drives" value={currentStats.routes.toString()} />
          </Card>
        </>
      )}
      {isOwner && (
        <>
          <SectionLabel>Users</SectionLabel>
          <Card>
            {users?.map((user) => (
              <div key={user.email} className="flex items-center gap-3 py-2.5 px-3">
                <IconBadge icon={UsersIcon} color="bg-teal-600" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{user.email}</div>
                  <div className="text-xs text-white/35 capitalize">{user.permission.replace('_', ' ')}</div>
                </div>
                {user.permission !== 'owner' && (
                  <button
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-red-400 transition-colors"
                    onClick={() => {
                      if (!confirm(`Remove ${user.email}?`)) return
                      deleteUser.mutate({ body: { email: user.email }, params: { dongleId } })
                    }}
                  >
                    <Trash2Icon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </Card>
          {isAddingUser ? (
            <div className="flex flex-col gap-3 bg-background-alt p-4 rounded-xl">
              <input
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 py-2 text-white text-sm placeholder-white/40 focus:outline-none focus:border-white transition-colors"
                placeholder="Email address"
                autoFocus
              />
              {addUser.error && (
                <div className="flex gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                  <CircleAlertIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  {(addUser.error as any) || 'Failed to add user'}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  className="flex-1 py-2 rounded-lg bg-white text-black font-medium text-sm"
                  onClick={() => {
                    if (!addEmail) return
                    addUser.mutate({ body: { email: addEmail }, params: { dongleId } })
                  }}
                  disabled={!addEmail || addUser.isPending}
                >
                  {addUser.isPending ? 'Adding...' : 'Add'}
                </button>
                <button className="flex-1 py-2 rounded-lg bg-white/10 text-white font-medium text-sm" onClick={() => setIsAddingUser(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingUser(true)}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-background-alt hover:bg-white/5 transition-colors text-sm text-white/50"
            >
              <PlusIcon className="w-4 h-4" />
              Add user
            </button>
          )}
          <button
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
            onClick={() => {
              if (confirm('Are you sure you want to unpair this device?')) unpair.mutate({ params: { dongleId } })
            }}
            disabled={unpair.isPending}
          >
            <Trash2Icon className="w-4 h-4" />
            Unpair device
          </button>
        </>
      )}
      {!!providerInfo.billingUrl && isOwner && <PrimeSection />}
    </div>
  )
}

const PrimeSection = () => {
  const { dongleId } = useRouteParams()
  const [device] = api.device.get.useQuery({ params: { dongleId }, enabled: !!dongleId })
  if (!device) return null
  return (
    <>
      <SectionLabel>comma prime</SectionLabel>
      <Card className="divide-y-0!">
        <div className="flex flex-col items-center gap-2 py-6">
          <span className="text-sm text-white/35">{device.prime ? 'Active' : 'Not subscribed'}</span>
          <Link to={`/${dongleId}/settings`} className="text-xs text-primary hover:underline">
            Manage in settings
          </Link>
        </div>
      </Card>
    </>
  )
}
