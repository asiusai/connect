import { useNavigate } from 'react-router-dom'
import { IconButton } from './IconButton'

export const BackButton = ({ fallback }: { fallback: string }) => {
  // TODO: avoid back button if it redirects to some other domain
  const hasBack = false
  const nav = useNavigate()
  return <IconButton title="Back" name="keyboard_arrow_left" onClick={() => (hasBack ? nav(-1) : nav(fallback))} />
}
