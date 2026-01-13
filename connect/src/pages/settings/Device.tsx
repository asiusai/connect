import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { ButtonBase } from '../../components/ButtonBase'
import { getDeviceName } from '../../types'
import { useRouteParams } from '../../utils/hooks'
import { Icon } from '../../components/Icon'

export const Device = () => {
  const { dongleId } = useRouteParams()
  const navigate = useNavigate()
  const [device, { refetch }] = api.device.get.useQuery({ params: { dongleId }, enabled: !!dongleId })
  const [_, devices] = api.devices.devices.useQuery({})
  const [alias, setAlias] = useState('')
  useEffect(() => setAlias(device?.alias || ''), [device?.alias])

  const unpair = api.device.unpair.useMutation({
    onSuccess: (data) => {
      if (data.success) navigate(window.location.origin)
    },
  })
  const changeName = api.device.set.useMutation({
    onSuccess: () => {
      refetch()
      devices.refetch()
    },
  })

  if (!device) return null
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold px-2">Device</h2>
      <div className="bg-background-alt rounded-xl p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-white/40">Alias</label>
          <div className="flex items-center gap-2">
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className="w-full bg-transparent border-b border-white/10 py-1 text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors font-medium"
              placeholder={getDeviceName(device)}
            />
            {alias !== device.alias && (
              <ButtonBase
                className="px-3 py-1 rounded-md bg-white text-black text-xs font-bold"
                onClick={() => changeName.mutate({ body: { alias }, params: { dongleId } })}
                disabled={changeName.isPending}
              >
                Save
              </ButtonBase>
            )}
          </div>
        </div>
      </div>

      {unpair.error && (
        <div className="flex gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
          <Icon className="text-xl" name="error" />
          {(unpair.error as any) || 'Unknown error'}
        </div>
      )}

      <ButtonBase
        className="flex items-center justify-center gap-2 p-4 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-medium"
        onClick={() => {
          if (confirm('Are you sure you want to unpair this device?')) {
            unpair.mutate({ params: { dongleId } })
          }
        }}
        disabled={unpair.isPending}
      >
        <Icon name="delete" />
        Unpair this device
      </ButtonBase>
    </div>
  )
}
