import { contract } from '../../connect/src/api/contract'
import { NotImplementedError, tsr, verify } from '../common'

export const devices = tsr.router(contract.devices, {
  get: async ({ params }, { token }) => {
    console.log(token, verify(token, ''), params.dongleId)

    throw new NotImplementedError()
  },
  addUser: async () => {
    throw new NotImplementedError()
  },
  athenaOfflineQueue: async () => {
    throw new NotImplementedError()
  },
  bootlogs: async () => {
    throw new NotImplementedError()
  },
  crashlogs: async () => {
    throw new NotImplementedError()
  },
  deleteUser: async () => {
    throw new NotImplementedError()
  },
  devices: async () => {
    throw new NotImplementedError()
  },
  location: async () => {
    throw new NotImplementedError()
  },
  pair: async () => {
    throw new NotImplementedError()
  },
  set: async () => {
    throw new NotImplementedError()
  },
  stats: async () => {
    throw new NotImplementedError()
  },
  unpair: async () => {
    throw new NotImplementedError()
  },
  uploadFiles: async () => {
    throw new NotImplementedError()
  },
  users: async () => {
    throw new NotImplementedError()
  },
})
