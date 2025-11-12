import clsx from 'clsx'

import { USERADMIN_URL } from '~/api/config'
import { Icon } from '~/components/material/Icon'
import type { Route } from '~/api/types'
import { ToggleButton } from './material/ToggleButton'
import { api } from '~/api'
import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

export const RouteActions = ({ routeName, route }: { routeName: string; route: Route | undefined }) => {
  const { dongleId } = useParams()
  if (!dongleId) throw new Error('No dongleId!')
  const preserved = api.routes.preserved.useQuery({ queryKey: ['preserved', dongleId], queryData: { params: { dongleId } } })

  const [isPublic, setIsPublic] = useState<boolean | undefined>(route?.is_public)
  const [isPreserved, setIsPreserved] = useState<boolean>()
  useEffect(() => {
    if (preserved.data?.body) setIsPreserved(preserved.data.body.some((p) => p.fullname === route?.fullname))
    else setIsPreserved(undefined)
  }, [])

  const currentRouteId = routeName.replace('|', '/')
  const useradminUrl = `${USERADMIN_URL}/?onebox=${currentRouteId}`

  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const togglePublic = async () => {
    setError(null)
    if (isPublic === undefined) return
    const res = await api.routes.setPublic.mutate({ body: { is_public: !isPublic }, params: { routeName } })

    if (res.status === 200) setIsPublic(!isPublic)
    else setError('Failed to make route public')
  }

  const togglePreserved = async () => {
    if (isPreserved === undefined) return
    const res = !isPreserved
      ? await api.routes.preserve.mutate({ body: {}, params: { routeName } })
      : await api.routes.unPreserve.mutate({ body: {}, params: { routeName } })

    if (res.status === 200) setIsPreserved(!isPublic)
    else setError('Failed to preserve route')
  }

  const copyCurrentRouteId = async () => {
    if (!routeName || !navigator.clipboard) return

    try {
      await navigator.clipboard.writeText(currentRouteId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy route ID: ', err)
    }
  }

  return (
    <div className="flex flex-col rounded-b-md gap-4 mx-5 mb-4">
      <div className="font-mono text-xs text-zinc-500">
        <div className="flex justify-between">
          <span className="mb-2 text-on-surface-variant">Route ID:</span>
          <a href={useradminUrl} className="text-blue-400 hover:text-blue-500 duration-200" target="_blank" rel="noopener noreferrer">
            View in useradmin
          </a>
        </div>
        <button
          onClick={() => void copyCurrentRouteId()}
          className="flex w-full cursor-pointer items-center justify-between rounded-lg border-2 border-surface-container-high bg-surface-container-lowest p-3 hover:bg-surface-container-low"
        >
          <div className="lg:text-sm">
            <span className="break-keep inline-block">{currentRouteId.split('/')[0] || ''}/</span>
            <span className="break-keep inline-block">{currentRouteId.split('/')[1] || ''}</span>
          </div>
          <Icon className={clsx('mx-2', copied && 'text-green-300')} name={copied ? 'check' : 'file_copy'} size="20" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <ToggleButton label="Preserve Route" active={isPreserved} onToggle={togglePreserved} />
        <ToggleButton label="Public Access" active={isPublic} onToggle={togglePublic} />
      </div>

      {error && (
        <div className="flex gap-2 rounded-sm bg-surface-container-high p-2 text-sm text-on-surface">
          <Icon className="text-error" name="error" size="20" />
          {error}
        </div>
      )}
    </div>
  )
}
