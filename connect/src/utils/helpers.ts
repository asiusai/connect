import { storage } from './storage'

export const accessToken = () => storage.get('accessToken')
export const setAccessToken = (token: string | undefined) => storage.set('accessToken', token)
export const isSignedIn = () => !!accessToken()

export const signOut = async () => {
  setAccessToken(undefined)
  const { invalidate } = await import('../api')
  invalidate()
}
