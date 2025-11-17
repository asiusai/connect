import clsx from 'clsx'

import { USERADMIN_URL } from '../utils/consts'
import { Icon } from '../components/material/Icon'
import type { Route } from '../types'
import { ToggleButton } from './material/ToggleButton'
import { api } from '../api'
import { useEffect, useState } from 'react'
import { usePreservedRoutes } from '../api/queries'

export const RouteActions = ({ routeName, route }: { routeName: string; route: Route }) => {
  const [preserved] = usePreservedRoutes(route.dongle_id)

  const [isPublic, setIsPublic] = useState<boolean | undefined>(route.is_public)
  const [isPreserved, setIsPreserved] = useState<boolean>()
  const [copied, setCopied] = useState(false)

  useEffect(() => setIsPreserved(preserved ? preserved.some((p) => p.fullname === routeName) : undefined), [preserved, routeName])

  return (
    <div className="flex flex-col rounded-b-md gap-4 mx-5 mb-4">
      <div className="font-mono text-xs text-zinc-500">
        <div className="flex justify-between">
          <span className="mb-2 text-on-surface-variant">Route ID:</span>
          <a
            href={`${USERADMIN_URL}/?onebox=${routeName.replace('|', '/')}`}
            className="text-blue-400 hover:text-blue-500 duration-200"
            target="_blank"
            rel="noopener noreferrer"
          >
            View in useradmin
          </a>
        </div>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(routeName)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="flex w-full cursor-pointer items-center justify-between rounded-lg border-2 border-surface-container-high bg-surface-container-lowest p-3 hover:bg-surface-container-low"
        >
          <div className="lg:text-sm">{routeName}</div>
          <Icon className={clsx('mx-2', copied && 'text-green-300')} name={copied ? 'check' : 'file_copy'} size="20" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <ToggleButton
          label="Preserve"
          active={isPreserved}
          onToggle={async () => {
            setIsPreserved(!isPreserved)
            !isPreserved
              ? await api.routes.preserve.mutate({ body: {}, params: { routeName } })
              : await api.routes.unPreserve.mutate({ body: {}, params: { routeName } })
          }}
        />
        <ToggleButton
          label="Public"
          active={isPublic}
          onToggle={async () => {
            await api.routes.setPublic.mutate({ body: { is_public: !isPublic }, params: { routeName } })
            setIsPublic(!isPublic)
          }}
        />
      </div>
    </div>
  )
}
