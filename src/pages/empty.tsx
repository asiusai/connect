import { BuildInfo } from '~/components/BuildInfo'
import { Icon } from '~/components/material/Icon'

export const Component = () => {
  return (
    <div className="hidden size-full flex-col items-center justify-center gap-4 md:flex">
      <Icon name="search" size="48" />
      <span className="text-md">Select a route to view</span>
      <BuildInfo className="absolute bottom-4" />
    </div>
  )
}
