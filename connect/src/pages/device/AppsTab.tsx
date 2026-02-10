import { useState } from 'react'
import { useDevice } from '../../hooks/useDevice'
import { skills, Skill } from '../../../../shared/skills'
import { cn } from '../../../../shared/helpers'
import { PlusIcon, PlayIcon, Loader2Icon, TrashIcon } from 'lucide-react'
import { Card, NotConnected, SectionLabel } from './ControlsTab'
import { api } from '../../api'
import { useRouteParams } from '../../hooks'

type InstalledSkill = Skill & { skill_id: string }

const SkillRow = ({
  skill,
  installed,
  onInstall,
  onRun,
  onRemove,
  loading,
}: {
  skill: Skill
  installed?: InstalledSkill
  onInstall: () => void
  onRun: () => void
  onRemove: () => void
  loading?: boolean
}) => (
  <div className="flex items-center gap-3 py-2.5 px-3">
    <div className="flex-1 min-w-0">
      <div className="text-[13px] font-medium">{skill.name}</div>
      <div className="text-xs text-white/35 mt-0.5">{skill.description}</div>
    </div>
    <div className="flex gap-2 shrink-0">
      {installed ? (
        <>
          <button
            onClick={onRun}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 transition-colors text-xs font-medium disabled:opacity-50"
          >
            {loading ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <PlayIcon className="w-3.5 h-3.5" />}
            Run
          </button>
          <button
            onClick={onRemove}
            disabled={loading}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-600/20 hover:bg-red-600/40 transition-colors disabled:opacity-50"
          >
            <TrashIcon className="w-3.5 h-3.5 text-red-400" />
          </button>
        </>
      ) : (
        <button
          onClick={onInstall}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs font-medium disabled:opacity-50"
        >
          {loading ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <PlusIcon className="w-3.5 h-3.5" />}
          Add
        </button>
      )}
    </div>
  </div>
)

const InstalledSkillRow = ({ skill, onRun, onRemove, loading }: { skill: InstalledSkill; onRun: () => void; onRemove: () => void; loading?: boolean }) => (
  <div className="flex items-center gap-3 py-2.5 px-3">
    <div className="flex-1 min-w-0">
      <div className="text-[13px] font-medium">{skill.name}</div>
      <div className="text-xs text-white/35 mt-0.5">{skill.description}</div>
    </div>
    <div className="flex gap-2 shrink-0">
      <button
        onClick={onRun}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 transition-colors text-xs font-medium disabled:opacity-50"
      >
        {loading ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <PlayIcon className="w-3.5 h-3.5" />}
        Run
      </button>
      <button
        onClick={onRemove}
        disabled={loading}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-600/20 hover:bg-red-600/40 transition-colors disabled:opacity-50"
      >
        <TrashIcon className="w-3.5 h-3.5 text-red-400" />
      </button>
    </div>
  </div>
)

export const AppsTab = ({ className }: { className?: string }) => {
  const { dongleId } = useRouteParams()
  const { call, params } = useDevice()
  const [loading, setLoading] = useState<string | null>(null)
  const [routes] = api.routes.routesSegments.useQuery({ params: { dongleId }, query: { limit: 1 } })
  const platform = routes?.[0]?.platform

  if (!call || !params) return <NotConnected className={className} />

  const availableSkills = platform ? skills.filter((s) => s.platforms.includes(platform)) : skills

  const installedSkills = (params.Skills ?? {}) as Record<string, Omit<InstalledSkill, 'skill_id'>>
  const installedList = Object.entries(installedSkills).map(([skill_id, skill]) => ({ ...skill, skill_id }))

  const isInstalled = (skill: Skill) => installedList.find((s) => s.name === skill.name && s.msg_id === skill.msg_id && s.data === skill.data)

  const handleInstall = async (skill: Skill) => {
    setLoading(skill.name)
    await call('addSkill', skill)
    const updated = await call('getSkills', undefined)
    if (updated) params.Skills = updated
    setLoading(null)
  }

  const handleRun = async (skillId: string) => {
    setLoading(skillId)
    await call('runSkill', { skill_id: skillId })
    setLoading(null)
  }

  const handleRemove = async (skillId: string) => {
    setLoading(skillId)
    await call('removeSkill', { skill_id: skillId })
    const updated = await call('getSkills', undefined)
    if (updated) params.Skills = updated
    setLoading(null)
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {installedList.length > 0 && (
        <>
          <SectionLabel>Installed</SectionLabel>
          <Card>
            {installedList.map((skill) => (
              <InstalledSkillRow
                key={skill.skill_id}
                skill={skill as InstalledSkill}
                onRun={() => handleRun(skill.skill_id)}
                onRemove={() => handleRemove(skill.skill_id)}
                loading={loading === skill.skill_id}
              />
            ))}
          </Card>
        </>
      )}

      <SectionLabel>Available Skills</SectionLabel>
      <Card>
        {availableSkills.map((skill) => {
          const installed = isInstalled(skill)
          return (
            <SkillRow
              key={skill.name}
              skill={skill}
              installed={installed as InstalledSkill | undefined}
              onInstall={() => handleInstall(skill)}
              onRun={() => installed && handleRun(installed.skill_id)}
              onRemove={() => installed && handleRemove(installed.skill_id)}
              loading={loading === skill.name || (installed && loading === installed.skill_id)}
            />
          )
        })}
      </Card>
    </div>
  )
}
