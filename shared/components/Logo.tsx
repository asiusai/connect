import { Provider } from '../provider'
import { AsiusLogo, CommaLogo, IconProps, KonikLogo } from '../icons'

export const Logo = ({ provider, ...props }: { provider: Provider } & IconProps) => {
  const Icon = provider === 'comma' ? CommaLogo : provider === 'konik' ? KonikLogo : AsiusLogo
  return <Icon {...props} />
}
