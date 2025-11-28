import { tsr } from '@ts-rest/serverless/fetch'
import { renderer } from '../src/api/contract'

export const router = tsr.platformContext<{}>().router(renderer, {
  status: {
    handler: async () => {
      return { status: 200, body: { alive: true } }
    },
  },
  progress: {
    handler: async () => {
      return { status: 200, body: { progress: 1 } }
    },
  },
  render: {
    handler: async () => {
      return { status: 200, body: { renderId: '' } }
    },
  },
})
