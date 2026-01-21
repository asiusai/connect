import { CSSProperties } from 'react'
import { Mode, provider } from '../provider'

export const Logo = ({ className, style, mode = provider.MODE }: { mode?: Mode; className?: string; style?: CSSProperties }) => {
  if (mode === 'comma')
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="45 27 41 74" fill="currentColor" className={className} style={style}>
        <path
          fillRule="evenodd"
          d="M49.012 99.5c0-1.654-.13-3.04.061-4.376.081-.57.749-1.18 1.293-1.524 2.652-1.677 5.534-3.017 8.004-4.941 8-6.233 12.741-14.437 13-25.095.074-3.027-1.043-3.783-3.593-2.604-7.363 3.404-15.28 1.408-19.506-4.917-4.608-6.898-3.96-16.082 1.562-22.108 7.052-7.697 18.657-7.927 26.659-.577 4.793 4.404 7.07 10.089 7.639 16.555 1.904 21.665-9 39.521-28.846 47.365-1.964.776-3.978 1.414-6.273 2.222"
          clipRule="evenodd"
        />
      </svg>
    )
  if (mode === 'konik')
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 69 110" fill="currentColor" className={className} style={style}>
        <g transform="translate(0,110) scale(0.1,-0.1)">
          <path d="M320 1089 c-115 -23 -223 -107 -276 -214 -27 -56 -29 -67 -28 -170 1 -119 20 -193 70 -268 41 -62 44 -34 6 65 -42 112 -48 216 -17 308 43 133 126 195 296 224 68 11 74 14 74 37 0 21 -5 24 -40 26 -22 1 -60 -3 -85 -8z" />
          <path d="M365 999 c-120 -20 -204 -79 -246 -172 -20 -43 -24 -69 -24 -147 0 -89 3 -101 43 -200 60 -147 57 -195 -18 -265 -41 -38 -60 -82 -60 -139 0 -77 -5 -76 299 -76 194 0 270 3 279 12 7 7 12 39 12 75 0 60 -2 64 -45 113 -53 60 -60 80 -45 144 22 98 -15 180 -126 280 -46 42 -74 75 -74 88 0 19 4 20 68 16 44 -3 89 -14 126 -31 l56 -26 35 47 c19 26 34 55 32 64 -3 22 -228 228 -247 227 -8 -1 -37 -5 -65 -10z" />
        </g>
      </svg>
    )
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 151 136" fill="currentColor" className={className} style={style}>
      <path d="M74.881 0L91.2064 29.2778L47.4921 104.833H88.5079L69.3492 136L0 135.73L74.881 0Z" />
      <path d="M77.5791 63.0079L93.095 32.7857L150.166 136H118.73L77.5791 63.0079Z" />
    </svg>
  )
}
