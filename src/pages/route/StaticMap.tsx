import clsx from 'clsx'
import { Route } from '../../types'
import { getCoords } from '../../utils/derived'
import { getPathStaticMapUrl } from '../../utils/map'
import { useAsyncMemo } from '../../utils/hooks'

export const StaticMap = ({ route, className }: { className?: string; route: Route }) => {
  const image = useAsyncMemo(async () => {
    const coords = await getCoords(route)
    if (!coords.length) return

    const paths: [number, number][] = coords.map(({ lng, lat }) => [lng, lat])
    return getPathStaticMapUrl('dark', paths, 512, 512, true)
  }, [route])

  return (
    <div className={clsx('relative aspect-square md:aspect-auto rounded-xl overflow-hidden shrink-0 bg-background-alt', className)}>
      {image ? (
        <img className="pointer-events-none size-full object-cover" src={image} />
      ) : (
        <img className="size-full p-20" src="/images/comma-white.svg" />
      )}
    </div>
  )
}
