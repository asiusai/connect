import { fetchRequestHandler } from '@ts-rest/serverless/fetch'
import { renderer } from '../src/api/contract'
import { router } from './router'

const server = Bun.serve({
  port: 8080,
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
