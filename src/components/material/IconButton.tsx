import clsx from 'clsx'

import { ButtonBase, type ButtonBaseProps } from './ButtonBase'
import { CircularProgress } from './CircularProgress'
import { Icon, IconName, IconProps } from './Icon'

type IconButtonProps = Omit<ButtonBaseProps, 'children'> & {
  name: IconName
  filled?: IconProps['filled']
  size?: IconProps['size']
  loading?: number | boolean
}

export const IconButton = ({ className, filled, size = '24', loading, ...props }: IconButtonProps) => {
  const buttonSize = {
    '20': 'w-[28px] h-[28px] min-w-[28px] min-h-[28px]',
    '24': 'w-[32px] h-[32px] min-w-[32px] min-h-[32px]',
    '40': 'w-[48px] h-[48px] min-w-[48px] min-h-[48px]',
    '48': 'w-[56px] h-[56px] min-w-[56px] min-h-[56px]',
  }[size]

  const isLoading = !!loading || loading === 0

  return (
    <ButtonBase
      className={clsx(
        'state-layer inline-flex items-center justify-center rounded-full before:rounded-full before:bg-background-x',
        buttonSize,
        className,
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <CircularProgress size={size} loading={loading} /> : <Icon name={props.name} filled={filled} size={size} />}
    </ButtonBase>
  )
}
