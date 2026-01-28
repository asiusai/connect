import { Link } from 'react-router-dom'
import { IconButton } from './IconButton'
import { Logo } from '../../../shared/components/Logo'
import { isSignedIn } from '../utils/helpers'
import { ChevronLeftIcon } from 'lucide-react'
import { useProvider } from '../utils/useProvider'

export const BackButton = ({ href }: { href: string }) => {
  const [provider] = useProvider()
  if (!isSignedIn())
    return (
      <Link to="/login" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <Logo provider={provider.name} className="w-8 h-8 rounded-full" />
      </Link>
    )
  return <IconButton title="Back" icon={ChevronLeftIcon} href={href} />
}
