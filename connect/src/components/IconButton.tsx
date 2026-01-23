import { LucideIcon } from 'lucide-react'
import { ButtonBase, type ButtonBaseProps } from './ButtonBase'
import { CircularProgress } from './CircularProgress'
import { cn } from '../../../shared/helpers'

type IconButtonProps = Omit<ButtonBaseProps, 'children'> & {
  icon: LucideIcon
  loading?: number | boolean
  title: string
}

export const IconButton = ({ className, icon: Icon, loading, ...props }: IconButtonProps) => {
  const isLoading = !!loading || loading === 0

  return (
    <ButtonBase className={cn('inline-flex items-center justify-center cursor-pointer', className)} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? <CircularProgress loading={loading} /> : <Icon />}
    </ButtonBase>
  )
}
