import clsx from 'clsx'

import { Icon, type IconName } from '../components/material/Icon'
import { Button } from './material/Button'
import type { Route } from '../types'
import { useState } from 'react'
import { FileType, uploadSegments } from '../api/file'

const BUTTON_TYPES = ['road', 'driver', 'logs', 'all'] as const
type ButtonType = (typeof BUTTON_TYPES)[number]
type ButtonState = 'idle' | 'loading' | 'success' | 'error'

const BUTTON_TO_FILE_TYPES = {
  road: ['cameras', 'ecameras'],
  driver: ['dcameras'],
  logs: ['logs'],
} as const

export const UploadButton = (props: { state: ButtonState; onClick: () => void; icon: IconName; text: string }) => {
  const icon = () => props.icon
  const state = () => props.state
  const disabled = () => state() === 'loading' || state() === 'success'

  const handleUpload = () => {
    if (disabled()) return
    props.onClick?.()
  }

  const stateToIcon: Record<ButtonState, IconName> = {
    idle: icon(),
    loading: 'progress_activity',
    success: 'check',
    error: 'error',
  }

  return (
    <Button
      onClick={() => handleUpload()}
      className="px-2 md:px-3"
      disabled={disabled()}
      leading={<Icon className={clsx(state() === 'loading' && 'animate-spin')} name={stateToIcon[state()]} size="20" />}
      color="primary"
    >
      <span className="flex items-center gap-1 font-mono">{props.text}</span>
    </Button>
  )
}

export const RouteUploadButtons = (props: { route: Route | undefined }) => {
  const [uploadStore, setUploadStore] = useState<Record<ButtonType, ButtonState>>({
    road: 'idle',
    driver: 'idle',
    logs: 'idle',
    all: 'idle',
  })

  const updateButtonStates = (buttons: ButtonType[], state: ButtonState) => {
    setUploadStore((store) => ({ ...store, ...Object.fromEntries(buttons.map((x) => [x, state])) }))
  }

  const handleUpload = async (type: ButtonType) => {
    if (!props.route) return
    const { fullname, maxqlog } = props.route

    const uploadButtonTypes: ButtonType[] = [type]
    let uploadFileTypes: FileType[] = []
    const types = type === 'all' ? (['road', 'driver', 'logs'] as const) : [type]
    for (const type of types) {
      const state = uploadStore[type]
      if (state === 'loading' || state === 'success') continue
      uploadButtonTypes.push(type)
      uploadFileTypes = uploadFileTypes.concat(BUTTON_TO_FILE_TYPES[type])
    }

    updateButtonStates(uploadButtonTypes, 'loading')
    try {
      await uploadSegments(fullname, maxqlog + 1, uploadFileTypes)
      updateButtonStates(uploadButtonTypes, 'success')
    } catch (err) {
      console.error('Failed to upload', err)
      updateButtonStates(uploadButtonTypes, 'error')
    }
  }

  return (
    <div className="flex flex-col rounded-b-md m-5">
      <div className="grid grid-cols-2 gap-3 w-full lg:grid-cols-4">
        <UploadButton text="Road" icon="videocam" state={uploadStore.road} onClick={() => handleUpload('road')} />
        <UploadButton text="Driver" icon="person" state={uploadStore.driver} onClick={() => handleUpload('driver')} />
        <UploadButton text="Logs" icon="description" state={uploadStore.logs} onClick={() => handleUpload('logs')} />
        <UploadButton text="All" icon="upload" state={uploadStore.all} onClick={() => handleUpload('all')} />
      </div>
    </div>
  )
}
