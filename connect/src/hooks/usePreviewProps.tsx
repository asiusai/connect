import { useMemo } from 'react'
import { useRouteParams } from '.'
import { PreviewProps } from '../../../shared/types'
import { api } from '../api'
import { useFiles } from '../api/queries'
import { useSettings } from './useSettings'

export const usePreviewProps = () => {
  const { routeName } = useRouteParams()
  const [route] = api.route.get.useQuery({ params: { routeName: routeName.replace('/', '|') }, query: {} })
  const [files] = useFiles(routeName, route)
  const { largeCameraType, smallCameraType, logType, unitFormat, showPath } = useSettings()

  const props = useMemo<PreviewProps>(
    () => ({
      routeName,
      largeCameraType,
      smallCameraType,
      logType,
      data: files && route ? { files, route } : undefined,
      unitFormat,
      showPath,
    }),
    [largeCameraType, smallCameraType, logType, files, route, showPath, routeName, unitFormat],
  )
  return props
}
