import { fetchRequestHandler } from '@ts-rest/serverless/fetch'
import { renderer } from '../src/api/contract'
import { router } from './router'
import { USER_CONTENT_DIR } from '../src/utils/consts'

const server = Bun.serve({
  port: 8080,
  fetch: async (request) => {
    const path = new URL(request.url).pathname

    if (path.startsWith(`/${USER_CONTENT_DIR}`)) return new Response(Bun.file(path.slice(1)))

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
