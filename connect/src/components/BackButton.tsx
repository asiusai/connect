import { Link } from 'react-router-dom'
import { IconButton } from './IconButton'
import { Logo } from '../../../shared/components/Logo'
import { isSignedIn } from '../utils/helpers'

export const BackButton = ({ href }: { href: string }) => {
  if (!isSignedIn())
    return (
      <Link to="/login" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <Logo className="w-8 h-8 rounded-full" />
      </Link>
    )
  return <IconButton title="Back" name="keyboard_arrow_left" href={href} />
}
