import clsx from 'clsx'
import { ReactNode } from 'react'

type DialogProps = {
  className?: string
  open: boolean
  onClose?: () => void
  children?: ReactNode
}

export const Dialog = (props: DialogProps) => {
  let dialogRef: HTMLDialogElement | undefined

  createEffect(() => {
    if (!dialogRef) return
    if (props.open) {
      dialogRef.showModal()
    } else if (dialogRef.open) {
      dialogRef.close()
    }
  })

  const handleDialogClose = () => {
    if (props.open) props.onClose?.()
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 max-w-[unset] z-50 bg-transparent backdrop:bg-scrim/[.32] size-full max-h-[unset]"
      onClick={() => dialogRef?.close()}
      onClose={handleDialogClose}
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
