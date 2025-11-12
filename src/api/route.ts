import type { RouteInfo, RouteShareSignature } from '~/api/types'

import { fetcher } from '.'
import { API_URL } from './config'

export const parseRouteName = (routeName: string): RouteInfo => {
  const [dongleId, routeId] = routeName.split('|')
  return { dongleId, routeId }
}

export const createQCameraStreamUrl = (routeName: string, signature: RouteShareSignature): string =>
  `${API_URL}/v1/route/${routeName}/qcamera.m3u8?${new URLSearchParams(signature).toString()}`
