import { useState } from 'react'
import { AthenaParams, AthenaRequest, AthenaResponse } from '../../../shared/athena'

const SERVICE_UUID = 'a51a5a10-0001-4c0d-b8e6-a51a5a100001'
const RPC_REQUEST_UUID = 'a51a5a10-0002-4c0d-b8e6-a51a5a100001'
const RPC_RESPONSE_UUID = 'a51a5a10-0003-4c0d-b8e6-a51a5a100001'

const log = (msg: string) => console.log(msg)
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'not-supported'

export class Bluetooth {
  status: ConnectionStatus = 'disconnected'
  device?: BluetoothDevice
  server?: BluetoothRemoteGATTServer
  requestChar?: BluetoothRemoteGATTCharacteristic
  responseChar?: BluetoothRemoteGATTCharacteristic
  responseBuffer = ''
  requestId = 0
  pendingRequests = new Map<number, (value: any) => void>()

  connect = async () => {
    if (!navigator.bluetooth) {
      this.status = 'not-supported'
      return
    }

    try {
      this.status = 'connecting'
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }, { namePrefix: 'comma-' }],
        optionalServices: [SERVICE_UUID],
      })

      this.device.addEventListener('gattserverdisconnected', () => {
        this.status = 'disconnected'
      })

      this.server = await this.device!.gatt!.connect()

      log('Getting Athena service...')
      const service = await this.server.getPrimaryService(SERVICE_UUID)

      log('Getting characteristics...')
      this.requestChar = await service.getCharacteristic(RPC_REQUEST_UUID)
      this.responseChar = await service.getCharacteristic(RPC_RESPONSE_UUID)

      log('Starting notifications...')
      await this.responseChar.startNotifications()

      this.responseChar.addEventListener('characteristicvaluechanged', this.handleResponse)

      log('Connected!')
      this.status = 'connected'
    } catch (e) {
      this.status = 'disconnected'
      console.error(e)
    }
  }
  handleResponse = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic
    const decoder = new TextDecoder('utf-8')
    const chunk = decoder.decode(target.value)

    this.responseBuffer += chunk

    try {
      const response = JSON.parse(this.responseBuffer)
      log('Response received')
      this.responseBuffer = ''

      const resolve = this.pendingRequests.get(response.id)
      if (resolve) {
        resolve(response.result)
        this.pendingRequests.delete(response.id)
      }
    } catch {
      // Incomplete JSON, wait for more
    }
  }
  disconnect = async () => {
    if (this.device?.gatt?.connected) this.device.gatt.disconnect()

    this.device = undefined
    this.status = 'disconnected'
  }
  call = async <T extends AthenaRequest>(method: T, params: AthenaParams<T>): Promise<AthenaResponse<T> | undefined> => {
    if (!this.requestChar) {
      log('Not connected')
      return
    }

    this.requestId++
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id: this.requestId,
    }

    const json = JSON.stringify(request)
    log(`Calling ${method}...`)

    const responsePromise = new Promise<AthenaResponse<T>>((resolve) => {
      this.pendingRequests.set(this.requestId, resolve)
    })

    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(json)

      const MTU = 512
      for (let i = 0; i < data.length; i += MTU) {
        const chunk = data.slice(i, i + MTU)
        await this.requestChar.writeValue(chunk)
      }

      return await responsePromise
    } catch (error) {
      log(`Error: ${(error as Error).message}`)
      this.pendingRequests.delete(this.requestId)
    }
  }
}
const ble = new Bluetooth()

export const Component = () => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [response, setResponse] = useState('-')

  const connect = async () => {
    await ble.connect()
    setStatus(ble.status)
  }
  const disconnect = async () => {
    await ble.disconnect()
    setStatus(ble.status)
  }
  const call: typeof ble.call = async (method, params) => {
    const res = await ble.call(method, params)
    console.log(res)
    setResponse(JSON.stringify(res, null, 2))
    return res
  }

  const isConnected = status === 'connected'
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white p-5">
      <div className="max-w-150 mx-auto">
        <h1 className="text-[#4ade80] text-3xl font-bold mb-4">BLE Athena</h1>

        <div className={`p-2.5 rounded-lg mb-2.5`}>{status}</div>

        <div className="mb-5">
          <button
            onClick={connect}
            disabled={isConnected}
            className="bg-[#4ade80] text-black border-none px-6 py-3 text-base rounded-lg cursor-pointer m-1.5 hover:bg-[#22c55e] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
          >
            New Device
          </button>
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="bg-[#4ade80] text-black border-none px-6 py-3 text-base rounded-lg cursor-pointer m-1.5 hover:bg-[#22c55e] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
          >
            Disconnect
          </button>
        </div>

        <div className="my-5">
          <h3 className="mt-5 mb-2.5">Device Info</h3>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => call('getVersion', undefined)}
            disabled={!isConnected}
          >
            getVersion
          </button>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => call('getNetworkType', undefined)}
            disabled={!isConnected}
          >
            getNetworkType
          </button>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => call('getNetworkMetered', undefined)}
            disabled={!isConnected}
          >
            getNetworkMetered
          </button>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => call('getNetworks', undefined)}
            disabled={!isConnected}
          >
            getNetworks
          </button>
        </div>

        <div className="my-5">
          <h3 className="mt-5 mb-2.5">Device</h3>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => call('getPublicKey', undefined)}
            disabled={!isConnected}
          >
            getPublicKey
          </button>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => call('getGithubUsername', undefined)}
            disabled={!isConnected}
          >
            getGithubUsername
          </button>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => call('getSimInfo', undefined)}
            disabled={!isConnected}
          >
            getSimInfo
          </button>
        </div>

        <div className="my-5">
          <h3 className="mt-5 mb-2.5">Params</h3>
          <button
            className="bg-[#3b82f6] text-white border-none px-4 py-2 text-sm rounded-lg cursor-pointer m-1 hover:bg-[#2563eb] disabled:bg-[#666] disabled:text-[#999] disabled:cursor-not-allowed"
            onClick={() => call('getAllParams', undefined)}
            disabled={!isConnected}
          >
            getAllParams
          </button>
        </div>

        <h3 className="mt-5 mb-2.5">Response</h3>
        <div className="bg-[#1e3a5f] p-4 rounded-lg font-mono text-xs my-2.5 whitespace-pre-wrap break-all max-h-37.5 overflow-y-auto">{response}</div>
      </div>
    </div>
  )
}
