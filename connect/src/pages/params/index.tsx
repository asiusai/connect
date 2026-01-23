import { BackButton } from '../../components/BackButton'
import { TopAppBar } from '../../components/TopAppBar'
import { useStorage } from '../../utils/storage'
import { useDevice } from '../device/useDevice'
import { Setting, Settings } from './Settings'
import { SettingCategory, DeviceParam, DEVICE_PARAMS, DeviceParamKey } from '../../utils/params'
import { Button } from '../../components/Button'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { useRouteParams } from '../../utils/hooks'
import { Navigation } from './Navigation'
import { Models } from './Models'
import { cn } from '../../../../shared/helpers'
import { ChevronDownIcon } from 'lucide-react'

const CATEGORY_LABELS: Record<SettingCategory, string> = {
  models: 'Models',
  navigation: 'Navigation',
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
  const { isError, save, isSaving, get, types, set, changes } = useDevice()
  const [openSection, setOpenSection] = useStorage('togglesOpenTab')

  const settingsByCategory = useMemo(() => {
    if (!Object.keys(types).length) return null
    const result: Record<SettingCategory, Setting[]> = {
      models: [],
      navigation: [],
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
              type: types[key],
            }) satisfies Setting,
        )
        .filter((x) => x.value !== undefined)
    }

    const knownKeys = new Set(Object.keys(DEVICE_PARAMS))
    const leftOver = Object.keys(types).filter((x) => !knownKeys.has(x))
    result.other = [
      ...result.other,
      ...leftOver.map(
        (key): Setting => ({
          key,
          label: key,
          description: '',
          category: 'other',
          value: get(key as DeviceParamKey),
          type: types[key as DeviceParamKey],
          icon: 'star',
        }),
      ),
    ]
    return result
  }, [types, get])

  const changeCount = Object.keys(changes).length

  const handleSave = async () => {
    if (!changeCount) return
    const result = await save(changes)
    if (result?.error) toast.error(result.error.data?.message ?? result.error.message)
    else toast.success(`Saved ${changeCount} parameter(s)`)
  }

  const toggleSection = (cat: SettingCategory) => setOpenSection(openSection === cat ? null : cat)

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-foreground gap-4">
      <TopAppBar leading={<BackButton href={`/${dongleId}`} />} className="z-10 bg-transparent">
        <div className="flex items-center gap-3 w-full">
          <span>Toggles</span>
          {changeCount > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => set({ changes: {} })} className="text-xs opacity-50 hover:opacity-100" title="Discard changes">
                {changeCount} unsaved
              </button>
              <Button onClick={handleSave} disabled={isSaving} className="text-sm px-3 py-1.5">
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
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
              <SectionHeader label={CATEGORY_LABELS.models} isOpen={openSection === 'models'} onClick={() => toggleSection('models')} />
              {openSection === 'models' && (
                <div className="pb-6">
                  <Models />
                </div>
              )}
            </div>

            <div>
              <SectionHeader label={CATEGORY_LABELS.navigation} isOpen={openSection === 'navigation'} onClick={() => toggleSection('navigation')} />
              {openSection === 'navigation' && (
                <div className="pb-6">
                  <Navigation settings={settingsByCategory.navigation} />
                </div>
              )}
            </div>

            {SettingCategory.options
              .filter((cat) => cat !== 'models' && cat !== 'navigation')
              .map((cat) => {
                const settings = settingsByCategory[cat]
                if (!settings.length) return null
                const isOpen = openSection === cat
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
