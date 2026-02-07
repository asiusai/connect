import { useProviderInfo } from '../hooks/useAuth'

const stringify = (obj: Record<string, string>) => new URLSearchParams(obj).toString()

export const useLoginProviders = () => {
  const info = useProviderInfo()

  // When using comma provider and not on localhost, then we need to go through a new-connect proxy
  const state = `service,${window.location.hostname !== 'localhost' && info.loginCallbackHostHack ? info.loginCallbackHostHack : window.location.host}`

  return [
    {
      name: 'github',
      title: 'GitHub',
      image: '/logo-github.svg',
      href: info.githubClientId
        ? `https://github.com/login/oauth/authorize?${stringify({
            client_id: info.githubClientId,
            redirect_uri: `${info.authUrl}/v2/auth/h/redirect/`,
            scope: info.googleScope ?? 'read:user',
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
