import { ReactNode } from 'react'

export const Label = ({ children }: { children: ReactNode }) => {
  return <label className="flex flex-col text-sm gap-1">{children}</label>
}
