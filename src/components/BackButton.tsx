import { Link, useNavigate } from 'react-router-dom'
import { IconButton } from './IconButton'
import { isSignedIn } from '../utils/helpers'

export const BackButton = ({ fallback }: { fallback: string }) => {
  // TODO: avoid back button if it redirects to some other domain
  const hasBack = false
  const nav = useNavigate()
  if (!isSignedIn())
    return (
      <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <img src="/images/comma-white.svg" alt="connect" className="w-8 h-8 rounded-full" />
      </Link>
    )
  return <IconButton title="Back" name="keyboard_arrow_left" onClick={() => (hasBack ? nav(-1) : nav(fallback))} />
}
