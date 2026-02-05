import { useMemo } from 'react'
import { api } from '.'
import { toSegmentFiles } from '../../../shared/helpers'
import { Route } from '../../../shared/types'

export const useFiles = (routeName: string, route: Route | undefined, refetchInterval?: number) => {
  const [files, res] = api.route.files.useQuery({
    params: { routeName: routeName.replace('/', '|') },
    query: {},
    refetchInterval,
  })
  const files2 = useMemo(() => (files ? toSegmentFiles(files, route ? route.maxqlog + 1 : undefined) : undefined), [files, route])
  return [files2, res] as const
}
