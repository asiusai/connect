import { eq } from 'drizzle-orm'
import { contract } from '../../connect/src/api/contract'
import { generateAuthToken } from '../auth'
import { BadRequestError, NotImplementedError, randomId, tsr } from '../common'
import { db } from '../db/client'
import { usersTable } from '../db/schema'
import { env } from '../env'
import { noMiddleware, userMiddleware } from '../middleware'

const findOrCreateUser = async (email: string) => {
  const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) })
  if (existing) return existing

  const id = randomId()
  const user = await db
    .insert(usersTable)
    .values({ id, email, user_id: id, superuser: env.SUPERUSERS.includes(email) })
    .returning()
    .then((x) => x[0])
  return { ...user, regdate: Date.now(), superuser: false, username: null }
}

export const auth = tsr.router(contract.auth, {
  auth: noMiddleware(async ({ body }, { origin }) => {
    if (body.provider === 'google') {
      const res1 = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: body.code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${origin}/v2/auth/g/redirect/`,
          grant_type: 'authorization_code',
        }),
      })
      if (!res1.ok) throw new BadRequestError(`Failed to exchange code: ${await res1.text()}`)
      const { access_token } = (await res1.json()) as { access_token: string }

      const res2 = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${access_token}` } })
      if (!res2.ok) throw new BadRequestError('Failed to get user info')
      const googleUser = (await res2.json()) as { id: string; email: string }

      const user = await findOrCreateUser(googleUser.email)
      const token = generateAuthToken(user.id)
      return { status: 200, body: { access_token: token } }
    }

    if (body.provider === 'github') {
      const res1 = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          code: body.code,
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          redirect_uri: `${origin}/v2/auth/h/redirect/`,
        }),
      })
      if (!res1.ok) throw new BadRequestError(`Failed to exchange code: ${await res1.text()}`)
      const { access_token } = (await res1.json()) as { access_token: string }

      const res2 = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'Asius' },
      })
      if (!res2.ok) throw new BadRequestError(`Failed to get user emails: ${await res2.text()}`)
      const emails = (await res2.json()) as { email: string; primary: boolean; verified: boolean }[]
      const primaryEmail = emails.find((e) => e.primary && e.verified)?.email
      if (!primaryEmail) throw new BadRequestError('No verified primary email found')

      const user = await findOrCreateUser(primaryEmail)
      const token = generateAuthToken(user.id)
      return { status: 200, body: { access_token: token } }
    }

    throw new BadRequestError('Unsupported provider')
  }),
  appleRedirect: noMiddleware(async () => {
    throw new NotImplementedError('Apple auth not available')
  }),
  githubRedirect: noMiddleware(async ({ query }, { responseHeaders }) => {
    const [_, host] = query.state.split(',')
    responseHeaders.set('Location', `${host.includes('localhost') ? 'http' : 'https'}://${host}/auth/?code=${query.code}&provider=github`)
    return { status: 302, body: undefined }
  }),
  googleRedirect: noMiddleware(async ({ query }, { responseHeaders }) => {
    const [_, host] = query.state.split(',')
    responseHeaders.set('Location', `${host.includes('localhost') ? 'http' : 'https'}://${host}/auth/?code=${query.code}&provider=google`)
    return { status: 302, body: undefined }
  }),
  me: userMiddleware(async (_, { identity }) => {
    return { status: 200, body: { ...identity.user, regdate: identity.user.regdate } }
  }),
})
