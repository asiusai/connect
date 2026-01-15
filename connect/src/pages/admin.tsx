import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { TopAppBar } from '../components/TopAppBar'
import { BackButton } from '../components/BackButton'
import { isSignedIn } from '../utils/helpers'
import { Loading } from '../components/Loading'
import { Icon } from '../components/Icon'
import { api, invalidate } from '../api'
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

type UsersFilter = {
  offset: number
}

type DevicesFilter = {
  user_id?: string
  userEmail?: string
  offset: number
}

type RoutesFilter = {
  dongle_id?: string
  sort: 'create_time' | 'size'
  order: 'asc' | 'desc'
  offset: number
}

type FilesFilter = {
  dongle_id?: string
  route_id?: string
  status?: 'queued' | 'processing' | 'done' | 'error'
  sort: 'create_time' | 'size'
  order: 'asc' | 'desc'
  offset: number
}

const PAGE_SIZE = 50

const PaginationControls = ({
  total,
  offset,
  pageSize,
  onOffsetChange,
}: {
  total: number
  offset: number
  pageSize: number
  onOffsetChange: (offset: number) => void
}) => {
  const currentPage = Math.floor(offset / pageSize) + 1
  const totalPages = Math.ceil(total / pageSize)

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onOffsetChange(Math.max(0, offset - pageSize))}
        disabled={currentPage === 1}
        className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Previous page"
      >
        <Icon name="keyboard_arrow_left" className="text-xl" />
      </button>
      <span className="px-2 text-sm">
        {currentPage} / {totalPages}
      </span>
      <button
        onClick={() => onOffsetChange(offset + pageSize)}
        disabled={currentPage === totalPages}
        className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Next page"
      >
        <Icon name="keyboard_arrow_right" className="text-xl" />
      </button>
    </div>
  )
}

const Pagination = ({
  total,
  offset,
  pageSize,
  onOffsetChange,
}: {
  total: number
  offset: number
  pageSize: number
  onOffsetChange: (offset: number) => void
}) => {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-end mt-4 pt-4 border-t border-white/10">
      <PaginationControls total={total} offset={offset} pageSize={pageSize} onOffsetChange={onOffsetChange} />
    </div>
  )
}

const PaginationHeader = ({
  total,
  offset,
  pageSize,
  onOffsetChange,
  label,
}: {
  total: number
  offset: number
  pageSize: number
  onOffsetChange: (offset: number) => void
  label: string
}) => (
  <div className="flex items-center justify-between mb-2">
    <div className="text-sm text-white/40">
      Showing {Math.min(offset + 1, total)}-{Math.min(offset + pageSize, total)} of {total} {label}
    </div>
    <PaginationControls total={total} offset={offset} pageSize={pageSize} onOffsetChange={onOffsetChange} />
  </div>
)

