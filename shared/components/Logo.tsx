import { Mode, provider } from '../provider'
import { AsiusLogo, CommaLogo, IconProps, KonikLogo } from '../icons'

export const Logo = ({ mode = provider.MODE, ...props }: { mode?: Mode } & IconProps) => {
  const Icon = mode === 'comma' ? CommaLogo : mode === 'konik' ? KonikLogo : AsiusLogo
  return <Icon {...props} />
}
