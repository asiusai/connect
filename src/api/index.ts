import { accessToken } from './auth/client'
import { API_URL } from './config'
import { contract } from './contract'
import { initQueryClient } from '@ts-rest/react-query'
import { toast } from 'sonner'

export const api = initQueryClient(contract, {
  baseUrl: API_URL,
  baseHeaders: {
    authorization: `JWT ${accessToken()}`,
  },
  api: async (args) => {
    const res = await fetch(args.path, {
      method: args.method,
      body: args.body,
      headers: args.headers,
    })
    if (res.status > 400) toast.error(`Request to ${args.path} failed, code: ${res.status}`)

    const schema = args.route.responses[res.status] as any

    let body = await res.text()
    try {
      body = schema.parse(JSON.parse(body))
    } catch {
      toast.error('Invalid body')
      console.log(`Invalid body: ${body}`)
    }

    return { status: res.status, headers: res.headers, body }
  },
  validateResponse: true,
})
