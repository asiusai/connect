import { env } from '../../../shared/env'
import { getProviderInfo } from '../../../shared/provider'
import { useAuth } from '../hooks/useAuth'

const stringify = (obj: Record<string, string>) => new URLSearchParams(obj).toString()

export const useLoginProviders = () => {
  const { provider } = useAuth()

  const info = getProviderInfo(provider)
  // When using comma provider and not on localhost, then we need to go through a new-connect proxy
  const state = `service,${window.location.hostname !== 'localhost' && provider === 'comma' ? env.HACK_LOGIN_CALLBACK_HOST : window.location.host}`

  return [
    {
      name: 'github',
      title: 'GitHub',
      image: '/logo-github.svg',
      href: info.githubClientId
        ? `https://github.com/login/oauth/authorize?${stringify({
            client_id: info.githubClientId,
            redirect_uri: `${info.authUrl}/v2/auth/h/redirect/`,
            scope: provider === 'asius' ? 'user:email' : 'read:user',
            state,
          })}`
        : undefined,
    },
    {
      name: 'google',
      title: 'Google',
      image: '/logo-google.svg',
      href: info.googleClientId
        ? `https://accounts.google.com/o/oauth2/auth?${stringify({
            type: 'web_server',
            client_id: info.googleClientId,
            redirect_uri: `${info.authUrl}/v2/auth/g/redirect/`,
            response_type: 'code',
            scope: 'https://www.googleapis.com/auth/userinfo.email',
            prompt: 'select_account',
            state,
          })}`
        : undefined,
    },
    {
      name: 'apple',
      title: 'Apple',
      image: '/logo-apple.svg',
      href: info.appleClientId
        ? `https://appleid.apple.com/auth/authorize?${stringify({
            client_id: info.appleClientId,
            redirect_uri: `${info.authUrl}/v2/auth/a/redirect/`,
            response_type: 'code',
            response_mode: 'form_post',
            scope: 'name email',
            state,
          })}`
        : undefined,
    },
  ]
}
