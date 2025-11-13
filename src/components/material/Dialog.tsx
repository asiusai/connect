import clsx from 'clsx'
import { ReactNode } from 'react'

export const Dialog = (props: { className?: string; open: boolean; onClose?: () => void; children?: ReactNode }) => {
  const handleDialogClose = () => {
    if (props.open) props.onClose?.()
  }

  return (
    <dialog
      className="fixed inset-0 max-w-[unset] z-50 bg-transparent backdrop:bg-scrim/[.32] size-full max-h-[unset]"
      onClose={handleDialogClose}
      open={props.open}
    >
      <div className="flex flex-col size-full items-center">
        <div
          className={clsx(
            'flex w-full flex-col justify-center gap-4 bg-surface-container text-on-surface p-6 m-auto',
            'sm:max-w-lg sm:rounded-lg sm:shadow-lg',
            props.className,
          )}
          onClick={(ev) => ev.stopPropagation()}
        >
          {props.children}
        </div>
      </div>
    </dialog>
  )
}
