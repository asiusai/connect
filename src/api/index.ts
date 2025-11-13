import { accessToken } from './auth/client'
import { API_URL } from './config'
import { contract } from './contract'
import { initTsrReactQuery } from '@ts-rest/react-query/v5'
import { toast } from 'sonner'

export const api = initTsrReactQuery(contract, {
  baseUrl: API_URL,
  api: async (args) => {
    let path = args.path

    const baseUrl = (args.route.metadata as any)?.baseUrl
    if (baseUrl) path = path.replace(API_URL, baseUrl)

    const res = await fetch(path, {
      method: args.method,
      body: args.body,
      headers: { ...args.headers, authorization: `JWT ${accessToken()}` },
    })
    if (res.status > 400) toast.error(`Request to ${path} failed, code: ${res.status}`)

    const schema = args.route.responses[res.status] as any

    let body = await res.text()
    try {
      body = schema.parse(JSON.parse(body))
    } catch (e) {
      toast.error('Invalid body')
      console.error(e)
      console.log(`Invalid body: ${body}`)
    }

    return { status: res.status, headers: res.headers, body }
  },
  validateResponse: true,
})
