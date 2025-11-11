import { initContract } from '@ts-rest/core'
import { z } from 'zod'

const c = initContract()

const User = z.object({
  email: z.string(),
  id: z.string(),
  regdate: z.number(),
  superuser: z.boolean(),
  user_id: z.string(),
})

export const contract = c.router({
  me: {
    method: 'GET',
    path: '/v1/me/',
    responses: {
      200: User,
    },
  },
})