const TabButton = ({ tab, activeTab, onClick, children }: { tab: Tab; activeTab: Tab; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={clsx('px-4 py-2 font-medium rounded-lg transition-colors', activeTab === tab ? 'bg-primary text-white' : 'bg-background-alt hover:bg-white/10')}
  >
    {children}
  </button>
)

const UsersTable = ({
  filter,
  onFilterChange,
  onViewDevices,
}: {
  filter: UsersFilter
  onFilterChange: (f: UsersFilter) => void
  onViewDevices: (userId: string, email: string) => void
}) => {
  const [usersData] = api.admin.users.useQuery({ query: { limit: PAGE_SIZE, offset: filter.offset } })

  if (!usersData) return <Loading />

  return (
    <div>
      <PaginationHeader
        total={usersData.total}
        offset={filter.offset}
        pageSize={PAGE_SIZE}
        onOffsetChange={(offset) => onFilterChange({ ...filter, offset })}
        label="users"
      />
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
            {usersData.users.map((user) => (
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
        {usersData.users.length === 0 && <div className="text-center py-8 text-white/40">No users found</div>}
      </div>
      <Pagination total={usersData.total} offset={filter.offset} pageSize={PAGE_SIZE} onOffsetChange={(offset) => onFilterChange({ ...filter, offset })} />
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
  const [devicesData] = api.admin.devices.useQuery({ query: { user_id: filter.user_id, limit: PAGE_SIZE, offset: filter.offset } })
  const [usersData] = api.admin.users.useQuery({ query: { limit: 1000 } })
  const [deleting, setDeleting] = useState<string | null>(null)

  const user = filter.user_id ? usersData?.users.find((u) => u.id === filter.user_id) : null

  const handleDelete = async (dongleId: string) => {
    if (!confirm(`Delete device ${dongleId} and ALL its data? This cannot be undone.`)) return
    setDeleting(dongleId)
    try {
      await api.admin.deleteDevice.mutate({ params: { dongleId } })
      invalidate('admin')
    } finally {
      setDeleting(null)
    }
  }

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
            {user.superuser && <span className="text-green-400">Superuser</span>}
          </div>
          <button onClick={() => onFilterChange({ offset: 0 })} className="ml-auto text-white/40 hover:text-white">
            <Icon name="close" className="text-base" />
          </button>
        </div>
      )}

      {!devicesData ? (
        <Loading />
      ) : (
        <>
          <PaginationHeader
            total={devicesData.total}
            offset={filter.offset}
            pageSize={PAGE_SIZE}
            onOffsetChange={(offset) => onFilterChange({ ...filter, offset })}
            label="devices"
          />
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
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {devicesData.devices.map((device) => (
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
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDelete(device.dongle_id)}
                        disabled={deleting === device.dongle_id}
                        className="text-white/40 hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Delete device"
                      >
                        <Icon name={deleting === device.dongle_id ? 'sync' : 'delete'} className="text-sm" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {devicesData.devices.length === 0 && <div className="text-center py-8 text-white/40">No devices found</div>}
          </div>
          <Pagination
            total={devicesData.total}
            offset={filter.offset}
            pageSize={PAGE_SIZE}
            onOffsetChange={(offset) => onFilterChange({ ...filter, offset })}
          />
        </>
      )}
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
  const [filesData] = api.admin.files.useQuery({
    query: {
      limit: PAGE_SIZE,
      offset: filter.offset,
      status: filter.status,
      dongle_id: filter.dongle_id,
      route_id: filter.route_id,
      sort: filter.sort,
      order: filter.order,
    },
  })
  const [devicesData] = api.admin.devices.useQuery({ query: { limit: 1000 } })
  const [routesData] = api.admin.routes.useQuery({ query: { dongle_id: filter.dongle_id, limit: 1000 } })
  const [deleting, setDeleting] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const device = filter.dongle_id ? devicesData?.devices.find((d) => d.dongle_id === filter.dongle_id) : null
  const route = filter.route_id && filter.dongle_id ? routesData?.routes.find((r) => r.route_id === filter.route_id && r.dongle_id === filter.dongle_id) : null

  const statusColors: Record<string, string> = {
    queued: 'bg-yellow-500/20 text-yellow-400',
    processing: 'bg-blue-500/20 text-blue-400',
    done: 'bg-green-500/20 text-green-400',
    error: 'bg-red-500/20 text-red-400',
  }

  const getFileUrl = (key: string, sig: string) => `${env.API_URL}/connectdata/${key}?sig=${sig}`

  const handleDelete = async (key: string) => {
    if (!confirm(`Delete file ${key}? This cannot be undone.`)) return
    setDeleting(key)
    try {
      await api.admin.deleteFile.mutate({ params: { key: encodeURIComponent(key) } })
      invalidate('admin')
    } finally {
      setDeleting(null)
    }
  }

  const handleStatusChange = async (key: string, status: 'queued' | 'processing' | 'done' | 'error') => {
    setUpdatingStatus(key)
    try {
      await api.admin.updateFileStatus.mutate({ params: { key: encodeURIComponent(key) }, body: { status } })
      invalidate('admin')
    } finally {
      setUpdatingStatus(null)
    }
  }

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
              <button
                onClick={() => onFilterChange({ ...filter, dongle_id: undefined, route_id: undefined, offset: 0 })}
                className="text-white/40 hover:text-white"
              >
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
              <button onClick={() => onFilterChange({ ...filter, route_id: undefined, offset: 0 })} className="text-white/40 hover:text-white">
                <Icon name="close" className="text-base" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status filter buttons */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <button
          onClick={() => onFilterChange({ ...filter, status: undefined, offset: 0 })}
          className={clsx('px-3 py-1 rounded-lg text-sm', !filter.status ? 'bg-white/20' : 'bg-background-alt hover:bg-white/10')}
        >
          All
        </button>
        {(['queued', 'processing', 'done', 'error'] as const).map((status) => (
          <button
            key={status}
            onClick={() => onFilterChange({ ...filter, status, offset: 0 })}
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
          <PaginationHeader
            total={filesData.total}
            offset={filter.offset}
            pageSize={PAGE_SIZE}
            onOffsetChange={(offset) => onFilterChange({ ...filter, offset })}
            label="files"
          />
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
                      onSort={(sort, order) => onFilterChange({ ...filter, sort, order, offset: 0 })}
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
                      onSort={(sort, order) => onFilterChange({ ...filter, sort, order, offset: 0 })}
                    />
                  </th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filesData.files.map((file) => (
                  <tr key={file.key} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{file.file}</span>
                        <a
                          href={getFileUrl(file.key, file.sig)}
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
                        onClick={() => onFilterChange({ ...filter, dongle_id: file.dongle_id, offset: 0 })}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {file.dongle_id}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-white/60">
                      {file.route_id ? (
                        <button
                          onClick={() => onFilterChange({ ...filter, dongle_id: file.dongle_id, route_id: file.route_id!, offset: 0 })}
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
                      <select
                        value={file.processingStatus}
                        onChange={(e) => handleStatusChange(file.key, e.target.value as 'queued' | 'processing' | 'done' | 'error')}
                        disabled={updatingStatus === file.key}
                        className={clsx(
                          'px-2 py-1 rounded text-xs cursor-pointer bg-transparent border border-white/20 focus:outline-none focus:border-primary',
                          statusColors[file.processingStatus],
                          updatingStatus === file.key && 'opacity-50',
                        )}
                        title={file.processingError || undefined}
                      >
                        {(['queued', 'processing', 'done', 'error'] as const).map((status) => (
                          <option key={status} value={status} className="bg-background text-white">
                            {status}
                          </option>
                        ))}
                      </select>
                      {file.processingError && <div className="text-xs text-red-400/70 mt-1 max-w-xs truncate">{file.processingError}</div>}
                    </td>
                    <td className="py-3 px-4 text-white/60">{formatDate(file.create_time)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDelete(file.key)}
                        disabled={deleting === file.key}
                        className="text-white/40 hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Delete file"
                      >
                        <Icon name={deleting === file.key ? 'sync' : 'delete'} className="text-sm" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filesData.files.length === 0 && <div className="text-center py-8 text-white/40">No files found</div>}
          </div>
          <Pagination total={filesData.total} offset={filter.offset} pageSize={PAGE_SIZE} onOffsetChange={(offset) => onFilterChange({ ...filter, offset })} />
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
  const [routesData] = api.admin.routes.useQuery({
    query: { limit: PAGE_SIZE, offset: filter.offset, dongle_id: filter.dongle_id, sort: filter.sort, order: filter.order },
  })
  const [devicesData] = api.admin.devices.useQuery({ query: { limit: 1000 } })

  const device = filter.dongle_id ? devicesData?.devices.find((d) => d.dongle_id === filter.dongle_id) : null

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
          <button onClick={() => onFilterChange({ ...filter, dongle_id: undefined, offset: 0 })} className="text-white/40 hover:text-white">
            <Icon name="close" className="text-base" />
          </button>
        </div>
      )}

      {!routesData ? (
        <Loading />
      ) : (
        <>
          <PaginationHeader
            total={routesData.total}
            offset={filter.offset}
            pageSize={PAGE_SIZE}
            onOffsetChange={(offset) => onFilterChange({ ...filter, offset })}
            label="routes"
          />
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
                      onSort={(sort, order) => onFilterChange({ ...filter, sort, order, offset: 0 })}
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
                      onSort={(sort, order) => onFilterChange({ ...filter, sort, order, offset: 0 })}
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
                        onClick={() => onFilterChange({ ...filter, dongle_id: route.dongle_id, offset: 0 })}
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
          <Pagination total={routesData.total} offset={filter.offset} pageSize={PAGE_SIZE} onOffsetChange={(offset) => onFilterChange({ ...filter, offset })} />
        </>
      )}
    </div>
  )
}

const parseSearchParams = (searchParams: URLSearchParams) => {
  const tab = (searchParams.get('tab') as Tab) || 'users'
  const usersFilter: UsersFilter = {
    offset: parseInt(searchParams.get('u_offset') || '0', 10),
  }
  const devicesFilter: DevicesFilter = {
    user_id: searchParams.get('d_user_id') || undefined,
    userEmail: searchParams.get('d_email') || undefined,
    offset: parseInt(searchParams.get('d_offset') || '0', 10),
  }
  const routesFilter: RoutesFilter = {
    dongle_id: searchParams.get('r_dongle') || undefined,
    sort: (searchParams.get('r_sort') as 'create_time' | 'size') || 'create_time',
    order: (searchParams.get('r_order') as 'asc' | 'desc') || 'desc',
    offset: parseInt(searchParams.get('r_offset') || '0', 10),
  }
  const filesFilter: FilesFilter = {
    dongle_id: searchParams.get('f_dongle') || undefined,
    route_id: searchParams.get('f_route') || undefined,
    status: (searchParams.get('f_status') as FilesFilter['status']) || undefined,
    sort: (searchParams.get('f_sort') as 'create_time' | 'size') || 'create_time',
    order: (searchParams.get('f_order') as 'asc' | 'desc') || 'desc',
    offset: parseInt(searchParams.get('f_offset') || '0', 10),
  }
  return { tab, usersFilter, devicesFilter, routesFilter, filesFilter }
}

const buildSearchParams = (tab: Tab, usersFilter: UsersFilter, devicesFilter: DevicesFilter, routesFilter: RoutesFilter, filesFilter: FilesFilter) => {
  const params = new URLSearchParams()
  if (tab !== 'users') params.set('tab', tab)

  if (usersFilter.offset) params.set('u_offset', String(usersFilter.offset))

  if (devicesFilter.user_id) params.set('d_user_id', devicesFilter.user_id)
  if (devicesFilter.userEmail) params.set('d_email', devicesFilter.userEmail)
  if (devicesFilter.offset) params.set('d_offset', String(devicesFilter.offset))

  if (routesFilter.dongle_id) params.set('r_dongle', routesFilter.dongle_id)
  if (routesFilter.sort !== 'create_time') params.set('r_sort', routesFilter.sort)
  if (routesFilter.order !== 'desc') params.set('r_order', routesFilter.order)
  if (routesFilter.offset) params.set('r_offset', String(routesFilter.offset))

  if (filesFilter.dongle_id) params.set('f_dongle', filesFilter.dongle_id)
  if (filesFilter.route_id) params.set('f_route', filesFilter.route_id)
  if (filesFilter.status) params.set('f_status', filesFilter.status)
  if (filesFilter.sort !== 'create_time') params.set('f_sort', filesFilter.sort)
  if (filesFilter.order !== 'desc') params.set('f_order', filesFilter.order)
  if (filesFilter.offset) params.set('f_offset', String(filesFilter.offset))

  return params
}

export const Component = () => {
  const [profile] = api.auth.me.useQuery({ enabled: isSignedIn() })
  const [searchParams, setSearchParams] = useSearchParams()

  const { tab: activeTab, usersFilter, devicesFilter, routesFilter, filesFilter } = parseSearchParams(searchParams)

  const updateState = (
    newTab: Tab,
    newUsersFilter: UsersFilter,
    newDevicesFilter: DevicesFilter,
    newRoutesFilter: RoutesFilter,
    newFilesFilter: FilesFilter,
  ) => {
    setSearchParams(buildSearchParams(newTab, newUsersFilter, newDevicesFilter, newRoutesFilter, newFilesFilter), { replace: true })
  }

  const setActiveTab = (tab: Tab) => updateState(tab, usersFilter, devicesFilter, routesFilter, filesFilter)
  const setUsersFilter = (f: UsersFilter) => updateState(activeTab, f, devicesFilter, routesFilter, filesFilter)
  const setDevicesFilter = (f: DevicesFilter) => updateState(activeTab, usersFilter, f, routesFilter, filesFilter)
  const setRoutesFilter = (f: RoutesFilter) => updateState(activeTab, usersFilter, devicesFilter, f, filesFilter)
  const setFilesFilter = (f: FilesFilter) => updateState(activeTab, usersFilter, devicesFilter, routesFilter, f)

  const handleViewDevices = (userId: string, email: string) => {
    updateState('devices', usersFilter, { user_id: userId, userEmail: email, offset: 0 }, routesFilter, filesFilter)
  }

  const handleViewFiles = (dongleId: string, routeId?: string) => {
    updateState('files', usersFilter, devicesFilter, routesFilter, { ...filesFilter, dongle_id: dongleId, route_id: routeId, offset: 0 })
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
          {activeTab === 'users' && <UsersTable filter={usersFilter} onFilterChange={setUsersFilter} onViewDevices={handleViewDevices} />}
          {activeTab === 'devices' && (
            <DevicesTable filter={devicesFilter} onFilterChange={setDevicesFilter} onViewFiles={(dongleId) => handleViewFiles(dongleId)} />
          )}
          {activeTab === 'routes' && (
            <RoutesTable filter={routesFilter} onFilterChange={setRoutesFilter} onViewFiles={(dongleId, routeId) => handleViewFiles(dongleId, routeId)} />
          )}
          {activeTab === 'files' && <FilesTable filter={filesFilter} onFilterChange={setFilesFilter} />}
        </div>
      </div>
    </div>
  )
}
