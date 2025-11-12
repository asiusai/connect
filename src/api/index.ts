import { accessToken } from './auth/client'
import { API_URL } from './config'
import { contract } from './contract'
import { initQueryClient } from '@ts-rest/react-query'
import { initClient } from '@ts-rest/core'

export const api = initQueryClient(contract, {
  baseUrl: API_URL,
  baseHeaders: {
    authorization: `JWT ${accessToken()}`,
  },
})

export const api2 = initClient(contract, {
  baseUrl: API_URL,
  baseHeaders: {
    authorization: `JWT ${accessToken()}`,
  },
})
