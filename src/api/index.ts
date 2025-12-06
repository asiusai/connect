import { env } from '../utils/env'
import { accessToken } from '../utils/helpers'
import { contract } from './contract'
import { initTsrReactQuery } from '@ts-rest/react-query/v5'

const objectToFormData = (obj: object) => {
  const data = new FormData()
  for (const [k, v] of Object.entries(obj)) data.append(k, v)
  return data
}

export const api = initTsrReactQuery(contract, {
  baseUrl: env.API_URL,
  api: async (args) => {
    let path = args.path

    const baseUrl = (args.route.metadata as any)?.baseUrl
    if (baseUrl) path = path.replace(env.API_URL, baseUrl)

    // For some reason otherwise strings have quotes around them
    if (args.contentType === 'multipart/form-data' && args.rawBody) args.body = objectToFormData(args.rawBody)

    const res = await fetch(path, {
      method: args.method,
      body: args.body,
      headers: { ...args.headers, authorization: `JWT ${accessToken()}` },
    })

    if (res.status >= 400) {
      return { status: res.status, headers: res.headers, body: undefined }
    }
    const text = await res.text()

    try {
      const body = JSON.parse(text)

      const schema = args.route.responses[res.status] as any | undefined
      if (!schema) console.warn(`Unexpected return status: ${res.status}, res: ${text}`)
      else {
        const parse = schema?.safeParse(body)
        if (!parse.success) console.warn(`API response parsing failed, status: ${res.status}, error: ${parse.error}`)
      }

      return { status: res.status, headers: res.headers, body }
    } catch (e) {
      console.error(e)
      console.log(`Parsing body status: ${res.status}, res: ${text}`)
      return { status: res.status, headers: res.headers, body: undefined }
    }
  },
  validateResponse: true,
})
