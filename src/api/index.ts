import { accessToken } from '../utils/helpers'
import { API_URL } from '../utils/consts'
import { contract } from './contract'
import { initTsrReactQuery } from '@ts-rest/react-query/v5'
import { toast } from 'sonner'

const objectToFormData = (obj: object) => {
  const data = new FormData()
  for (const [k, v] of Object.entries(obj)) data.append(k, v)
  return data
}

export const api = initTsrReactQuery(contract, {
  baseUrl: API_URL,
  api: async (args) => {
    let path = args.path

    const baseUrl = (args.route.metadata as any)?.baseUrl
    if (baseUrl) path = path.replace(API_URL, baseUrl)

    // For some reason otherwise strings have quotes around them
    if (args.contentType === 'multipart/form-data' && args.rawBody) args.body = objectToFormData(args.rawBody)

    const res = await fetch(path, {
      method: args.method,
      body: args.body,
      headers: { ...args.headers, authorization: `JWT ${accessToken()}` },
    })

    let body = await res.text()

    if (res.status >= 400) console.error(`Request to ${path} failed with code: ${res.status}`)
    else {
      const schema = args.route.responses[res.status] as any

      try {
        body = schema.parse(JSON.parse(body))
      } catch (e) {
        toast.error('Invalid body')
        console.error(e)
        console.log(`Invalid body: ${body}`)
      }
    }
    return { status: res.status, headers: res.headers, body }
  },
  validateResponse: true,
})
