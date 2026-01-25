import { initClient } from '@ts-rest/core'
import { getProvider, Mode } from './provider'
import { contract } from './contract'

export const createClient = (getAuth: () => string | undefined, mode?: Mode) => {
  const provider = getProvider(mode)
  return initClient(contract, {
    baseUrl: provider.API_URL,
    baseHeaders: {},
    validateResponse: true,
    api: async (args) => {
      let path = args.path
      const baseUrl = (args.route.metadata as any)?.baseUrl
      if (baseUrl) path = path.replace(provider.API_URL, baseUrl)

      if (args.contentType === 'multipart/form-data' && args.rawBody) {
        const data = new FormData()
        for (const [k, v] of Object.entries(args.rawBody)) data.append(k, v)
        args.body = data
      }

      const token = getAuth()
      if (token) args.headers.authorization = `JWT ${token}`

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
