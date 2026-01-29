import { initClient } from '@ts-rest/core'
import { getProviderInfo, Provider } from './provider'
import { contract } from './contract'

const REPLACE_STR = 'XXXXXXXXXXXXX'

export const createClient = (getState: () => { token: string | undefined; provider: Provider }) => {
  return initClient(contract, {
    baseUrl: REPLACE_STR,
    baseHeaders: {},
    validateResponse: true,
    api: async (args) => {
      const { token, provider } = getState()
      const info = getProviderInfo(provider)

      const baseUrl = info[(args.route.metadata as any)?.baseUrl as 'athenaUrl' | 'billingUrl']
      let path = args.path.replace(REPLACE_STR, baseUrl ?? info.apiUrl)

      if (args.contentType === 'multipart/form-data' && args.rawBody) {
        const data = new FormData()
        for (const [k, v] of Object.entries(args.rawBody)) data.append(k, v)
        args.body = data
      }

      if (token && !args.headers.authorization) args.headers.authorization = `JWT ${token}`

      // Add sig/exp from URL params for shared routes
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const sig = urlParams.get('sig')
        const exp = urlParams.get('exp')
        if (sig && exp) path = `${path}${path.includes('?') ? '&' : '?'}sig=${encodeURIComponent(sig)}&exp=${encodeURIComponent(exp)}`
      }
      const res = await fetch(path, { method: args.method, body: args.body, headers: args.headers })

      const text = await res.text()
      try {
        const body = text ? JSON.parse(text) : undefined
        return { status: res.status, headers: res.headers, body }
      } catch {
        return { status: res.status, headers: res.headers, body: text }
      }
    },
  })
}
