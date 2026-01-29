import { BackButton } from '../../components/BackButton'
import { TopAppBar } from '../../components/TopAppBar'
import { useSettings } from '../../hooks/useSettings'
import { useDevice } from '../../hooks/useDevice'
import { Setting, Settings } from './Settings'
import { SettingCategory, DeviceParam, DEVICE_PARAMS, DeviceParamKey, getParamType } from '../../utils/params'
import { useMemo } from 'react'
import { useRouteParams } from '../../hooks'
import { Models } from './Models'
import { cn } from '../../../../shared/helpers'
import { ChevronDownIcon } from 'lucide-react'

const CATEGORY_LABELS: Record<SettingCategory, string> = {
  models: 'Models',
  device: 'Device',
  toggles: 'Toggles',
  steering: 'Steering',
  cruise: 'Cruise',
  visuals: 'Visuals',
  developer: 'Developer',
  other: 'Other',
}

const SectionHeader = ({ label, isOpen, onClick, count }: { label: string; isOpen: boolean; onClick: () => void; count?: number }) => (
  <button onClick={onClick} className="flex items-center gap-3 w-full py-3">
    <ChevronDownIcon className={cn('transition-transform', isOpen ? 'text-primary' : '-rotate-90 opacity-40')} />
    <h2 className="text-lg font-semibold">{label}</h2>
    {count !== undefined && <span className="text-sm opacity-40">{count}</span>}
  </button>
)
export const Component = () => {
  const { dongleId } = useRouteParams()
  const { isError, get, saved } = useDevice()
  const { togglesOpenTab, set: setOpenSection } = useSettings()

  const settingsByCategory = useMemo(() => {
    if (!Object.keys(saved).length) return null
    const result: Record<SettingCategory, Setting[]> = {
      models: [],
      device: [],
      toggles: [],
      steering: [],
      cruise: [],
      visuals: [],
      developer: [],
      other: [],
    }

    const deviceParamEntries = Object.entries(DEVICE_PARAMS) as [DeviceParamKey, DeviceParam][]

    for (const cat of SettingCategory.options) {
      result[cat] = deviceParamEntries
        .filter(([_, def]) => !def.hidden && def.category === cat)
        .map(
          ([key, def]) =>
            ({
              ...def,
              key,
              value: get(key),
            }) satisfies Setting,
        )
        .filter((x) => x.value !== undefined)
    }

    const knownKeys = new Set(Object.keys(DEVICE_PARAMS))
    const leftOver = Object.keys(saved).filter((x) => !knownKeys.has(x))
    result.other = [
      ...result.other,
      ...leftOver.map(
        (key): Setting => ({
          key,
          label: key,
          type: getParamType(get(key as DeviceParamKey)),
          description: '',
          category: 'other',
          value: get(key as DeviceParamKey),
          icon: 'star',
        }),
      ),
    ]
    return result
  }, [saved, get])

  const toggleSection = (cat: SettingCategory) => setOpenSection({ togglesOpenTab: togglesOpenTab === cat ? null : cat })

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-foreground gap-4">
      <TopAppBar leading={<BackButton href={`/${dongleId}`} />} className="z-10 bg-transparent">
        <div className="flex items-center gap-3 w-full">
          <span>Toggles</span>
        </div>
      </TopAppBar>

      <div className="p-4 md:p-6 flex flex-col gap-2">
        {isError && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
            <span className="text-4xl opacity-40">:(</span>
            <span className="text-lg font-medium">Unable to load parameters</span>
            <span className="text-sm opacity-60">Device offline or incompatible fork</span>
          </div>
        )}
        {!settingsByCategory && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <span className="text-sm opacity-60">Connecting to device...</span>
          </div>
        )}
        {settingsByCategory && (
          <div className="flex flex-col divide-y divide-white/5">
            <div>
              <SectionHeader label={CATEGORY_LABELS.models} isOpen={togglesOpenTab === 'models'} onClick={() => toggleSection('models')} />
              {togglesOpenTab === 'models' && (
                <div className="pb-6">
                  <Models />
                </div>
              )}
            </div>

            {SettingCategory.options
              .filter((cat) => cat !== 'models')
              .map((cat) => {
                const settings = settingsByCategory[cat]
                if (!settings.length) return null
                const isOpen = togglesOpenTab === cat
                return (
                  <div key={cat}>
                    <SectionHeader label={CATEGORY_LABELS[cat]} isOpen={isOpen} onClick={() => toggleSection(cat)} count={settings.length} />
                    {isOpen && (
                      <div className="pb-6">
                        <Settings settings={settings} />
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
