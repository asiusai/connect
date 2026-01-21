import { BackButton } from '../components/BackButton'
import { TopAppBar } from '../components/TopAppBar'
import { useAsyncMemo, useRouteParams } from '../utils/hooks'
import { useAthena } from '../api/athena'
import { Select } from '../components/Select'
import { useState } from 'react'
import { SyntaxHighlightedJson } from '../components/SyntaxHighlightedJson'
import { Service } from '../../../shared/types'
import { Loading } from '../components/Loading'
import clsx from 'clsx'
import { Label } from '../components/Label'
import { useStorage } from '../utils/storage'

export const Component = () => {
  const { dongleId } = useRouteParams()
  const [service, setService] = useStorage('analyzeService')
  const [state, setState] = useState<'loading' | 'error' | 'success'>()
  const athena = useAthena()
  const json = useAsyncMemo(async () => {
    setState('loading')
    const res = await athena('getMessage', { service, timeout: 5000 })

    if (res?.error) setState('error')
    else setState('success')

    return JSON.stringify(res, null, 2)
  }, [service])

  return (
    <>
      <TopAppBar leading={<BackButton href={`/${dongleId}`} />}>Analyze</TopAppBar>
      <div className="p-6 flex flex-col gap-6">
        <Label>
          Service
          <Select value={service} onChange={(e) => setService(e)} options={Service.options.map((x) => ({ value: x, label: x }))} />
        </Label>
        {state === 'loading' && <Loading className="h-64 w-full rounded-lg" />}
        {state !== 'loading' && json && (
          <div className={clsx(state === 'error' ? 'bg-error-x' : 'bg-background-alt', 'whitespace-pre rounded-lg p-4')}>
            <SyntaxHighlightedJson json={json} />
          </div>
        )}
      </div>
    </>
  )
}
