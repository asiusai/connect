import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { TopAppBar } from '../components/TopAppBar'
import { BackButton } from '../components/BackButton'
import { useAdminUsers, useAdminDevices, useAdminFiles, useAdminRoutes, useProfile } from '../api/queries'
import { Loading } from '../components/Loading'
import { Icon } from '../components/Icon'
import clsx from 'clsx'
import { env } from '../utils/env'

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

type Tab = 'users' | 'devices' | 'routes' | 'files'

type DevicesFilter = {
  user_id?: string
  userEmail?: string
}

type RoutesFilter = {
  dongle_id?: string
  sort: 'create_time' | 'size'
  order: 'asc' | 'desc'
}

type FilesFilter = {
  dongle_id?: string
  route_id?: string
  status?: 'queued' | 'processing' | 'done' | 'error'
  sort: 'create_time' | 'size'
  order: 'asc' | 'desc'
}

const TabButton = ({ tab, activeTab, onClick, children }: { tab: Tab; activeTab: Tab; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={clsx('px-4 py-2 font-medium rounded-lg transition-colors', activeTab === tab ? 'bg-primary text-white' : 'bg-background-alt hover:bg-white/10')}
  >
    {children}
  </button>
)

const UsersTable = ({ onViewDevices }: { onViewDevices: (userId: string, email: string) => void }) => {
  const [users] = useAdminUsers()

  if (!users) return <Loading />

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 font-medium text-white/60">Email</th>
            <th className="text-left py-3 px-4 font-medium text-white/60">Username</th>
            <th className="text-left py-3 px-4 font-medium text-white/60">Registered</th>
            <th className="text-right py-3 px-4 font-medium text-white/60">Devices</th>
            <th className="text-right py-3 px-4 font-medium text-white/60">Data</th>
            <th className="text-center py-3 px-4 font-medium text-white/60">Superuser</th>
            <th className="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-3 px-4">{user.email}</td>
              <td className="py-3 px-4 text-white/60">{user.username || '-'}</td>
              <td className="py-3 px-4 text-white/60">{formatDate(user.regdate)}</td>
              <td className="py-3 px-4 text-right">
                {user.deviceCount > 0 ? (
                  <button onClick={() => onViewDevices(user.id, user.email)} className="text-primary hover:underline">
                    {user.deviceCount}
                  </button>
                ) : (
                  '0'
                )}
              </td>
              <td className="py-3 px-4 text-right">{formatBytes(user.totalSize)}</td>
              <td className="py-3 px-4 text-center">{user.superuser && <Icon name="check" className="text-green-500" />}</td>
              <td className="py-3 px-4"></td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && <div className="text-center py-8 text-white/40">No users found</div>}
    </div>
  )
}

