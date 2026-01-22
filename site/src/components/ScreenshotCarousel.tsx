import { useState, type ReactNode } from 'react'

const DesktopIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
)

const MobileIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
)

const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </svg>
)

const SCREENSHOTS = ['home', 'route-clip', 'settings', 'route-qlogs', 'login'] as const
const MODES = ['desktop', 'mobile'] as const

export const ScreenshotCarousel = ({ children }: { children?: ReactNode }) => {
  const [mode, setMode] = useState<(typeof MODES)[number]>('desktop')
  const [index, setIndex] = useState(0)

  const canPrev = index > 0
  const canNext = index < SCREENSHOTS.length - 1

  const prev = () => canPrev && setIndex((i) => i - 1)
  const next = () => canNext && setIndex((i) => i + 1)

  const src = `/screenshots/comma/${mode}/${SCREENSHOTS[index]}.png`

  return (
    <div className="flex flex-col md:flex-row gap-4 justify-between">
      <div className="md:w-[50%]">{children}</div>
      <div className="not-prose flex flex-col md:max-w-[50%] mt-auto">
        <div className="relative group">
          <img
            src={src}
            alt={`Asius Connect ${SCREENSHOTS[index]}`}
            className={`border border-background-alt rounded-lg shadow-lg shadow-background-alt object-cover object-top ${
              mode === 'desktop' ? 'w-full aspect-video' : 'aspect-9/16 max-h-100 mx-auto'
            }`}
          />
          <div className="justify-center gap-1 absolute top-1 left-[50%] -translate-x-1/2 flex opacity-100 md:opacity-0 duration-150 md:group-hover:opacity-100">
            <button
              onClick={() => setMode('desktop')}
              className={`p-2 rounded ${mode === 'desktop' ? 'bg-primary text-primary-x' : 'bg-background-alt text-background-alt-x hover:text-white'}`}
              title="Desktop"
            >
              <DesktopIcon />
            </button>
            <button
              onClick={() => setMode('mobile')}
              className={`p-2 rounded ${mode === 'mobile' ? 'bg-primary text-primary-x' : 'bg-background-alt text-background-alt-x hover:text-white'}`}
              title="Mobile"
            >
              <MobileIcon />
            </button>
          </div>
          <button
            onClick={prev}
            disabled={!canPrev}
            className={`absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-white rounded-full w-8 h-8 flex items-center justify-center transition-opacity ${
              canPrev ? 'opacity-100 md:opacity-0 md:group-hover:opacity-100' : 'opacity-0 cursor-not-allowed'
            }`}
          >
            <ChevronLeftIcon />
          </button>
          <button
            onClick={next}
            disabled={!canNext}
            className={`absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-white rounded-full w-8 h-8 flex items-center justify-center transition-opacity ${
              canNext ? 'opacity-100 md:opacity-0 md:group-hover:opacity-100' : 'opacity-0 cursor-not-allowed'
            }`}
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
