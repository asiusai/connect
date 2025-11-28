import { fetchRequestHandler } from '@ts-rest/serverless/fetch'
import { renderer } from '../src/api/contract'
import { router } from './router'

const PORT =8080
const HOSTNAME = "0.0.0.0"

console.log(`Started server on http://${HOSTNAME}:${PORT}`)

Bun.serve({
  port: PORT,
  hostname: HOSTNAME,
  fetch: async (request) => {
    const res = await fetchRequestHandler({
      contract: renderer,
      router,
      request,
      platformContext: {},
      options: {},
    })
    return res
  },
})