const DevicesTable = ({
  filter,
  onFilterChange,
  onViewFiles,
}: {
  filter: DevicesFilter
  onFilterChange: (f: DevicesFilter) => void
  onViewFiles: (dongleId: string) => void
}) => {
  const [devices] = useAdminDevices({ user_id: filter.user_id })
  const [users] = useAdminUsers()

  const user = filter.user_id ? users?.find((u) => u.id === filter.user_id) : null

  if (!devices) return <Loading />

  return (
    <div>
      {/* User info card */}
      {user && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <Icon name="person" className="text-primary" />
            <span className="font-medium">User</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              <span className="text-white/40">Email:</span> {user.email}
            </span>
            {user.username && (
              <span>
                <span className="text-white/40">Username:</span> {user.username}
              </span>
            )}
            <span>
              <span className="text-white/40">Devices:</span> {user.deviceCount}
            </span>
            <span>
              <span className="text-white/40">Total Data:</span> {formatBytes(user.totalSize)}
            </span>
            <span>
              <span className="text-white/40">Registered:</span> {formatDate(user.regdate)}
            </span>
            {user.superuser && (
              <span className="text-green-400">Superuser</span>
            )}
          </div>
          <button onClick={() => onFilterChange({})} className="ml-auto text-white/40 hover:text-white">
            <Icon name="close" className="text-base" />
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 font-medium text-white/60">Dongle ID</th>
              <th className="text-left py-3 px-4 font-medium text-white/60">Alias</th>
              <th className="text-left py-3 px-4 font-medium text-white/60">Type</th>
              <th className="text-left py-3 px-4 font-medium text-white/60">Owner</th>
              <th className="text-left py-3 px-4 font-medium text-white/60">Created</th>
              <th className="text-right py-3 px-4 font-medium text-white/60">Files</th>
              <th className="text-right py-3 px-4 font-medium text-white/60">Data</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.dongle_id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{device.dongle_id}</span>
                    <Link to={`/${device.dongle_id}`} className="text-white/40 hover:text-primary transition-colors" title="View device">
                      <Icon name="open_in_new" className="text-sm" />
                    </Link>
                  </div>
                </td>
                <td className="py-3 px-4">{device.alias || '-'}</td>
                <td className="py-3 px-4 text-white/60">{device.device_type || '-'}</td>
                <td className="py-3 px-4 text-white/60">{device.ownerEmail || '-'}</td>
                <td className="py-3 px-4 text-white/60">{formatDate(device.create_time)}</td>
                <td className="py-3 px-4 text-right">
                  {device.fileCount > 0 ? (
                    <button onClick={() => onViewFiles(device.dongle_id)} className="text-primary hover:underline">
                      {device.fileCount}
                    </button>
                  ) : (
                    '0'
                  )}
                </td>
                <td className="py-3 px-4 text-right">{formatBytes(device.totalSize)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {devices.length === 0 && <div className="text-center py-8 text-white/40">No devices found</div>}
      </div>
    </div>
  )
}

const SortHeader = ({
  label,
  sortKey,
  currentSort,
  currentOrder,
  onSort,
  align,
}: {
  label: string
  sortKey: 'create_time' | 'size'
  currentSort: 'create_time' | 'size'
  currentOrder: 'asc' | 'desc'
  onSort: (sort: 'create_time' | 'size', order: 'asc' | 'desc') => void
  align?: 'left' | 'right'
}) => {
  const isActive = currentSort === sortKey
  const handleClick = () => {
    if (isActive) {
      onSort(sortKey, currentOrder === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(sortKey, 'desc')
    }
  }

  return (
    <button
      onClick={handleClick}
      className={clsx('flex items-center gap-1 font-medium text-white/60 hover:text-white transition-colors', align === 'right' && 'ml-auto')}
    >
      {label}
      {isActive && <Icon name={currentOrder === 'asc' ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} className="text-base" />}
    </button>
  )
}

const FilesTable = ({ filter, onFilterChange }: { filter: FilesFilter; onFilterChange: (f: FilesFilter) => void }) => {
  const [filesData] = useAdminFiles({ limit: 100, status: filter.status, dongle_id: filter.dongle_id, route_id: filter.route_id, sort: filter.sort, order: filter.order })
  const [devices] = useAdminDevices({})
  const [routesData] = useAdminRoutes({ dongle_id: filter.dongle_id, limit: 1000 })

  const device = filter.dongle_id ? devices?.find((d) => d.dongle_id === filter.dongle_id) : null
  const route = filter.route_id && filter.dongle_id ? routesData?.routes.find((r) => r.route_id === filter.route_id && r.dongle_id === filter.dongle_id) : null

  const statusColors: Record<string, string> = {
    queued: 'bg-yellow-500/20 text-yellow-400',
    processing: 'bg-blue-500/20 text-blue-400',
    done: 'bg-green-500/20 text-green-400',
    error: 'bg-red-500/20 text-red-400',
  }

  const getFileUrl = (key: string) => `${env.API_URL}/connectdata/${key}`

  return (
    <div>
      {/* Context info cards */}
      {(device || route) && (
        <div className="flex flex-col gap-3 mb-4">
          {device && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Icon name="smartphone" className="text-primary" />
                <span className="font-medium">Device</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span>
                  <span className="text-white/40">ID:</span> <span className="font-mono">{device.dongle_id}</span>
                </span>
                {device.alias && (
                  <span>
                    <span className="text-white/40">Alias:</span> {device.alias}
                  </span>
                )}
                {device.device_type && (
                  <span>
                    <span className="text-white/40">Type:</span> {device.device_type}
                  </span>
                )}
                {device.ownerEmail && (
                  <span>
                    <span className="text-white/40">Owner:</span> {device.ownerEmail}
                  </span>
                )}
                <span>
                  <span className="text-white/40">Total:</span> {formatBytes(device.totalSize)}
                </span>
              </div>
              <Link to={`/${device.dongle_id}`} className="ml-auto text-white/40 hover:text-primary" title="View device">
                <Icon name="open_in_new" className="text-base" />
              </Link>
              <button onClick={() => onFilterChange({ ...filter, dongle_id: undefined, route_id: undefined })} className="text-white/40 hover:text-white">
                <Icon name="close" className="text-base" />
              </button>
            </div>
          )}
          {route && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Icon name="route" className="text-primary" />
                <span className="font-medium">Route</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span>
                  <span className="text-white/40">ID:</span> <span className="font-mono">{route.route_id}</span>
                </span>
                <span>
                  <span className="text-white/40">Segments:</span> {route.segmentCount}
                </span>
                {route.platform && (
                  <span>
                    <span className="text-white/40">Platform:</span> {route.platform}
                  </span>
                )}
                {route.version && (
                  <span>
                    <span className="text-white/40">Version:</span> {route.version}
                  </span>
                )}
                <span>
                  <span className="text-white/40">Size:</span> {formatBytes(route.totalSize)}
                </span>
                <span>
                  <span className="text-white/40">Created:</span> {formatDate(route.create_time)}
                </span>
              </div>
              <Link to={`/${route.dongle_id}/${route.route_id}`} className="ml-auto text-white/40 hover:text-primary" title="View route">
                <Icon name="open_in_new" className="text-base" />
              </Link>
              <button onClick={() => onFilterChange({ ...filter, route_id: undefined })} className="text-white/40 hover:text-white">
                <Icon name="close" className="text-base" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status filter buttons */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <button
          onClick={() => onFilterChange({ ...filter, status: undefined })}
          className={clsx('px-3 py-1 rounded-lg text-sm', !filter.status ? 'bg-white/20' : 'bg-background-alt hover:bg-white/10')}
        >
          All
        </button>
        {(['queued', 'processing', 'done', 'error'] as const).map((status) => (
          <button
            key={status}
            onClick={() => onFilterChange({ ...filter, status })}
            className={clsx('px-3 py-1 rounded-lg text-sm capitalize', filter.status === status ? 'bg-white/20' : 'bg-background-alt hover:bg-white/10')}
          >
            {status}
          </button>
        ))}
      </div>

      {!filesData ? (
        <Loading />
      ) : (
        <>
          <div className="text-sm text-white/40 mb-2">
            Showing {filesData.files.length} of {filesData.total} files
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-medium text-white/60">File</th>
                  <th className="text-left py-3 px-4 font-medium text-white/60">Dongle</th>
                  <th className="text-left py-3 px-4 font-medium text-white/60">Route</th>
                  <th className="text-right py-3 px-4 font-medium text-white/60">Seg</th>
                  <th className="text-right py-3 px-4">
                    <SortHeader
                      label="Size"
                      sortKey="size"
                      currentSort={filter.sort}
                      currentOrder={filter.order}
                      onSort={(sort, order) => onFilterChange({ ...filter, sort, order })}
                      align="right"
                    />
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-white/60">Status</th>
                  <th className="text-left py-3 px-4">
                    <SortHeader
                      label="Created"
                      sortKey="create_time"
                      currentSort={filter.sort}
                      currentOrder={filter.order}
                      onSort={(sort, order) => onFilterChange({ ...filter, sort, order })}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filesData.files.map((file) => (
                  <tr key={file.key} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{file.file}</span>
                        <a
                          href={getFileUrl(file.key)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/40 hover:text-primary transition-colors"
                          title="Download file"
                        >
                          <Icon name="open_in_new" className="text-sm" />
                        </a>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onFilterChange({ ...filter, dongle_id: file.dongle_id })}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {file.dongle_id}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-white/60">
                      {file.route_id ? (
                        <button
                          onClick={() => onFilterChange({ ...filter, dongle_id: file.dongle_id, route_id: file.route_id! })}
                          className="text-primary hover:underline"
                        >
                          {file.route_id}
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-white/60">{file.segment ?? '-'}</td>
                    <td className="py-3 px-4 text-right">{formatBytes(file.size)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={clsx('px-2 py-1 rounded text-xs', statusColors[file.processingStatus])}>{file.processingStatus}</span>
                    </td>
                    <td className="py-3 px-4 text-white/60">{formatDate(file.create_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filesData.files.length === 0 && <div className="text-center py-8 text-white/40">No files found</div>}
          </div>
        </>
      )}
    </div>
  )
}

const RoutesTable = ({
  filter,
  onFilterChange,
  onViewFiles,
}: {
  filter: RoutesFilter
  onFilterChange: (f: RoutesFilter) => void
  onViewFiles: (dongleId: string, routeId: string) => void
}) => {
  const [routesData] = useAdminRoutes({ limit: 100, dongle_id: filter.dongle_id, sort: filter.sort, order: filter.order })
  const [devices] = useAdminDevices({})

  const device = filter.dongle_id ? devices?.find((d) => d.dongle_id === filter.dongle_id) : null

  return (
    <div>
      {/* Device info card */}
      {device && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <Icon name="smartphone" className="text-primary" />
            <span className="font-medium">Device</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              <span className="text-white/40">ID:</span> <span className="font-mono">{device.dongle_id}</span>
            </span>
            {device.alias && (
              <span>
                <span className="text-white/40">Alias:</span> {device.alias}
              </span>
            )}
            {device.device_type && (
              <span>
                <span className="text-white/40">Type:</span> {device.device_type}
              </span>
            )}
            {device.ownerEmail && (
              <span>
                <span className="text-white/40">Owner:</span> {device.ownerEmail}
              </span>
            )}
            <span>
              <span className="text-white/40">Total:</span> {formatBytes(device.totalSize)}
            </span>
          </div>
          <Link to={`/${device.dongle_id}`} className="ml-auto text-white/40 hover:text-primary" title="View device">
            <Icon name="open_in_new" className="text-base" />
          </Link>
          <button onClick={() => onFilterChange({ ...filter, dongle_id: undefined })} className="text-white/40 hover:text-white">
            <Icon name="close" className="text-base" />
          </button>
        </div>
      )}

      {!routesData ? (
        <Loading />
      ) : (
        <>
          <div className="text-sm text-white/40 mb-2">
            Showing {routesData.routes.length} of {routesData.total} routes
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-medium text-white/60">Route ID</th>
                  <th className="text-left py-3 px-4 font-medium text-white/60">Dongle</th>
                  <th className="text-right py-3 px-4 font-medium text-white/60">Segments</th>
                  <th className="text-right py-3 px-4 font-medium text-white/60">Files</th>
                  <th className="text-right py-3 px-4">
                    <SortHeader
                      label="Size"
                      sortKey="size"
                      currentSort={filter.sort}
                      currentOrder={filter.order}
                      onSort={(sort, order) => onFilterChange({ ...filter, sort, order })}
                      align="right"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-white/60">Platform</th>
                  <th className="text-left py-3 px-4 font-medium text-white/60">Version</th>
                  <th className="text-left py-3 px-4">
                    <SortHeader
                      label="Created"
                      sortKey="create_time"
                      currentSort={filter.sort}
                      currentOrder={filter.order}
                      onSort={(sort, order) => onFilterChange({ ...filter, sort, order })}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {routesData.routes.map((route) => (
                  <tr key={`${route.dongle_id}/${route.route_id}`} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{route.route_id}</span>
                        <Link to={`/${route.dongle_id}/${route.route_id}`} className="text-white/40 hover:text-primary transition-colors" title="View route">
                          <Icon name="open_in_new" className="text-sm" />
                        </Link>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onFilterChange({ ...filter, dongle_id: route.dongle_id })}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {route.dongle_id}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right text-white/60">{route.segmentCount}</td>
                    <td className="py-3 px-4 text-right">
                      {route.fileCount > 0 ? (
                        <button onClick={() => onViewFiles(route.dongle_id, route.route_id)} className="text-primary hover:underline">
                          {route.fileCount}
                        </button>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">{formatBytes(route.totalSize)}</td>
                    <td className="py-3 px-4 text-white/60">{route.platform || '-'}</td>
                    <td className="py-3 px-4 text-white/60">{route.version || '-'}</td>
                    <td className="py-3 px-4 text-white/60">{formatDate(route.create_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {routesData.routes.length === 0 && <div className="text-center py-8 text-white/40">No routes found</div>}
          </div>
        </>
      )}
    </div>
  )
}

export const Component = () => {
  const [profile] = useProfile()
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [devicesFilter, setDevicesFilter] = useState<DevicesFilter>({})
  const [routesFilter, setRoutesFilter] = useState<RoutesFilter>({ sort: 'create_time', order: 'desc' })
  const [filesFilter, setFilesFilter] = useState<FilesFilter>({ sort: 'create_time', order: 'desc' })

  const handleViewDevices = (userId: string, email: string) => {
    setDevicesFilter({ user_id: userId, userEmail: email })
    setActiveTab('devices')
  }

  const handleViewFiles = (dongleId: string, routeId?: string) => {
    setFilesFilter({ ...filesFilter, dongle_id: dongleId, route_id: routeId })
    setActiveTab('files')
  }

  if (!profile) return <Loading />
  if (!profile.superuser) return <Navigate to="/" replace />

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TopAppBar leading={<BackButton href="/" />}>Admin</TopAppBar>
      <div className="flex flex-col gap-6 px-4 py-6 pb-20 max-w-6xl mx-auto w-full">
        <div className="flex gap-2">
          <TabButton tab="users" activeTab={activeTab} onClick={() => setActiveTab('users')}>
            Users
          </TabButton>
          <TabButton tab="devices" activeTab={activeTab} onClick={() => setActiveTab('devices')}>
            Devices
          </TabButton>
          <TabButton tab="routes" activeTab={activeTab} onClick={() => setActiveTab('routes')}>
            Routes
          </TabButton>
          <TabButton tab="files" activeTab={activeTab} onClick={() => setActiveTab('files')}>
            Files
          </TabButton>
        </div>

        <div className="bg-background-alt rounded-xl p-4">
          {activeTab === 'users' && <UsersTable onViewDevices={handleViewDevices} />}
          {activeTab === 'devices' && (
            <DevicesTable
              filter={devicesFilter}
              onFilterChange={setDevicesFilter}
              onViewFiles={(dongleId) => handleViewFiles(dongleId)}
            />
          )}
          {activeTab === 'routes' && (
            <RoutesTable
              filter={routesFilter}
              onFilterChange={setRoutesFilter}
              onViewFiles={(dongleId, routeId) => handleViewFiles(dongleId, routeId)}
            />
          )}
          {activeTab === 'files' && <FilesTable filter={filesFilter} onFilterChange={setFilesFilter} />}
        </div>
      </div>
    </div>
  )
}
