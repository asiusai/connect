import { DrivingStatistics } from '../types'

export const getNavItems = (dongleId: string, stats?: DrivingStatistics) => [
  {
    title: 'Home',
    subtitle: `${stats?.all.routes || 0} drives`,
    icon: 'home',
    href: `/${dongleId}`,
    color: 'text-blue-400',
  },
  {
    title: 'Sentry',
    subtitle: 'View clips',
    icon: 'photo_camera',
    href: `/${dongleId}/sentry`,
    color: 'text-red-400',
  },
  {
    title: 'Actions',
    subtitle: 'Trigger controls',
    icon: 'infrared',
    color: 'text-zinc-500',
  },
  {
    title: 'Teleop',
    subtitle: 'Remote control',
    icon: 'gamepad',
    color: 'text-zinc-500',
  },
  {
    title: 'Settings',
    subtitle: 'Device config',
    icon: 'settings',
    href: `/${dongleId}/settings`,
    color: 'text-yellow-400',
  },
]

export const getActionItems = (dongleId: string) => [
  { name: 'power_settings_new', label: 'Shutdown' },
  { name: 'home', label: 'Home' },
  { name: 'work', label: 'Work' },
  { name: 'camera', label: 'Snapshot', href: `/${dongleId}/sentry?instant=1` },
]
