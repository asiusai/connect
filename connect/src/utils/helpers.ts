import { useStorage } from './storage'

export const accessToken = () => useStorage.getState().accessToken
export const setAccessToken = (accessToken: string | undefined) => useStorage.setState({ accessToken })
export const isSignedIn = () => !!accessToken()

export const signOut = async () => {
  setAccessToken(undefined)
  const { invalidate } = await import('../api')
  invalidate()
}
