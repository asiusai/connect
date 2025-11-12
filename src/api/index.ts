import { tsRestFetchApi } from '@ts-rest/core'
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
  api:async (args)=>{
    const res = await tsRestFetchApi(args)
    if (res.status>400) toast.error(`Request to ${args.path} failed, code: ${res.status}`)
    return res
  },
  validateResponse: true,
})
