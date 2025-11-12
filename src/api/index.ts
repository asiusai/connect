import { accessToken } from './auth/client'
import { API_URL } from './config'
import { contract } from './contract'
import { initQueryClient } from '@ts-rest/react-query'

export const api = initQueryClient(contract, {
  baseUrl: API_URL,
  baseHeaders: {
    authorization: `JWT ${accessToken()}`,
  },
})
