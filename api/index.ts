import { fetchRequestHandler } from '@ts-rest/serverless/fetch'
import { renderer } from '../src/api/contract'
import { router } from './router'

const server = Bun.serve({
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

console.log(`Started server on http://${server.hostname}:${server.port}`)
