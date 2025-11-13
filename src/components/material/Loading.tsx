import clsx from 'clsx'

export const Loading = ({ className }: { className?: string }) => {
  return <div className={clsx('skeleton-loader', className)}></div>
}
