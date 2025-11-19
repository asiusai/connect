import clsx from 'clsx'

import { ButtonBase, type ButtonBaseProps } from './ButtonBase'
import { Icon, IconName, IconProps } from './Icon'

type IconButtonProps = ButtonBaseProps & {
  name: IconName
  filled?: IconProps['filled']
  size?: IconProps['size']
  loading?: number | boolean
}

export const IconButton = ({ className, children, filled, size = '24', ...props }: IconButtonProps) => {
  const buttonSize = {
    '20': 'w-[28px] h-[28px] min-w-[28px] min-h-[28px]',
    '24': 'w-[32px] h-[32px] min-w-[32px] min-h-[32px]',
    '40': 'w-[48px] h-[48px] min-w-[48px] min-h-[48px]',
    '48': 'w-[56px] h-[56px] min-w-[56px] min-h-[56px]',
  }[size]
  return (
    <ButtonBase
      className={clsx(
        'state-layer inline-flex items-center justify-center rounded-full p-2 before:rounded-full before:bg-on-surface',
        buttonSize,
        className,
      )}
      {...props}
    >
      <Icon name={props.name} filled={filled} size={size} />
    </ButtonBase>
  )
}
