import { Link } from 'react-router-dom'
import { IconButton } from './IconButton'
import { Logo } from '../../../shared/components/Logo'
import { ChevronLeftIcon } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export const BackButton = ({ href }: { href: string }) => {
  const { provider, token } = useAuth()
  if (!token)
    return (
      <Link to="/login" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <Logo provider={provider} className="w-8 h-8 rounded-full" />
      </Link>
    )
  return <IconButton title="Back" icon={ChevronLeftIcon} href={href} />
}
