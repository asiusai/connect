import clsx from 'clsx'

import { ButtonBase, type ButtonBaseProps } from './ButtonBase'
import { CircularProgress } from './CircularProgress'
import { Icon, IconName, IconProps } from './Icon'

type IconButtonProps = Omit<ButtonBaseProps, 'children'> & {
  name: IconName
  filled?: IconProps['filled']
  loading?: number | boolean
  title: string
}

export const IconButton = ({ className, filled, loading, ...props }: IconButtonProps) => {
  const isLoading = !!loading || loading === 0

  return (
    <ButtonBase className={clsx('inline-flex items-center justify-center rounded-full', className)} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? <CircularProgress loading={loading} /> : <Icon name={props.name} filled={filled} />}
    </ButtonBase>
  )
}
