import clsx from 'clsx'

// Specify icon names to load only the necessary icons, reducing font payload.
// https://developers.google.com/fonts/docs/material_symbols#optimize_the_icon_font
export const Icons = [
  'add',
  'arrow_back',
  'camera',
  'check',
  'chevron_right',
  'clear',
  'close',
  'delete',
  'description',
  'directions_car',
  'download',
  'error',
  'file_copy',
  'flag',
  'info',
  'keyboard_arrow_down',
  'keyboard_arrow_up',
  'keyboard_arrow_left',
  'keyboard_arrow_right',
  'local_fire_department',
  'logout',
  'menu',
  'my_location',
  'open_in_new',
  'payments',
  'person',
  'progress_activity',
  'satellite_alt',
  'search',
  'settings',
  'upload',
  'videocam',
  'refresh',
  'login',
  'person_off',
  'autorenew',
  'close_small',
  'pause',
  'play_arrow',
  'clear_all',
  'photo_camera',
  'robot_2',
  'bar_chart',
  'home',
  'work',
  'power_settings_new',
  'battery_5_bar',
  'infrared',
  'gamepad',
  'bookmark',
  'bookmark_check',
  'public',
  'public_off',
  'location_on',
  'raw_on',
  'movie',
  'file_json',
  'volume_up',
  'volume_off',
  'fullscreen',
  'fullscreen_exit',
  'share',
  'lock',
  'heat',
  'link',
  'content_cut',
] as const

export type IconName = (typeof Icons)[number]

export type IconProps = {
  className?: string
  name: IconName
  filled?: boolean
  onClick?: () => void
}

/**
 * Use an icon from the Material Symbols library.
 *
 * Note: Icon names <strong>must</strong> be added to the icons list in vite.config.ts.
 *
 * @see https://fonts.google.com/icons
 */
export const Icon = (props: IconProps) => {
  // size-20, 24 etc. defined in root.css
  return (
    <span
      className={clsx(
        'material-symbols-outlined flex',
        props.filled ? 'icon-filled' : 'icon-outline',

        props.className,
      )}
    >
      {props.name}
    </span>
  )
}
