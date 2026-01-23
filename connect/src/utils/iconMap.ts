import {
  HomeIcon,
  BriefcaseIcon,
  MapPinIcon,
  StarIcon,
  CheckIcon,
  XIcon,
  NavigationIcon,
  Trash2Icon,
  PlusIcon,
  VideoIcon,
  CameraIcon,
  SettingsIcon,
  TerminalIcon,
  BarChart3Icon,
  ToggleLeftIcon,
  LucideIcon,
} from 'lucide-react'

export const ICON_MAP: Record<string, LucideIcon> = {
  home: HomeIcon,
  work: BriefcaseIcon,
  location_on: MapPinIcon,
  star: StarIcon,
  check: CheckIcon,
  close_small: XIcon,
  navigation: NavigationIcon,
  delete: Trash2Icon,
  add: PlusIcon,
  videocam: VideoIcon,
  camera: CameraIcon,
  settings: SettingsIcon,
  terminal: TerminalIcon,
  bar_chart: BarChart3Icon,
  switches: ToggleLeftIcon,
}

export const getIcon = (name: string): LucideIcon => ICON_MAP[name] ?? StarIcon
