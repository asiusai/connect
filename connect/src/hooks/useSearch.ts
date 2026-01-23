import { create } from 'zustand'
import { ZustandType } from '../../../shared/helpers'

const init = { query: '', isSearchOpen: false }
export const useSearch = create<ZustandType<typeof init>>((set) => ({ ...init, set }))
